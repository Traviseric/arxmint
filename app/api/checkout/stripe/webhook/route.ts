// ============================================================
// ArxMint — Stripe Webhook Handler
// POST /api/checkout/stripe/webhook
//
// Called by Stripe when a checkout session completes.
// Converts the USD payment → sats at market rate → mints Cashu
// ecash → records the transaction in the ArxMint economy.
//
// This is the fiat→Bitcoin bridge. USD stops here. From this
// point forward, everything is sats.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { Wallet } from "@cashu/cashu-ts";
import { verifyStripeWebhook, usdCentsToSats } from "@/lib/stripe";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { triggerPaymentWebhooks } from "@/lib/webhook-engine";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // ---- Verify Stripe signature ----
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const event = verifyStripeWebhook(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ---- Route by event type ----
  if (event.type === "checkout.session.completed") {
    return handleCheckoutCompleted(event as unknown as { type: string; data: { object: Record<string, unknown> } });
  }

  // Acknowledge other events we don't handle
  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(event: { type: string; data: { object: Record<string, unknown> } }) {
  const session = event.data.object as {
    id: string;
    amount_total: number | null;
    currency: string;
    payment_status: string;
    metadata: Record<string, string> | null;
  };

  // Only process paid sessions
  if (session.payment_status !== "paid") {
    logger.info("stripe_webhook_skipped_unpaid", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return NextResponse.json({ received: true, action: "skipped_unpaid" });
  }

  const metadata = session.metadata ?? {};

  // Only process our on-ramp sessions
  if (metadata.arxmint_type !== "fiat_onramp") {
    logger.info("stripe_webhook_skipped_unknown_type", {
      sessionId: session.id,
      type: metadata.arxmint_type,
    });
    return NextResponse.json({ received: true, action: "skipped_unknown_type" });
  }

  const amountCents = session.amount_total ?? 0;
  const nostrPubkey = metadata.nostr_pubkey || null;
  const merchantId = metadata.merchant_id || null;
  const invoiceId = metadata.invoice_id || null;

  // ---- Convert USD → sats at current market rate ----
  const { sats, btcPriceUsd, rateLockedAt } = await usdCentsToSats(amountCents);

  if (sats < 1) {
    logger.warn("stripe_webhook_zero_sats", {
      sessionId: session.id,
      amountCents,
      btcPriceUsd,
    });
    return NextResponse.json({ received: true, action: "amount_too_small" });
  }

  logger.payment("stripe_fiat_onramp", {
    amount: sats,
    backend: "stripe→cashu",
    status: "converting",
    amountCents,
    btcPriceUsd,
    sessionId: session.id,
  });

  // ---- Mint Cashu ecash ----
  const mintUrl = process.env.CASHU_MINT_URL ?? "http://localhost:3338";
  let mintQuoteId: string | null = null;
  let mintInvoice: string | null = null;
  let mintStatus: "minted" | "quote_created" | "mint_failed" = "mint_failed";

  try {
    const wallet = new Wallet(mintUrl);
    const quote = await wallet.createMintQuoteBolt11(sats);
    mintQuoteId = quote.quote;
    mintInvoice = quote.request;
    mintStatus = "quote_created";

    logger.payment("stripe_cashu_mint_quote", {
      amount: sats,
      backend: "cashu",
      status: "quote_created",
      mintUrl,
      quoteId: mintQuoteId,
    });
  } catch (err) {
    // Mint unavailable — record the credit anyway so it can be claimed later.
    // The transaction record serves as a receipt; a background job can retry minting.
    logger.warn("stripe_cashu_mint_quote_failed", {
      error: err instanceof Error ? err.message : String(err),
      sessionId: session.id,
      sats,
    });
  }

  // ---- Record transaction ----
  const communityId = "fiat-onramp";
  let txId: string;

  try {
    // Ensure the fiat-onramp community exists (idempotent)
    await db.community.upsert({
      where: { id: communityId },
      update: {},
      create: {
        id: communityId,
        name: "Fiat On-Ramp",
        prompt: "System community for Stripe→ecash fiat on-ramp transactions",
        config: {},
      },
    });

    const tx = await db.transaction.create({
      data: {
        communityId,
        type: "fiat_onramp",
        amount: sats,
        backend: "stripe",
        status: mintStatus === "mint_failed" ? "pending" : "confirmed",
        counterparty: nostrPubkey,
        notes: JSON.stringify({
          stripeSessionId: session.id,
          amountCents,
          btcPriceUsd,
          rateLockedAt,
          mintUrl,
          mintQuoteId,
          mintInvoice,
          mintStatus,
          nostrPubkey,
          merchantId,
          invoiceId,
        }),
      },
    });
    txId = tx.id;
  } catch (err) {
    logger.error("stripe_webhook_tx_persist_failed", {
      error: err instanceof Error ? err.message : String(err),
      sessionId: session.id,
    });
    txId = `mem_${Date.now().toString(36)}`;
  }

  // ---- Mark invoice paid if linked ----
  if (invoiceId) {
    try {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lineItems: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (invoice && invoice.status !== "paid" && invoice.status !== "void") {
        const previousStatus = invoice.status;
        const updatedInvoice = await db.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
          include: {
            lineItems: { orderBy: { sortOrder: "asc" } },
          },
        });

        await emitInvoiceStateChanged({
          invoice: updatedInvoice,
          previousStatus,
          lineItems: updatedInvoice.lineItems,
        });
      }
    } catch (err) {
      logger.warn("stripe_webhook_invoice_update_failed", {
        error: err instanceof Error ? err.message : String(err),
        invoiceId,
      });
    }
  }

  // ---- Fire merchant webhooks ----
  if (merchantId) {
    triggerPaymentWebhooks(
      merchantId,
      txId,
      sats,
      "payment.completed",
      {
        source: "stripe_fiat_onramp",
        amountCents,
        btcPriceUsd,
        stripeSessionId: session.id,
      }
    );
  }

  logger.payment("stripe_fiat_onramp_complete", {
    amount: sats,
    backend: "stripe→cashu",
    status: mintStatus,
    txId,
    sessionId: session.id,
  });

  return NextResponse.json({
    received: true,
    action: "fiat_onramp_processed",
    txId,
    sats,
    mintStatus,
  });
}
