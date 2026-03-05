// ============================================================
// ArxMint — Checkout Status API
// GET /api/checkout/status/[id] — poll payment status
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const DEMO_AUTO_PAY_DELAY_MS = 5_000; // Auto-settle demo payments after 5s

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 64) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: session, error } = await supabase
      .from("checkout_sessions")
      .select("id, status, demo_mode, created_at, expires_at, paid_at, amount_sats")
      .eq("id", id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check expiry
    if (session.status === "pending" && new Date(session.expires_at) < new Date()) {
      await supabase
        .from("checkout_sessions")
        .update({ status: "expired" })
        .eq("id", id);
      return NextResponse.json({ status: "expired" });
    }

    // Demo mode: auto-settle after 5 seconds
    if (session.status === "pending" && session.demo_mode) {
      const createdAt = new Date(session.created_at).getTime();
      if (Date.now() - createdAt > DEMO_AUTO_PAY_DELAY_MS) {
        const paidAt = new Date().toISOString();
        await supabase
          .from("checkout_sessions")
          .update({ status: "paid", paid_at: paidAt })
          .eq("id", id);
        return NextResponse.json({ status: "paid", paidAt, amountSats: session.amount_sats });
      }
    }

    return NextResponse.json({
      status: session.status,
      paidAt: session.paid_at || undefined,
      amountSats: session.amount_sats,
    });
  } catch {
    // DB unavailable — return unknown
    return NextResponse.json({ error: "Unable to check status" }, { status: 503 });
  }
}
