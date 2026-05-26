// ============================================================
// ArxMint — Creator Payout Forward API
// POST /api/creator-payout — forward a creator's share of a Teneo sale to
// their Lightning destination (BOLT12 offer or Lightning Address).
//
// Server-to-server only: Teneo's `payout-forwarder` Lambda calls this with the
// X-Marketplace-Secret header. Core logic + state machine live in
// lib/creator-payout.ts; this route only wires the real Supabase idempotency
// store and the lnbits/Phoenixd forwarders into it.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  forwardCreatorPayout,
  type PayoutForwardRequest,
  type PayoutForwardStore,
  type PayoutForwarders,
  type ForwardStatus,
  type StoredForward,
} from "@/lib/creator-payout";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Supabase-backed idempotency store for the `payout_forwards` table. */
const supabaseStore: PayoutForwardStore = {
  async get(payoutId: string): Promise<StoredForward | null> {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("payout_forwards")
      .select("status, forward_id")
      .eq("payout_id", payoutId)
      .maybeSingle();
    return data ? { status: data.status, forward_id: data.forward_id ?? null } : null;
  },

  async insertProcessing(req: PayoutForwardRequest): Promise<boolean> {
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.from("payout_forwards").insert({
      payout_id: req.payoutId,
      merchant_id: req.merchant,
      amount_sats: req.amountSats,
      destination_type: req.destination.type,
      // Privacy: store only a prefix so the full offer/address never lands in the DB.
      destination_prefix: req.destination.value.slice(0, 32),
      status: "processing",
    });
    if (error) {
      // 23505 = unique_violation: a concurrent caller already claimed this payoutId.
      if (error.code === "23505") return false;
      throw new Error(`payout_forwards insert failed: ${error.message}`);
    }
    return true;
  },

  async reclaimProcessing(payoutId: string): Promise<boolean> {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("payout_forwards")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("payout_id", payoutId)
      .in("status", ["pending", "failed"])
      .select("payout_id");
    if (error) throw new Error(`payout_forwards reclaim failed: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  },

  async finalize(payoutId, status: ForwardStatus, extra): Promise<void> {
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase
      .from("payout_forwards")
      .update({
        status,
        forward_id: extra.forwardId ?? null,
        error: extra.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("payout_id", payoutId);
    if (error) {
      // Non-fatal: the forward itself already happened/failed. Log and return the
      // correct outcome to the caller rather than masking it with a 500.
      logger.warn("payout_forwards_finalize_failed", { payoutId, status, error: error.message });
    }
  },
};

/** Lightning forwarders: Phoenixd (bolt12) + LNbits global wallet (lnaddress). */
const lnbitsForwarders: PayoutForwarders = {
  async bolt12({ amountSats, offer, memo }) {
    const { forwardPaymentToBolt12Offer } = await import("@/lib/lnbits");
    return forwardPaymentToBolt12Offer({ amountSats, offer, memo });
  },

  async lnaddress({ amountSats, lightningAddress, memo }) {
    // Fund lnaddress payouts from ArxMint's global LNbits wallet (same Phoenix-backed
    // liquidity pool). seed-teneo pays out via a BOLT12 offer and has no per-merchant
    // admin key, so a per-merchant key lookup would always miss — the global key is the
    // real funding source. Absent the key, report unsupported → caller treats as pending.
    const walletAdminKey = process.env.LNBITS_ADMIN_KEY;
    if (!walletAdminKey) {
      return { success: false, unsupported: true, error: "LNBITS_ADMIN_KEY not configured" };
    }
    const { forwardPaymentToMerchant } = await import("@/lib/lnbits");
    return forwardPaymentToMerchant({ amountSats, lightningAddress, walletAdminKey, memo });
  },
};

export async function POST(request: NextRequest) {
  // Rate limit per IP — server-to-server, low volume.
  const ip = clientIp(request);
  const rl = checkRateLimit(`creator-payout:${ip}`, RATE_LIMITS.paymentWrite);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  // Auth: server-to-server only. getCallerFromRequest returns "marketplace-system"
  // when X-Marketplace-Secret matches MARKETPLACE_SHARED_SECRET.
  const caller = getCallerFromRequest(request);
  if (caller !== "marketplace-system") {
    return apiError(401, "UNAUTHORIZED", "Creator payout requires the marketplace service secret");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON body — treat as a bad request.
    return apiError(400, "BAD_REQUEST", "Request body must be valid JSON");
  }

  try {
    const result = await forwardCreatorPayout(body, supabaseStore, lnbitsForwarders);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    logger.warn("creator_payout_unhandled", { error: message });
    return apiError(500, "INTERNAL_ERROR", message);
  }
}
