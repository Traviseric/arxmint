import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { logger } from "@/lib/logger";
import { triggerPaymentWebhooks, deliverWebhook } from "@/lib/webhook-engine";
import { sendTelegramNotification, formatPaymentMessage } from "@/lib/telegram-notify";

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

        // Best-effort identity linking on payment confirmation.
        // Fires when: session has stored identity signals AND has not already been linked.
        // Skipped for privacy_level === 'maximum' sessions.
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
