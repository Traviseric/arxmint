// ============================================================
// ArxMint — Checkout Status API
// GET /api/checkout/status/[id] — poll payment status (clean schema)
// GET /api/checkout/status/[id]/stream — SSE real-time stream
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import type { PaymentStatus } from "@/lib/types";

const DEMO_AUTO_PAY_DELAY_MS = 5_000; // Auto-settle demo payments after 5s (dev only)

/** Resolve the current status, handling expiry and dev demo auto-pay */
async function resolveSession(id: string, requestUrl: string): Promise<{
  id: string;
  status: PaymentStatus;
  amountSats: number;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  demoMode: boolean;
  merchantId: string;
} | null> {
  const { supabase } = await import("@/lib/supabase");
  const { data: session, error } = await supabase
    .from("checkout_sessions")
    .select("id, status, demo_mode, created_at, expires_at, paid_at, amount_sats, merchant_id, r_hash")
    .eq("id", id)
    .single();

  if (error || !session) return null;

  let status: PaymentStatus = session.status as PaymentStatus;

  // Compute expiry
  if (status === "pending" && new Date(session.expires_at) < new Date()) {
    await supabase
      .from("checkout_sessions")
      .update({ status: "expired" })
      .eq("id", id);
    status = "expired";
  }

  // Check LNbits for payment confirmation (real payments)
  if (status === "pending" && !session.demo_mode && session.r_hash) {
    try {
      const { checkLNbitsPayment } = await import("@/lib/lnbits");
      const lnbitsStatus = await checkLNbitsPayment({ paymentHash: session.r_hash });
      if (lnbitsStatus.paid) {
        const paidAt = new Date().toISOString();
        await supabase
          .from("checkout_sessions")
          .update({ status: "paid", paid_at: paidAt })
          .eq("id", id);

        // Fire webhook for fulfillment
        fetch(new URL("/api/checkout/webhook", requestUrl).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        }).catch(() => {});

        return {
          id: session.id,
          status: "paid" as PaymentStatus,
          amountSats: session.amount_sats,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          paidAt,
          demoMode: false,
          merchantId: session.merchant_id,
        };
      }
    } catch {
      // LNbits check failed — continue with current status
    }
  }

  // Dev-only: demo auto-pay after 5 seconds
  if (status === "pending" && session.demo_mode && process.env.NODE_ENV === "development") {
    const createdAt = new Date(session.created_at).getTime();
    if (Date.now() - createdAt > DEMO_AUTO_PAY_DELAY_MS) {
      const paidAt = new Date().toISOString();
      await supabase
        .from("checkout_sessions")
        .update({ status: "paid", paid_at: paidAt })
        .eq("id", id);

      // Fire webhook asynchronously for fulfillment in demo mode
      fetch(new URL("/api/checkout/webhook", requestUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      }).catch((err) => console.error("Auto-webhook failed:", err));

      return {
        id: session.id,
        status: "paid",
        amountSats: session.amount_sats,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        paidAt,
        demoMode: true,
        merchantId: session.merchant_id,
      };
    }
  }

  return {
    id: session.id,
    status,
    amountSats: session.amount_sats,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    paidAt: session.paid_at || undefined,
    demoMode: Boolean(session.demo_mode),
    merchantId: session.merchant_id,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 64) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const session = await resolveSession(id, request.url);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Clean response — no internal fields (no demo_mode, no merchant_id exposed)
    return NextResponse.json({
      id: session.id,
      status: session.status,
      amountSats: session.amountSats,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ...(session.paidAt && { paidAt: session.paidAt }),
      ...(session.demoMode && { demoMode: true }),
    });
  } catch {
    return NextResponse.json({ error: "Unable to check status" }, { status: 503 });
  }
}
