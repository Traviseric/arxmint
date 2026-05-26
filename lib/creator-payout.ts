// ============================================================
// ArxMint — Creator Payout Forward (core logic)
//
// Receiver for Teneo's payout-forwarder: forwards a creator's share of a Teneo
// book sale to THEIR Lightning destination (BOLT12 offer or Lightning Address),
// rather than the single hardcoded seed-teneo wallet.
//
// This is a THIRD, distinct payout concern, separate from:
//   - lib/payouts.ts          (merchant-scheduled payouts: daily/weekly/threshold)
//   - app/api/settlement       (referral-fee ecash/fedimint settlement)
//
// The money math + royalty split live in Teneo (the system that owns the
// sale → creator → ledger). ArxMint only executes the forward of an
// already-computed sats amount to a destination that travels in the request.
// No USD↔sat conversion here; no per-creator sub-merchant model.
//
// Idempotent on the Teneo ledger id (payoutId): Phoenixd /payoffer is NOT
// idempotent and the caller retries, so a lost HTTP response must never
// double-pay. The store claims a row (status='processing') before forwarding.
//
// Inert until configured: if the Lightning backend env is missing, the
// forwarder returns `unsupported` and we report `pending` (retry-later), so
// nothing moves money by accident.
//
// Pure orchestration over injected seams (store + forwarders) so it unit-tests
// without a live DB or Lightning backend — the route wires the real ones in.
// ============================================================

import { logger } from "@/lib/logger";

export type PayoutDestinationType = "bolt12" | "lnaddress";
export type ForwardStatus = "forwarded" | "pending" | "failed";

export interface PayoutForwardRequest {
  payoutId: string;
  merchant: string;
  amountSats: number;
  destination: { type: PayoutDestinationType; value: string };
  reference?: { orderId?: string; brandId?: string; listingId?: string };
}

export interface StoredForward {
  status: string; // 'processing' | 'forwarded' | 'pending' | 'failed'
  forward_id: string | null;
}

/** Persistence seam (idempotency). Real impl = Supabase `payout_forwards`. */
export interface PayoutForwardStore {
  get(payoutId: string): Promise<StoredForward | null>;
  /** Insert a fresh 'processing' row. Returns false on PK conflict (lost race). */
  insertProcessing(req: PayoutForwardRequest): Promise<boolean>;
  /** Transition pending|failed -> processing. Returns false if no row matched (lost race). */
  reclaimProcessing(payoutId: string): Promise<boolean>;
  finalize(
    payoutId: string,
    status: ForwardStatus,
    extra: { forwardId?: string | null; error?: string | null }
  ): Promise<void>;
}

export interface ForwardOutcome {
  success: boolean;
  unsupported?: boolean;
  error?: string;
}

/** Forwarding seam. Real impl wraps lib/lnbits forward fns. */
export interface PayoutForwarders {
  bolt12(params: { amountSats: number; offer: string; memo?: string }): Promise<ForwardOutcome>;
  lnaddress(params: { amountSats: number; lightningAddress: string; memo?: string }): Promise<ForwardOutcome>;
}

export interface PayoutForwardResponse {
  status: number; // HTTP status
  body: {
    success: boolean;
    status: ForwardStatus;
    forwardId?: string;
    idempotent?: boolean;
    error?: string;
  };
}

const DESTINATION_TYPES: readonly PayoutDestinationType[] = ["bolt12", "lnaddress"];

export interface ValidationOk {
  ok: true;
  req: PayoutForwardRequest;
}
export interface ValidationErr {
  ok: false;
  error: string;
}

export function validatePayoutRequest(raw: unknown): ValidationOk | ValidationErr {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }
  const b = raw as Record<string, unknown>;

  const payoutId = typeof b.payoutId === "string" ? b.payoutId.trim() : "";
  if (!payoutId) return { ok: false, error: "payoutId is required" };

  const merchant = typeof b.merchant === "string" ? b.merchant.trim() : "";
  if (!merchant) return { ok: false, error: "merchant is required" };

  const amountSats = Math.floor(Number(b.amountSats));
  if (!Number.isFinite(amountSats) || amountSats < 1) {
    return { ok: false, error: "amountSats must be a positive integer (sats)" };
  }

  const dest = b.destination;
  if (!dest || typeof dest !== "object") {
    return { ok: false, error: "destination { type, value } is required" };
  }
  const d = dest as Record<string, unknown>;
  const type = typeof d.type === "string" ? d.type : "";
  if (!DESTINATION_TYPES.includes(type as PayoutDestinationType)) {
    // 'fiat' is not a Lightning rail — Stripe Connect handles fiat creator payout, Teneo-side.
    return { ok: false, error: `destination.type must be one of: ${DESTINATION_TYPES.join(", ")}` };
  }
  const value = typeof d.value === "string" ? d.value.trim() : "";
  if (!value) return { ok: false, error: "destination.value is required" };

  const reference =
    b.reference && typeof b.reference === "object"
      ? (b.reference as PayoutForwardRequest["reference"])
      : undefined;

  return {
    ok: true,
    req: {
      payoutId,
      merchant,
      amountSats,
      destination: { type: type as PayoutDestinationType, value },
      reference,
    },
  };
}

