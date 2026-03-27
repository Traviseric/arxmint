// ============================================================
// ArxMint — Bazaar Fulfillment E2E Tests
//
// Proves the checkout → webhook → fulfillment delivery loop works
// end-to-end using the webhook engine's signing and delivery primitives.
//
// Tests:
//   1. HMAC signature round-trip for bazaar fulfillment payloads
//   2. deliverWebhook() sends to a custom fulfillmentUrl
//   3. Delivered payload carries source: 'bazaar' metadata
//   4. Delivery result reports delivered: true
//   5. Signature verification matches what test-webhook route expects
//   6. Tampered bazaar payload fails signature verification
//   7. deliverWebhook() fails after 3 attempts when fulfillment URL is down
// ============================================================

import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const {
    buildWebhookSignature,
    verifyWebhookSignature,
    deliverWebhook,
} = await import("../lib/webhook-engine.ts");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BAZAAR_SECRET = "whsec_bazaar_test_secret_1234567890";
const FULFILLMENT_URL = "https://merchant.example.com/bazaar/fulfillment";

/** Build a Bazaar-style payment.completed payload */
function makeBazaarPayload(overrides: Partial<{ sessionId: string; amountSats: number; merchantId: string }> = {}) {
    const sessionId = overrides.sessionId ?? "sess_bazaar_test_001";
    return {
        id: `wdlv_bazaar_${sessionId.slice(0, 8)}`,
        event: "payment.completed" as const,
        created: Math.floor(Date.now() / 1000),
        data: {
            paymentId: sessionId,
            amount: overrides.amountSats ?? 1000,
            merchantId: overrides.merchantId ?? "arxmint-store",
            metadata: {
                source: "bazaar",
                memo: "Test Bazaar Order",
            },
        },
    };
}

/** Build a synthetic endpoint pointing at a custom fulfillmentUrl */
function makeFulfillmentEndpoint(url = FULFILLMENT_URL, secret = BAZAAR_SECRET) {
    return {
        id: "bazaar_fulfillment_endpoint_test",
        merchantId: "arxmint-store",
        url,
        secret,
        events: ["payment.completed" as const],
        active: true,
        createdAt: Date.now(),
    };
}

// ---------------------------------------------------------------------------
// 1. HMAC round-trip for bazaar payload
// ---------------------------------------------------------------------------

test("bazaar: buildWebhookSignature() + verifyWebhookSignature() round-trip succeeds", () => {
    const payload = makeBazaarPayload();
    const header = buildWebhookSignature(payload, BAZAAR_SECRET);
    const rawBody = JSON.stringify(payload);
    const valid = verifyWebhookSignature(rawBody, header, BAZAAR_SECRET);
    assert.equal(valid, true, "bazaar HMAC round-trip should verify successfully");
});

// ---------------------------------------------------------------------------
// 2. deliverWebhook() sends to the fulfillmentUrl (custom URL, not merchant registry)
// ---------------------------------------------------------------------------

test("bazaar: deliverWebhook() delivers to custom fulfillmentUrl and succeeds", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = async (url: string, opts: { headers: Record<string, string>; body: string }) => {
        capturedUrl = url;
        capturedHeaders = opts.headers;
        capturedBody = opts.body;
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    };

    try {
        const payload = makeBazaarPayload();
        const endpoint = makeFulfillmentEndpoint();
        const result = await deliverWebhook(endpoint, payload);

        assert.equal(result.success, true, "delivery should succeed");
        assert.equal(result.attempts, 1, "should succeed in 1 attempt");
        assert.equal(capturedUrl, FULFILLMENT_URL, "should deliver to the fulfillmentUrl");
        assert.ok(capturedHeaders["ArxMint-Signature"], "ArxMint-Signature header should be present");
        assert.equal(capturedHeaders["ArxMint-Webhook-Event"], "payment.completed");
    } finally {
        global.fetch = origFetch;
    }
});

// ---------------------------------------------------------------------------
// 3. Delivered payload contains source: 'bazaar' in metadata
// ---------------------------------------------------------------------------

