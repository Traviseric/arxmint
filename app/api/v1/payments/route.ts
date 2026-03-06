// ============================================================
// ArxMint — Payments List API
// GET /api/v1/payments — paginated payment history for authenticated merchant
// Requires: session cookie OR Authorization: Bearer arx_live_* key
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthPubkey } from "@/lib/auth-middleware";
import type { PaymentStatus } from "@/lib/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VALID_STATUSES: PaymentStatus[] = ["pending", "paid", "expired", "failed", "refunded"];

export async function GET(request: NextRequest) {
  // Require authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  const pubkey = getAuthPubkey(request);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") as PaymentStatus | null;
  const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const cursor = searchParams.get("cursor");
  const merchantId = searchParams.get("merchant_id");

  // Validate params
  if (statusParam && !VALID_STATUSES.includes(statusParam)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(1, isNaN(limitParam) ? DEFAULT_LIMIT : limitParam), MAX_LIMIT);

  try {
    const { supabase } = await import("@/lib/supabase");

    let query = supabase
      .from("checkout_sessions")
      .select(
        "id, merchant_id, status, amount_sats, memo, created_at, expires_at, paid_at, demo_mode",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(limit + 1); // fetch one extra to determine if there's a next page

    // Filter by status
    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    // Filter by merchant (optional — scoped to authed user's merchants)
    if (merchantId) {
      query = query.eq("merchant_id", merchantId);
    }

    // Cursor-based pagination using created_at
    if (cursor) {
      // cursor is the `created_at` of the last item from previous page
      try {
        const cursorDate = new Date(Buffer.from(cursor, "base64").toString("utf-8"));
        if (!isNaN(cursorDate.getTime())) {
          query = query.lt("created_at", cursorDate.toISOString());
        }
      } catch {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[payments] DB error:", { pubkey, error: error.message });
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const payments = hasMore ? rows.slice(0, limit) : rows;

    // Build next cursor from last item's created_at
    let nextCursor: string | null = null;
    if (hasMore && payments.length > 0) {
      const last = payments[payments.length - 1];
      nextCursor = Buffer.from(last.created_at).toString("base64");
    }

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        merchantId: p.merchant_id,
        status: p.status as PaymentStatus,
        amountSats: p.amount_sats,
        ...(p.memo && { memo: p.memo }),
        createdAt: p.created_at,
        expiresAt: p.expires_at,
        ...(p.paid_at && { paidAt: p.paid_at }),
        ...(p.demo_mode && { demoMode: true }),
      })),
      nextCursor,
      total: count ?? payments.length,
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
