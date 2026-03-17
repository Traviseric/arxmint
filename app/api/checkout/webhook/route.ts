import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { logger } from "@/lib/logger";
import { triggerPaymentWebhooks } from "@/lib/webhook-engine";

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
