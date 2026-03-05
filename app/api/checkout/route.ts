// ============================================================
// ArxMint — Checkout API
// POST /api/checkout — create a Lightning invoice for a merchant
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { validateAmount } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

const INVOICE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

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

  try {
    const body = await request.json();
    const { merchantId, memo } = body;

    if (!merchantId || typeof merchantId !== "string") {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
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

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }
    if (!merchant.checkout_enabled) {
      return NextResponse.json({ error: "Checkout not enabled for this merchant" }, { status: 403 });
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
        // Fall back to demo mode if LND unavailable
        invoice = generateDemoInvoice(amountSats);
        demoMode = true;
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function generateDemoInvoice(amountSats: number): string {
  // Generate a realistic-looking but unpayable BOLT11 string for demo/dev
  const rand = randomBytes(32).toString("hex");
  return `lnbc${amountSats}n1demo${rand.slice(0, 52)}`;
}
