// ============================================================
// ArxMint — Bazaar Test Webhook Receiver
// POST /api/bazaar/test-webhook
//
// Simulates an OpenBazaar fulfillment receiver for end-to-end testing.
// Only active when ARXMINT_BAZAAR_TEST_MODE=true.
//
// Accepts HMAC-signed payloads from /api/checkout/webhook using the
// ArxMint-Signature header (t=<ts>,v1=<hmac_sha256>) scheme.
// Verifies signature, logs fulfillment data, returns 200 + receipt.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook-engine";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    if (process.env.ARXMINT_BAZAAR_TEST_MODE !== "true") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("ArxMint-Signature") ?? "";

    const secret =
        process.env.ARXMINT_BAZAAR_WEBHOOK_SECRET ||
        process.env.ARXMINT_WEBHOOK_SECRET ||
        "development_secret";

    const verified = verifyWebhookSignature(rawBody, signatureHeader, secret);

    if (!verified) {
        logger.warn("bazaar_test_webhook_invalid_signature", {
            signatureHeader: signatureHeader.slice(0, 40),
        });
        return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 403 });
    }

    let payload: unknown;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ verified: false, error: "Invalid JSON body" }, { status: 400 });
    }

    logger.info("bazaar_test_webhook_received", {
        webhookId: (payload as { id?: string }).id,
        event: (payload as { event?: string }).event,
        paymentId: (payload as { data?: { paymentId?: string } }).data?.paymentId,
        amount: (payload as { data?: { amount?: number } }).data?.amount,
        source: (payload as { data?: { metadata?: { source?: string } } }).data?.metadata?.source,
    });

    return NextResponse.json({
        received: true,
        verified: true,
        webhookId: (payload as { id?: string }).id,
        event: (payload as { event?: string }).event,
        delivered: true,
    });
}