function buildMemo(req: PayoutForwardRequest): string {
  const orderId = req.reference?.orderId;
  const base = orderId
    ? `Teneo payout ${req.payoutId} (order ${orderId})`
    : `Teneo payout ${req.payoutId}`;
  return base.slice(0, 200);
}

async function doForward(
  req: PayoutForwardRequest,
  forwarders: PayoutForwarders
): Promise<ForwardOutcome> {
  const memo = buildMemo(req);
  if (req.destination.type === "bolt12") {
    return forwarders.bolt12({ amountSats: req.amountSats, offer: req.destination.value, memo });
  }
  return forwarders.lnaddress({
    amountSats: req.amountSats,
    lightningAddress: req.destination.value,
    memo,
  });
}

/**
 * Forward a creator payout.
 *
 * State machine (payout_forwards.status):
 *   forwarded  → done; replay short-circuits (idempotent)
 *   processing → in-flight now; concurrent call short-circuits to pending
 *   pending    → rail not ready / lost race; safe to retry (re-claim)
 *   failed     → forward attempt failed; retry allowed (re-claim)
 *
 * Only `forwarded` and `processing` short-circuit; `pending`/`failed` re-claim
 * and re-attempt. The caller (Teneo payout-forwarder) treats `forwarded` as
 * done, `pending` as retry-later, and a 502/`failed` as a retryable failure.
 */
export async function forwardCreatorPayout(
  raw: unknown,
  store: PayoutForwardStore,
  forwarders: PayoutForwarders
): Promise<PayoutForwardResponse> {
  const v = validatePayoutRequest(raw);
  if (!v.ok) {
    return { status: 400, body: { success: false, status: "failed", error: v.error } };
  }
  const req = v.req;

  // ---- idempotency claim ----
  const existing = await store.get(req.payoutId);
  if (existing) {
    if (existing.status === "forwarded") {
      return {
        status: 200,
        body: {
          success: true,
          status: "forwarded",
          forwardId: existing.forward_id ?? req.payoutId,
          idempotent: true,
        },
      };
    }
    if (existing.status === "processing") {
      // Another call is forwarding this payout right now — don't double-send.
      return { status: 200, body: { success: false, status: "pending", idempotent: true } };
    }
    // pending | failed → re-claim for another attempt
    const reclaimed = await store.reclaimProcessing(req.payoutId);
    if (!reclaimed) {
      // Lost the re-claim race to a concurrent caller.
      return { status: 200, body: { success: false, status: "pending", idempotent: true } };
    }
  } else {
    const claimed = await store.insertProcessing(req);
    if (!claimed) {
      // Lost the insert race to a concurrent caller.
      return { status: 200, body: { success: false, status: "pending", idempotent: true } };
    }
  }

  // ---- forward ----
  let result: ForwardOutcome;
  try {
    result = await doForward(req, forwarders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("creator_payout_forward_threw", { payoutId: req.payoutId, error: message });
    await store.finalize(req.payoutId, "failed", { error: message });
    return { status: 502, body: { success: false, status: "failed", error: message } };
  }

  // ---- finalize ----
  if (result.success) {
    await store.finalize(req.payoutId, "forwarded", { forwardId: req.payoutId });
    logger.info("creator_payout_forwarded", {
      payoutId: req.payoutId,
      merchant: req.merchant,
      amountSats: req.amountSats,
      destinationType: req.destination.type,
    });
    return { status: 200, body: { success: true, status: "forwarded", forwardId: req.payoutId } };
  }

  if (result.unsupported) {
    // Lightning backend not configured — stay pending (inert); caller retries later.
    await store.finalize(req.payoutId, "pending", {
      error: result.error ?? "lightning backend not configured",
    });
    return { status: 200, body: { success: false, status: "pending", error: result.error } };
  }

  // Real forward failure — caller retries (max attempts, then gives up).
  await store.finalize(req.payoutId, "failed", { error: result.error ?? "forward failed" });
  return { status: 502, body: { success: false, status: "failed", error: result.error } };
}