test("bazaar: delivered payload carries source: 'bazaar' metadata", async () => {
    let capturedBody = "";

    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = async (_url: string, opts: { body: string }) => {
        capturedBody = opts.body;
        return new Response("ok", { status: 200 });
    };

    try {
        const payload = makeBazaarPayload({ sessionId: "sess_source_test", amountSats: 500 });
        const endpoint = makeFulfillmentEndpoint();
        await deliverWebhook(endpoint, payload);

        const parsed = JSON.parse(capturedBody) as {
            data?: { metadata?: { source?: string } };
        };
        assert.equal(
            parsed.data?.metadata?.source,
            "bazaar",
            "payload metadata.source should be 'bazaar'"
        );
    } finally {
        global.fetch = origFetch;
    }
});

// ---------------------------------------------------------------------------
// 4. Delivery result reports success + attempts (the "delivery log")
// ---------------------------------------------------------------------------

test("bazaar: delivery result reports delivered: true and attempts on success", async () => {
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = async () => new Response(JSON.stringify({ received: true, delivered: true }), { status: 200 });

    try {
        const payload = makeBazaarPayload();
        const endpoint = makeFulfillmentEndpoint();
        const result = await deliverWebhook(endpoint, payload);

        assert.equal(result.success, true, "result.success should be true");
        assert.ok(result.attempts >= 1, "result.attempts should be >= 1");
        assert.equal(result.lastStatus, 200, "result.lastStatus should be 200");
    } finally {
        global.fetch = origFetch;
    }
});

// ---------------------------------------------------------------------------
// 5. Signature on delivered payload verifies correctly (matches test-webhook logic)
// ---------------------------------------------------------------------------

test("bazaar: ArxMint-Signature on delivered payload verifies with same secret", async () => {
    let capturedSignature = "";
    let capturedBody = "";

    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = async (_url: string, opts: { headers: Record<string, string>; body: string }) => {
        capturedSignature = opts.headers["ArxMint-Signature"];
        capturedBody = opts.body;
        return new Response("ok", { status: 200 });
    };

    try {
        const payload = makeBazaarPayload({ sessionId: "sess_sig_verify", amountSats: 21 });
        const endpoint = makeFulfillmentEndpoint(FULFILLMENT_URL, BAZAAR_SECRET);
        await deliverWebhook(endpoint, payload);

        // Simulate what the test-webhook route does: verify the received signature
        const valid = verifyWebhookSignature(capturedBody, capturedSignature, BAZAAR_SECRET);
        assert.equal(valid, true, "signature on received payload should verify with the same secret");
    } finally {
        global.fetch = origFetch;
    }
});

// ---------------------------------------------------------------------------
// 6. Tampered bazaar payload fails signature verification
// ---------------------------------------------------------------------------

test("bazaar: tampered fulfillment payload fails signature verification", () => {
    const payload = makeBazaarPayload({ amountSats: 1000 });
    const header = buildWebhookSignature(payload, BAZAAR_SECRET);

    // Attacker changes the amount
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.amount = 1; // changed amount
    const tamperedBody = JSON.stringify(tampered);

    const valid = verifyWebhookSignature(tamperedBody, header, BAZAAR_SECRET);
    assert.equal(valid, false, "tampered amount should fail signature verification");
});

// ---------------------------------------------------------------------------
// 7. deliverWebhook() fails after 3 attempts when fulfillment URL is down
// ---------------------------------------------------------------------------

test("bazaar: deliverWebhook() fails after 3 attempts when fulfillment endpoint is down", async () => {
    const origST = global.setTimeout;
    // @ts-ignore
    global.setTimeout = (fn: () => void) => origST(fn, 0); // skip retry delays

    const origFetch = global.fetch;
    let callCount = 0;
    // @ts-ignore
    global.fetch = async () => {
        callCount++;
        throw new Error("ECONNREFUSED: fulfillment server is down");
    };

    try {
        const payload = makeBazaarPayload();
        const endpoint = makeFulfillmentEndpoint();
        const result = await deliverWebhook(endpoint, payload);

        assert.equal(result.success, false, "should fail when endpoint is down");
        assert.equal(result.attempts, 3, "should retry 3 times");
        assert.equal(callCount, 3, "fetch should be called 3 times");
        assert.ok(
            result.error?.includes("ECONNREFUSED"),
            "error should describe the connection failure"
        );
    } finally {
        global.fetch = origFetch;
        global.setTimeout = origST;
    }
});
