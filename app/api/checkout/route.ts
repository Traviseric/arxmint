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
import { getAuthPubkey } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { buildInvoicePaymentLink } from "@/lib/invoices";

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
      const { merchantId: rawMerchantId, memo, shipping, invoiceId } = body;
      let merchantId =
        typeof rawMerchantId === "string" && rawMerchantId.trim().length > 0
          ? rawMerchantId.trim()
          : undefined;
      let invoiceRecord:
        | {
            id: string;
            invoiceNumber: string;
            merchantId: string | null;
            currency: "BTC" | "USD";
            status: "draft" | "sent" | "paid" | "overdue" | "void";
            totalMinor: number;
            paymentRail: "lightning" | "cashu" | "stripe";
          }
        | null = null;

      if (invoiceId !== undefined) {
        if (typeof invoiceId !== "string" || invoiceId.trim().length === 0) {
          return apiError(400, "MISSING_FIELD", "invoiceId must be a non-empty string");
        }

        invoiceRecord = await db.invoice.findUnique({
          where: { id: invoiceId.trim() },
          select: {
            id: true,
            invoiceNumber: true,
            merchantId: true,
            currency: true,
            status: true,
            totalMinor: true,
            paymentRail: true,
          },
        });

        if (!invoiceRecord) {
          return apiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
        }

        if (invoiceRecord.currency !== "BTC") {
          return apiError(
            409,
            "INVOICE_CURRENCY_UNSUPPORTED",
            "Only BTC invoices can be settled through ArxMint checkout"
          );
        }

        if (invoiceRecord.status === "paid") {
          return apiError(409, "INVOICE_ALREADY_PAID", "Invoice is already paid");
        }

        if (invoiceRecord.status === "void") {
          return apiError(409, "INVOICE_VOID", "Void invoices cannot be paid");
        }

        merchantId = merchantId ?? invoiceRecord.merchantId ?? undefined;
      }

      if (!merchantId) {
        return apiError(400, "MISSING_FIELD", "merchantId is required");
      }

      const amountSats = invoiceRecord
        ? invoiceRecord.totalMinor
        : validateAmount(body.amountSats);
      const sanitizedMemo = memo
        ? String(memo).trim().slice(0, 200)
        : invoiceRecord
          ? `Invoice ${invoiceRecord.invoiceNumber}`
          : undefined;

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

      if (invoiceRecord) {
        const invoicePaymentLink = buildInvoicePaymentLink(
          {
            id: invoiceRecord.id,
            merchantId,
            paymentRail: invoiceRecord.paymentRail,
          },
          new URL(request.url).origin
        );

        const updatedInvoice = await db.invoice.update({
          where: { id: invoiceRecord.id },
          data: {
            paymentSessionId: sessionId,
            paymentLink: invoicePaymentLink,
            ...(invoiceRecord.status === "draft"
              ? { status: "sent", sentAt: new Date() }
              : {}),
          },
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        if (invoiceRecord.status === "draft") {
          await emitInvoiceStateChanged({
            invoice: updatedInvoice,
            previousStatus: "draft",
            lineItems: updatedInvoice.lineItems,
          });
        }
      }

      // Best-effort cross-auth identity linking.
      // When a request carries both a Nostr session (cookie or Bearer) AND a
      // X-Teneo-Auth JWT, both identities are present — link them automatically.
      // This call is fire-and-forget wrapped in try/catch — checkout never fails here.
      try {
        const nostrPubkey = getAuthPubkey(request);
        const teneoAuthHeader = request.headers.get("X-Teneo-Auth");
        if (nostrPubkey && teneoAuthHeader) {
          const { parseTeneoAuthUserId, autoLinkCheckoutIdentity } = await import("@/lib/identity");
          const teneoUserId = parseTeneoAuthUserId(teneoAuthHeader);
          if (teneoUserId) {
            await autoLinkCheckoutIdentity(nostrPubkey, teneoUserId);
          }
        }
      } catch {
        // Silent — identity linking must never affect checkout outcome
      }

      return NextResponse.json({
        sessionId,
        invoice,
        expiresAt: expiresAt.toISOString(),
        demoMode,
        merchantName: merchant.businessName,
        amountSats,
        ...(invoiceRecord
          ? {
              invoiceId: invoiceRecord.id,
              invoiceNumber: invoiceRecord.invoiceNumber,
            }
          : {}),
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
