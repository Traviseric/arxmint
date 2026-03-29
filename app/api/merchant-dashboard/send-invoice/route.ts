// ============================================================
// ArxMint — Send Invoice API
// POST /api/merchant-dashboard/send-invoice
// Sends a payment request email to a customer on behalf of a merchant.
//
// Supabase table (run once):
// CREATE TABLE sent_invoices (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   merchant_id TEXT NOT NULL,
//   customer_email TEXT NOT NULL,
//   amount_sats INTEGER NOT NULL,
//   amount_usd TEXT,
//   memo TEXT,
//   payment_url TEXT NOT NULL,
//   status TEXT DEFAULT 'sent',
//   sent_at TIMESTAMPTZ DEFAULT NOW(),
//   paid_at TIMESTAMPTZ
// );
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { sendInvoiceEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SATS = 1;
const MAX_SATS = 1_000_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, customerEmail, amountSats: rawAmount, memo: rawMemo } = body;

    // --- Validate merchantId ---
    if (typeof merchantId !== "string" || merchantId.trim().length === 0) {
      return apiError(400, "MISSING_FIELD", "merchantId is required");
    }
    const mid = merchantId.trim();

    // --- Rate limit: 20 per hour per merchant ---
    const rl = checkRateLimit(`send-invoice:${mid}`, {
      windowMs: 3_600_000,
      maxRequests: 20,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Too many invoices sent. Try again later." } },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
      );
    }

    // --- Validate email ---
    if (typeof customerEmail !== "string" || !EMAIL_RE.test(customerEmail.trim())) {
      return apiError(400, "INVALID_EMAIL", "A valid customer email is required");
    }
    const email = customerEmail.trim().toLowerCase().slice(0, 254);

    // --- Validate amount ---
    const amountSats = Number(rawAmount);
    if (!Number.isFinite(amountSats) || !Number.isInteger(amountSats) || amountSats < MIN_SATS || amountSats > MAX_SATS) {
      return apiError(400, "INVALID_AMOUNT", `Amount must be an integer between ${MIN_SATS} and ${MAX_SATS} sats`);
    }

    // --- Sanitize memo ---
    const memo = typeof rawMemo === "string" && rawMemo.trim().length > 0
      ? rawMemo.trim().slice(0, 200)
      : null;

    // --- Look up merchant ---
    let merchant: { id: string; businessName: string; checkout_enabled: boolean } | null = null;

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("merchant_pledges")
        .select("id, businessName, checkout_enabled")
        .eq("id", mid)
        .single();
      if (!error && data) merchant = data;
    } catch {
      // DB unavailable — check seed merchants
    }

    // Seed merchant fallbacks
    const SEED_MERCHANTS: Record<string, { id: string; businessName: string; checkout_enabled: boolean }> = {
      "seed-black-bear": { id: "seed-black-bear", businessName: "Black Bear Window Cleaning", checkout_enabled: true },
      "seed-glacier": { id: "seed-glacier", businessName: "The Ice Cream Parlor by Glacier", checkout_enabled: true },
      "seed-teneo": { id: "seed-teneo", businessName: "Teneo", checkout_enabled: true },
      "arxmint-store": { id: "arxmint-store", businessName: "ArxMint Store", checkout_enabled: true },
    };
    if (!merchant && SEED_MERCHANTS[mid]) {
      merchant = SEED_MERCHANTS[mid];
    }

    if (!merchant) {
      return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
    }
    if (!merchant.checkout_enabled) {
      return apiError(403, "CHECKOUT_DISABLED", "Checkout not enabled for this merchant");
    }

    // --- Fetch BTC price for USD conversion ---
    let amountUsd: string | null = null;
    try {
      const priceRes = await fetch("https://mempool.space/api/v1/prices", {
        signal: AbortSignal.timeout(5000),
      });
      if (priceRes.ok) {
        const priceData = await priceRes.json() as { USD?: number };
        if (priceData.USD) {
          const usd = (amountSats / 100_000_000) * priceData.USD;
          amountUsd = usd.toFixed(2);
        }
      }
    } catch {
      // Non-fatal — USD conversion will be null
    }

    // --- Build payment URL ---
    const paymentUrl = memo
      ? `https://www.arxmint.com/pay/${mid}?amount=${amountSats}&memo=${encodeURIComponent(memo)}`
      : `https://www.arxmint.com/pay/${mid}?amount=${amountSats}`;

    // --- Generate a session ID for the invoice reference ---
    const sessionId = randomBytes(16).toString("hex");

    // --- Send the email ---
    const sent = await sendInvoiceEmail({
      to: email,
      merchantName: merchant.businessName,
      amountSats,
      amountUsd,
      paymentUrl,
      sessionId,
      memo,
    });

    if (!sent) {
      return apiError(500, "EMAIL_FAILED", "Failed to send invoice email. Check RESEND_API_KEY configuration.");
    }

    // --- Store in Supabase ---
    let invoiceId: string | null = null;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("sent_invoices")
        .insert({
          merchant_id: mid,
          customer_email: email,
          amount_sats: amountSats,
          amount_usd: amountUsd,
          memo,
          payment_url: paymentUrl,
          status: "sent",
        })
        .select("id")
        .single();
      invoiceId = data?.id ?? null;
    } catch {
      // Non-fatal — email was already sent
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoiceId ?? sessionId,
      amountSats,
      amountUsd,
      customerEmail: email,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return apiError(400, "BAD_REQUEST", message);
  }
}
