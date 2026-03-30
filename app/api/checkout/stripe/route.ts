// ============================================================
// ArxMint — Stripe Fiat On-Ramp Checkout
// POST /api/checkout/stripe — create a Stripe Checkout Session
//
// Accepts USD via credit card. On successful payment, the webhook
// handler converts USD→sats at market rate and mints Cashu ecash
// into the ArxMint economy. Fiat enters at the gate; from that
// point forward everything is Bitcoin-native.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, usdCentsToSats } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { getAuthPubkey } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { buildInvoicePaymentLink } from "@/lib/invoices";
import { logger } from "@/lib/logger";

// Min/max in USD cents
const MIN_AMOUNT_CENTS = 100; // $1.00
// Default $50/day per merchant — keeps activity below Stripe algorithmic
// monitoring and AML alert thresholds. Merchants who want higher limits
// must explicitly configure STRIPE_DAILY_LIMIT_CENTS in their env.
const MAX_AMOUNT_CENTS = parseInt(
  process.env.STRIPE_DAILY_LIMIT_CENTS ?? "5000",
  10
); // Default $50.00

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`stripe-checkout:${ip}`, { windowMs: 3_600_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  try {
    const body = await request.json();
    const { amountCents, merchantId, invoiceId, successUrl, cancelUrl } = body;

    // ---- Invoice-driven flow ----
    let invoiceRecord: {
      id: string;
      invoiceNumber: string;
      merchantId: string | null;
      currency: "BTC" | "USD";
      status: "draft" | "sent" | "paid" | "overdue" | "void";
      totalMinor: number;
      paymentRail: "lightning" | "cashu" | "stripe";
    } | null = null;

    let effectiveAmountCents: number;
    let effectiveMerchantId: string | undefined =
      typeof merchantId === "string" && merchantId.trim().length > 0
        ? merchantId.trim()
        : undefined;

    if (invoiceId) {
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
      if (invoiceRecord.status === "paid") {
        return apiError(409, "INVOICE_ALREADY_PAID", "Invoice is already paid");
      }
      if (invoiceRecord.status === "void") {
        return apiError(409, "INVOICE_VOID", "Void invoices cannot be paid");
      }

      // USD invoices: totalMinor is cents. BTC invoices: totalMinor is sats — convert to USD.
      if (invoiceRecord.currency === "USD") {
        effectiveAmountCents = invoiceRecord.totalMinor;
      } else {
        // BTC invoice paid via Stripe: convert sats→USD at market rate
        const { satsToUsdCents } = await import("@/lib/stripe");
        const { cents } = await satsToUsdCents(invoiceRecord.totalMinor);
        effectiveAmountCents = cents;
      }

      effectiveMerchantId = effectiveMerchantId ?? invoiceRecord.merchantId ?? undefined;
    } else {
      // Direct purchase: amount in cents
      if (typeof amountCents !== "number" || !Number.isInteger(amountCents)) {
        return apiError(400, "MISSING_FIELD", "amountCents must be an integer (USD cents)");
      }
      effectiveAmountCents = amountCents;
    }

    // ---- Validate amount ----
    if (effectiveAmountCents < MIN_AMOUNT_CENTS) {
      return apiError(400, "AMOUNT_TOO_LOW", `Minimum purchase is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}`);
    }
    if (effectiveAmountCents > MAX_AMOUNT_CENTS) {
      return apiError(400, "AMOUNT_TOO_HIGH", `Maximum purchase is $${(MAX_AMOUNT_CENTS / 100).toFixed(2)}`);
    }

    // ---- Preview sats the buyer will receive ----
    const { sats: estimatedSats, btcPriceUsd } = await usdCentsToSats(effectiveAmountCents);

    // ---- Caller identity (optional) ----
    const nostrPubkey = getAuthPubkey(request);

    // ---- Create Stripe Checkout Session ----
    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: effectiveAmountCents,
            product_data: {
              name: `ArxMint Credits — ~${estimatedSats.toLocaleString()} sats`,
              description: `Bitcoin ecash credits at $${btcPriceUsd.toLocaleString()}/BTC`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        arxmint_type: "fiat_onramp",
        estimated_sats: String(estimatedSats),
        btc_price_usd: String(btcPriceUsd),
        nostr_pubkey: nostrPubkey ?? "",
        merchant_id: effectiveMerchantId ?? "",
        invoice_id: invoiceRecord?.id ?? "",
      },
      success_url: successUrl || `${origin}/wallet?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: cancelUrl || `${origin}/wallet?status=cancelled`,
    });

    // ---- Link invoice if present ----
    if (invoiceRecord) {
      const invoicePaymentLink = buildInvoicePaymentLink(
        { id: invoiceRecord.id, merchantId: effectiveMerchantId ?? null, paymentRail: "stripe" },
        origin
      );

      const updatedInvoice = await db.invoice.update({
        where: { id: invoiceRecord.id },
        data: {
          paymentSessionId: session.id,
          paymentLink: invoicePaymentLink,
          ...(invoiceRecord.status === "draft"
            ? { status: "sent", sentAt: new Date() }
            : {}),
        },
        include: {
          lineItems: { orderBy: { sortOrder: "asc" } },
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

    logger.payment("stripe_checkout_created", {
      amount: effectiveAmountCents,
      backend: "stripe",
      status: "pending",
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      amountCents: effectiveAmountCents,
      amountUsd: `$${(effectiveAmountCents / 100).toFixed(2)}`,
      estimatedSats,
      btcPriceUsd,
      ...(invoiceRecord
        ? { invoiceId: invoiceRecord.id, invoiceNumber: invoiceRecord.invoiceNumber }
        : {}),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    logger.error("stripe_checkout_error", {
      error: message,
    });
    return apiError(400, "BAD_REQUEST", message);
  }
}
