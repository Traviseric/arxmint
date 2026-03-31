import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { logger } from "@/lib/logger";
import { triggerPaymentWebhooks, deliverWebhook } from "@/lib/webhook-engine";
import { sendTelegramNotification, formatPaymentMessage } from "@/lib/telegram-notify";
import { sendPaymentReceivedEmail, sendPaymentReceiptEmail } from "@/lib/email";
import { createDropshipOrder } from "@/lib/printful/client";
import type { PrintfulOrderPayload } from "@/lib/printful/types";

const OPENBAZAAR_FULFILL_URL = "https://openbazaar.ai/api/storefront/fulfill";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
        }

        const { supabase } = await import("@/lib/supabase");

        // 1. Fetch the checkout session
        const { data: session, error: fetchError } = await supabase
            .from("checkout_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (fetchError || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Usually, this endpoint would be called by LND after payment is confirmed.
        // If it's not marked paid yet (e.g., demo test), we'll update it here.
        if (session.status !== "paid") {
            const paidAt = new Date().toISOString();
            await supabase
                .from("checkout_sessions")
                .update({ status: "paid", paid_at: paidAt })
                .eq("id", sessionId);
            session.status = "paid";
            session.paid_at = paidAt;
        }

        // 2. If this payment is for the ArxMint Store, trigger OpenBazaar fulfillment webhook
        if (session.merchant_id === "arxmint-store") {
            logger.info(`Triggering OpenBazaar fulfillment for session ${sessionId}`);

            // Attempt to extract productId from memo if it was passed there.
            // Default to "unknown" if not found so OpenBazaar knows to look at the invoice amount/memo manually.
            let productId = "unknown";
            if (session.memo) {
                // If the frontend passed product ID as part of memo or we just send the whole title
                productId = session.memo;
            }

            const shippingData = session.shipping_data || null;

            const payload = {
                sessionId: session.id,
                productId,
                paymentProvider: "arxmint",
                amountSats: session.amount_sats,
                paidAt: session.paid_at || new Date().toISOString(),
                customerEmail: shippingData?.email || "",
                ...(shippingData && {
                    shipping: {
                        fullName: shippingData.fullName,
                        street: shippingData.street,
                        city: shippingData.city,
                        state: shippingData.state,
                        zip: shippingData.zip,
                        country: "US",
                    },
                }),
            };

            const secret = process.env.ARXMINT_WEBHOOK_SECRET || "development_secret";
            const hmac = crypto.createHmac("sha256", secret);
            hmac.update(JSON.stringify(payload));
            const signature = hmac.digest("hex");

            try {
                const fulfillRes = await fetch(OPENBAZAAR_FULFILL_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-ArxMint-Signature": signature,
                    },
                    body: JSON.stringify(payload),
                });

                if (!fulfillRes.ok) {
                    const errorText = await fulfillRes.text();
                    logger.error(`OpenBazaar API returned error: ${errorText}`);
                    return NextResponse.json({ error: "Upstream webhook failed" }, { status: 502 });
                }
            } catch (upstreamError: unknown) {
                logger.error("Failed to connect to OpenBazaar API", {
                    error: upstreamError instanceof Error ? upstreamError.message : String(upstreamError)
                });
                return NextResponse.json({ error: "Gateway error to OpenBazaar" }, { status: 504 });
            }
        }

        // 3. If the session has a fulfillment_url, deliver a HMAC-signed webhook there.
        //    This is the generic path for Bazaar and any future storefront integrations —
        //    the receiver verifies ArxMint-Signature just like the webhook engine does.
        if (session.fulfillment_url) {
            const fulfillSecret =
                process.env.ARXMINT_BAZAAR_WEBHOOK_SECRET ||
                process.env.ARXMINT_WEBHOOK_SECRET ||
                "development_secret";

            const fulfillPayload = {
                id: `wdlv_bazaar_${sessionId.slice(0, 8)}`,
                event: "payment.completed" as const,
                created: Math.floor(Date.now() / 1000),
                data: {
                    paymentId: sessionId,
                    amount: session.amount_sats ?? 0,
                    merchantId: session.merchant_id ?? "",
                    metadata: {
                        source: "bazaar",
                        memo: session.memo ?? null,
                    },
                },
            };

            const syntheticEndpoint = {
                id: `bazaar_fulfillment_${sessionId.slice(0, 8)}`,
                merchantId: session.merchant_id ?? "",
                url: session.fulfillment_url,
                secret: fulfillSecret,
                events: ["payment.completed" as const],
                active: true,
                createdAt: Date.now(),
            };

            // Fire-and-forget — fulfillment delivery must never block the webhook response
            deliverWebhook(syntheticEndpoint, fulfillPayload)
                .then((result) => {
                    if (result.success) {
                        logger.info("bazaar_fulfillment_delivered", {
                            sessionId,
                            fulfillmentUrl: session.fulfillment_url,
                            attempts: result.attempts,
                        });
                    } else {
                        logger.warn("bazaar_fulfillment_failed", {
                            sessionId,
                            fulfillmentUrl: session.fulfillment_url,
                            attempts: result.attempts,
                            error: result.error,
                        });
                    }
                })
                .catch(() => {/* already logged inside deliverWebhook */});
        }

        // 4. If this payment is for ArxMint Merch (Lightning-paid), trigger Printful dropship
        if (session.merchant_id === "arxmint-merch") {
            const meta = session.metadata || {};
            if (meta.needs_dropship === "true" && meta.printful_items) {
                logger.info(`Triggering Printful fulfillment for merch session ${sessionId}`);
                try {
                    const printfulItems = JSON.parse(meta.printful_items) as Array<{
                        sync_variant_id: number;
                        quantity: number;
                        name: string;
                    }>;

                    const shippingData = session.shipping_data;
                    if (!shippingData) {
                        logger.error(`No shipping data for merch session ${sessionId}`);
                    } else {
                        const payload: PrintfulOrderPayload = {
                            external_id: sessionId,
                            recipient: {
                                name: shippingData.fullName || "Customer",
                                address1: shippingData.street || "",
                                city: shippingData.city || "",
                                state_code: shippingData.state || "",
                                country_code: "US",
                                zip: shippingData.zip || "",
                                email: shippingData.email || "",
                            },
                            items: printfulItems.map((item) => ({
                                sync_variant_id: item.sync_variant_id,
                                quantity: item.quantity,
                            })),
                        };

                        const result = await createDropshipOrder(payload, { confirm: true });
                        if (result.ok) {
                            logger.info(`Printful order created: ${result.data.id} for session ${sessionId}`);
                        } else {
                            logger.error(`Printful order failed for session ${sessionId}: ${result.error}`);
                        }
                    }
                } catch (err: unknown) {
                    logger.error("Printful fulfillment error", {
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            }
        }

        // Best-effort identity linking on payment confirmation.
        if (
          !session.identity_linked &&
          session.privacy_level !== "maximum" &&
          session.nostr_pubkey &&
          session.teneo_user_id
        ) {
          try {
            const { autoLinkCheckoutIdentity } = await import("@/lib/identity");
            await autoLinkCheckoutIdentity(session.nostr_pubkey, session.teneo_user_id);
            await supabase
              .from("checkout_sessions")
              .update({ identity_linked: true })
              .eq("id", sessionId);
          } catch {
            // Silent — webhook must never fail due to identity linking
          }
        }

        // Trigger merchant webhooks for payment.completed (fire-and-forget)
        if (session.merchant_id) {
            triggerPaymentWebhooks(
                session.merchant_id,
                sessionId,
                session.amount_sats ?? 0,
                "payment.completed",
                { memo: session.memo }
            );
        }

        // Send Telegram notification to merchant (fire-and-forget, never blocks payment)
        if (session.merchant_id) {
            sendTelegramNotificationForMerchant(
                session.merchant_id,
                session.amount_sats ?? 0,
                session.memo ?? null
            ).catch(() => {/* silent */});
        }

        // Send payment notification emails (fire-and-forget, never blocks webhook)
        if (session.merchant_id) {
            sendPaymentNotificationEmails(
                session.merchant_id,
                session.amount_sats ?? 0,
                sessionId,
                session.paid_at ?? new Date().toISOString(),
                session.customer_email ?? session.shipping_data?.email ?? null
            ).catch(() => {/* silent */});
        }

        // Auto-forward payment to merchant's Lightning Address (fire-and-forget)
        // This is the "hot potato" custody model — funds leave ArxMint in seconds
        if (session.merchant_id) {
            autoForwardToMerchant(supabase, session.merchant_id, session.amount_sats ?? 0, sessionId)
                .catch(() => {/* silent — never block webhook */});
        }

        // Auto-submit to BTCMap on merchant's first payment (fire-and-forget)
        if (session.merchant_id) {
            submitToBtcMapOnFirstPayment(supabase, session.merchant_id)
                .catch(() => {/* silent — never block webhook */});
        }

        const invoice = await db.invoice.findUnique({
            where: { paymentSessionId: sessionId },
            include: {
                lineItems: {
                    orderBy: { sortOrder: "asc" },
                },
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
                    lineItems: {
                        orderBy: { sortOrder: "asc" },
                    },
                },
            });

            await emitInvoiceStateChanged({
                invoice: updatedInvoice,
                previousStatus,
                lineItems: updatedInvoice.lineItems,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        logger.error("Webhook processing error", {
            error: error instanceof Error ? error.message : String(error)
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ---- Telegram helpers ----

interface MerchantRow {
  businessName?: string;
  telegram_chat_id?: string | null;
}

/**
 * Look up merchant's Telegram chat ID and send a payment notification.
 * Tries Supabase first, falls back to seed-merchant names.
 * Always fire-and-forget — never throws.
 */
async function sendTelegramNotificationForMerchant(
    merchantId: string,
    amountSats: number,
    memo: string | null
): Promise<void> {
    let merchantName = merchantId;
    let telegramChatId: string | null = null;

    // Seed merchant display names
    const SEED_NAMES: Record<string, string> = {
        "seed-black-bear": "Black Bear Window Cleaning",
        "seed-glacier": "The Ice Cream Parlor by Glacier",
        "seed-teneo": "Teneo",
        "arxmint-store": "ArxMint Store",
    };
    if (SEED_NAMES[merchantId]) merchantName = SEED_NAMES[merchantId];

    // Try Supabase for name + telegram_chat_id
    try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
            .from("merchant_pledges")
            .select("businessName, telegram_chat_id")
            .eq("id", merchantId)
            .single();

        const row = data as MerchantRow | null;
        if (row) {
            if (row.businessName) merchantName = row.businessName;
            if (row.telegram_chat_id) telegramChatId = row.telegram_chat_id;
        }
    } catch {
        // DB unavailable — no Telegram chat ID
    }

    if (!telegramChatId) return;

    const message = await formatPaymentMessage(amountSats, merchantName, memo);
    await sendTelegramNotification(telegramChatId, message);
}

// ---- BTCMap auto-submit on first payment ----

/**
 * Check if this is the merchant's first paid checkout session.
 * If so, fire a BTCMap submission request (non-blocking).
 */
async function submitToBtcMapOnFirstPayment(
    _supabase: unknown,
    merchantId: string
): Promise<void> {
    // Re-import supabase to avoid deep type instantiation from chained generics
    const { supabase: sb } = await import("@/lib/supabase");

    // Count paid sessions for this merchant — if more than 1, it's not the first
    const { data: sessions, error } = await sb
        .from("checkout_sessions")
        .select("id")
        .eq("merchant_id", merchantId)
        .eq("status", "paid")
        .limit(2);

    if (error || !sessions) return;

    // Only proceed if this is the first (or possibly second due to race) paid session
    if (sessions.length > 2) return;

    try {
        const origin = process.env.NEXT_PUBLIC_APP_URL || "https://arxmint.com";
        await fetch(`${origin}/api/btcmap/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merchantId }),
        });
        logger.info("btcmap_first_payment_submit_triggered", { merchantId });
    } catch {
        // Silent — BTCMap submission is best-effort
    }
}

// ---- Payment notification email helpers ----

/**
 * Fetch BTC/USD price from mempool.space (best-effort).
 * Returns null on any failure — caller must handle gracefully.
 */
async function fetchBtcPriceUsd(): Promise<number | null> {
    try {
        const res = await fetch("https://mempool.space/api/v1/prices", {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.USD === "number" ? data.USD : null;
    } catch {
        return null;
    }
}

/**
 * Look up merchant info and send payment notification emails.
 * - Always sends to merchant if email is on file.
 * - Sends receipt to customer only if customerEmail is provided.
 * Always fire-and-forget — never throws.
 */
async function sendPaymentNotificationEmails(
    merchantId: string,
    amountSats: number,
    sessionId: string,
    paidAt: string,
    customerEmail: string | null
): Promise<void> {
    // Seed merchant display names + emails
    const SEED_MERCHANTS: Record<string, { name: string; email?: string }> = {
        "seed-black-bear": { name: "Black Bear Window Cleaning" },
        "seed-glacier": { name: "The Ice Cream Parlor by Glacier" },
        "seed-teneo": { name: "Teneo" },
        "arxmint-store": { name: "ArxMint Store" },
    };

    let merchantName = SEED_MERCHANTS[merchantId]?.name ?? merchantId;
    let merchantEmail: string | null = null;

    // Look up merchant from Supabase
    try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
            .from("merchant_pledges")
            .select("businessName, email")
            .eq("id", merchantId)
            .single();

        if (data) {
            if (data.businessName) merchantName = data.businessName;
            if (data.email) merchantEmail = data.email;
        }
    } catch {
        // DB unavailable
    }

    // Fetch BTC price for USD conversion
    const btcPrice = await fetchBtcPriceUsd();
    const amountUsd = btcPrice
        ? ((amountSats / 100_000_000) * btcPrice).toFixed(2)
        : null;

    const emailData = {
        merchantName,
        amountSats,
        amountUsd,
        sessionId,
        paidAt,
    };

    // Send merchant notification
    if (merchantEmail) {
        sendPaymentReceivedEmail({ ...emailData, to: merchantEmail })
            .catch(() => {/* silent */});
    }

    // Send customer receipt (only if email available)
    if (customerEmail) {
        sendPaymentReceiptEmail({ ...emailData, to: customerEmail })
            .catch(() => {/* silent */});
    }
}

/**
 * Auto-forward payment to merchant's Lightning Address.
 * Implements "hot potato" custody — funds leave ArxMint in seconds.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoForwardToMerchant(supabase: any, merchantId: string, amountSats: number, sessionId: string) {
    if (!amountSats || amountSats < 1) return;

    // Look up merchant's wallet and payout address
    const { data: wallet } = await supabase
        .from("merchant_wallets")
        .select("lnbits_admin_key, payout_address, payout_type, auto_forward_enabled")
        .eq("merchant_id", merchantId)
        .single();

    if (!wallet?.payout_address || !wallet?.lnbits_admin_key) {
        logger.info("auto_forward_skipped", { merchantId, reason: "no payout address or wallet" });
        return;
    }

    if (wallet.auto_forward_enabled === false) {
        logger.info("auto_forward_skipped", { merchantId, reason: "auto_forward disabled" });
        return;
    }

    if (wallet.payout_type !== "lightning_address") {
        logger.info("auto_forward_skipped", { merchantId, reason: `payout_type=${wallet.payout_type}, only lightning_address supported` });
        return;
    }

    const { forwardPaymentToMerchant } = await import("@/lib/lnbits");
    const result = await forwardPaymentToMerchant({
        amountSats,
        lightningAddress: wallet.payout_address,
        walletAdminKey: wallet.lnbits_admin_key,
        memo: `ArxMint forward — session ${sessionId.slice(0, 8)}`,
    });

    if (result.success) {
        logger.info("auto_forward_success", { merchantId, amountSats, lightningAddress: wallet.payout_address });
    } else {
        logger.warn("auto_forward_failed", { merchantId, amountSats, error: result.error });
    }
}
