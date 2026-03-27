// ============================================================
// ArxMint — Send Invoice Email
// POST /api/invoice/[id]/email
// Sends a payment request email to a customer for a checkout session.
// Body: { customerEmail: string }
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Seed merchant display names
const SEED_NAMES: Record<string, string> = {
  "seed-black-bear": "Black Bear Window Cleaning",
  "seed-glacier": "The Ice Cream Parlor by Glacier",
  "seed-teneo": "Teneo",
  "arxmint-store": "ArxMint Store",
};

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices", {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return 0;
    const data = await res.json() as { USD?: number };
    return typeof data.USD === "number" ? data.USD : 0;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parse body
  let customerEmail: string;
  try {
    const body = await request.json();
    customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
    return NextResponse.json({ error: "Valid customerEmail is required" }, { status: 400 });
  }

  interface CheckoutSession {
    id: string;
    merchant_id: string | null;
    amount_sats: number | null;
    memo: string | null;
    status: string;
  }

  // Load checkout session
  let session: CheckoutSession | null = null;

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("checkout_sessions")
      .select("id, merchant_id, amount_sats, memo, status")
      .eq("id", id)
      .single();
    if (!error && data) session = data as CheckoutSession;
  } catch {
    // DB unavailable
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const merchantId = session.merchant_id ?? "unknown";
  const amountSats = session.amount_sats ?? 0;

  // Resolve merchant name
  let merchantName = SEED_NAMES[merchantId] ?? merchantId;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("merchant_pledges")
      .select("businessName")
      .eq("id", merchantId)
      .single();
    const row = data as { businessName?: string } | null;
    if (row?.businessName) merchantName = row.businessName;
  } catch {
    // use seed fallback
  }

  // Build payment URL
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://arxmint.com";
  const paymentUrl = `${origin}/pay/${merchantId}`;

  // Fetch live BTC price
  const btcPrice = await fetchBtcPrice();
  const amountUsd =
    btcPrice > 0
      ? ((amountSats / 100_000_000) * btcPrice).toFixed(2)
      : null;

  // Send email
  const sent = await sendInvoiceEmail({
    to: customerEmail,
    merchantName,
    amountSats,
    amountUsd,
    paymentUrl,
    sessionId: id,
    memo: session.memo,
  });

  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send email. Check RESEND_API_KEY configuration." },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, to: customerEmail });
}
