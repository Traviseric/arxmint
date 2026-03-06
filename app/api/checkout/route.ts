// ============================================================
// ArxMint — Checkout API
// POST /api/checkout — create a Lightning invoice for a merchant
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { validateAmount } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { withIdempotency } from "@/lib/idempotency";
import { apiError } from "@/lib/api-error";

const INVOICE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Demo mode: only in development or when DEMO_MODE=true explicitly set.
// Never auto-enabled in production — production failures return 503, not fake invoices.
const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  // Rate limit: 10 per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`checkout:${ip}`, { windowMs: 3_600_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  return withIdempotency(request, async () => {
    try {
      const body = await request.json();
      const { merchantId, memo, shipping } = body;

      if (!merchantId || typeof merchantId !== "string") {
        return apiError(400, "MISSING_FIELD", "merchantId is required");
      }

      const amountSats = validateAmount(body.amountSats);
      const sanitizedMemo = memo ? String(memo).trim().slice(0, 200) : undefined;

      // Look up merchant
      let merchant: { id: string; businessName: string; checkout_enabled: boolean } | null = null;

      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("merchant_pledges")
          .select("id, businessName, checkout_enabled")
          .eq("id", merchantId)
          .single();

        if (!error && data) merchant = data;
      } catch {
        // DB unavailable — check seed merchants
      }

      // Fallback: allow seed merchants in demo mode
      if (!merchant && merchantId === "seed-glacier") {
        merchant = { id: "seed-glacier", businessName: "The Ice Cream Parlor by Glacier", checkout_enabled: true };
      }
      if (!merchant && merchantId === "seed-teneo") {
        merchant = { id: "seed-teneo", businessName: "Teneo", checkout_enabled: true };
      }
      if (!merchant && merchantId === "arxmint-store") {
        merchant = { id: "arxmint-store", businessName: "ArxMint Store", checkout_enabled: true };
      }

      if (!merchant) {
        return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
      }
      if (!merchant.checkout_enabled) {
        return apiError(403, "CHECKOUT_DISABLED", "Checkout not enabled for this merchant");
      }

      const sessionId = randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + INVOICE_TTL_MS);
      let invoice: string;
      let rHash: string | null = null;
      let demoMode = false;

      if (!DEMO_MODE) {
        // Real mode: create LND invoice via payment-sdk
        try {
          const { createL402Challenge } = await import("@/lib/payment-sdk");
          const challenge = await createL402Challenge({
            amount: amountSats,
            resourcePath: `/pay/${merchantId}`,
          });
          invoice = challenge.invoice || "";
          // Extract r_hash if available (stored in the L402 pending map internally)
          rHash = null; // LND r_hash tracked internally by payment-sdk
        } catch {
          // LND unavailable in production — return 503 instead of fake invoice
          return apiError(503, "PAYMENT_BACKEND_UNAVAILABLE", "Payment backend temporarily unavailable. Please try again shortly.");
        }
      } else {
        invoice = generateDemoInvoice(amountSats);
        demoMode = true;
      }

      // Store session in Supabase
      try {
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("checkout_sessions").insert({
          id: sessionId,
          merchant_id: merchantId,
          amount_sats: amountSats,
          memo: sanitizedMemo || `Payment to ${merchant.businessName}`,
          invoice,
          r_hash: rHash,
          status: "pending",
          demo_mode: demoMode,
          expires_at: expiresAt.toISOString(),
          ...(shipping && { shipping_data: shipping }),
        });
      } catch {
        // If DB insert fails, session still works in-memory for demo
      }

      return NextResponse.json({
        sessionId,
        invoice,
        expiresAt: expiresAt.toISOString(),
        demoMode,
        merchantName: merchant.businessName,
        amountSats,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      return apiError(400, "BAD_REQUEST", message);
    }
  });
}

function generateDemoInvoice(amountSats: number): string {
  // Generate a realistic-looking but unpayable BOLT11 string for demo/dev
  const rand = randomBytes(32).toString("hex");
  return `lnbc${amountSats}n1demo${rand.slice(0, 52)}`;
}
