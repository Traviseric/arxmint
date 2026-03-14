import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register a custom resolve hook that maps TypeScript path alias @/* to the
// project root, enabling webhook-engine.ts (which imports "@/lib/logger") to
// load in the Node.js test runner.
// Supabase (@/lib/supabase) is only imported dynamically inside functions with
// try-catch, so it will fail gracefully — in-memory fallback is used.
register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const {
  buildWebhookSignature,
  verifyWebhookSignature,
  deliverWebhook,
} = await import("../lib/webhook-engine.ts");

type WebhookEvent = "payment.completed" | "payment.expired" | "payment.failed";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A minimal WebhookPayload for testing */
function makePayload(overrides: Partial<{
  id: string;
  event: string;
  created: number;
}> = {}) {
  return {
    id: overrides.id ?? "wdlv_test001",
    event: overrides.event ?? "payment.completed",
    created: overrides.created ?? Math.floor(Date.now() / 1000),
    data: {
      paymentId: "pay-abc",
      amount: 1000,
      merchantId: "merchant-xyz",
    },
  };
}

/** An active WebhookEndpoint subscribed to payment.completed */
function makeEndpoint(overrides: Partial<{
  active: boolean;
  events: WebhookEvent[];
  url: string;
  secret: string;
}> = {}) {
  return {
    id: "wh_test_endpoint",
    merchantId: "merchant-xyz",
    url: overrides.url ?? "https://merchant.example.com/webhook",
    secret: overrides.secret ?? "whsec_testsecret1234567890",
    events: overrides.events ?? ["payment.completed"] as WebhookEvent[],
    active: overrides.active ?? true,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// buildWebhookSignature() + verifyWebhookSignature() — round-trip
// ---------------------------------------------------------------------------

test("buildWebhookSignature() + verifyWebhookSignature() round-trip succeeds", () => {
  const payload = makePayload();
  const secret = "whsec_test_round_trip_secret";
  const header = buildWebhookSignature(payload, secret);
  const rawBody = JSON.stringify(payload);
  const valid = verifyWebhookSignature(rawBody, header, secret);
  assert.equal(valid, true, "signature should verify successfully");
});

test("buildWebhookSignature() returns a header in 't=<ts>,v1=<hex>' format", () => {
  const payload = makePayload();
  const header = buildWebhookSignature(payload, "secret");
  assert.ok(header.includes("t="), "header should contain t= timestamp component");
  assert.ok(header.includes("v1="), "header should contain v1= HMAC component");
  // v1 component should be hex string
  const v1Match = header.match(/v1=([a-f0-9]+)/);
  assert.ok(v1Match, "v1 value should be a hex string");
  assert.equal(v1Match![1].length, 64, "SHA-256 HMAC should be 64 hex chars");
});

test("verifyWebhookSignature() returns false for tampered body", () => {
  const payload = makePayload();
  const secret = "whsec_test_tamper";
  const header = buildWebhookSignature(payload, secret);
  const tamperedBody = JSON.stringify(payload) + "tampered";
  const valid = verifyWebhookSignature(tamperedBody, header, secret);
  assert.equal(valid, false, "tampered body should fail verification");
});

test("verifyWebhookSignature() returns false for wrong secret", () => {
  const payload = makePayload();
  const header = buildWebhookSignature(payload, "correct-secret");
  const rawBody = JSON.stringify(payload);
  const valid = verifyWebhookSignature(rawBody, header, "wrong-secret");
  assert.equal(valid, false, "wrong secret should fail verification");
});

test("verifyWebhookSignature() returns false for malformed header (no t= component)", () => {
  const payload = makePayload();
  const rawBody = JSON.stringify(payload);
  const valid = verifyWebhookSignature(rawBody, "v1=abc123", "secret");
  assert.equal(valid, false, "header without t= should fail");
});

test("verifyWebhookSignature() returns false for malformed header (no v1= component)", () => {
  const payload = makePayload();
  const rawBody = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const valid = verifyWebhookSignature(rawBody, `t=${ts}`, "secret");
  assert.equal(valid, false, "header without v1= should fail");
});

test("verifyWebhookSignature() returns false for expired timestamp (> 5 minutes old)", () => {
  const old = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago (> 300s tolerance)
  const payload = makePayload({ created: old });
  const rawBody = JSON.stringify(payload);
  const secret = "whsec_test_clock";
  const header = buildWebhookSignature(payload, secret);
  const valid = verifyWebhookSignature(rawBody, header, secret);
  assert.equal(valid, false, "stale timestamp should fail verification");
});

// ---------------------------------------------------------------------------
// deliverWebhook() — skip / fast-path cases
// ---------------------------------------------------------------------------

test("deliverWebhook() returns success=false immediately for inactive endpoint", async () => {
  const endpoint = makeEndpoint({ active: false });
  const payload = makePayload();
  const result = await deliverWebhook(endpoint, payload);
  assert.equal(result.success, false);
  assert.equal(result.attempts, 0, "should not attempt delivery for inactive endpoint");
  assert.ok(result.error?.toLowerCase().includes("inactive"), "error should mention inactive");
});

test("deliverWebhook() skips silently when event is not subscribed", async () => {
  const endpoint = makeEndpoint({ events: ["payment.expired"] });
  const payload = makePayload({ event: "payment.completed" });
  const result = await deliverWebhook(endpoint, payload);
  // Not subscribed — returns success=true, attempts=0 (skip, not error)
  assert.equal(result.success, true, "non-subscribed event should be a silent skip");
  assert.equal(result.attempts, 0, "should make zero attempts for non-subscribed event");
});

test("deliverWebhook() succeeds on first attempt when fetch returns 200", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => new Response("ok", { status: 200 });
  try {
    const endpoint = makeEndpoint();
    const payload = makePayload();
    const result = await deliverWebhook(endpoint, payload);
    assert.equal(result.success, true, "should succeed on 200 response");
    assert.equal(result.attempts, 1, "should succeed in 1 attempt");
    assert.equal(result.lastStatus, 200);
  } finally {
    global.fetch = origFetch;
  }
});

// ---------------------------------------------------------------------------
// deliverWebhook() — retry behavior
// ---------------------------------------------------------------------------

test("deliverWebhook() succeeds on 2nd attempt after 1 failure", async (t) => {
  // Speed up sleep() delays to 0ms so the test doesn't take 5+ seconds
  const origST = global.setTimeout;
  // @ts-ignore
  global.setTimeout = (fn: () => void) => origST(fn, 0);

  const origFetch = global.fetch;
  let callCount = 0;
  // @ts-ignore
  global.fetch = async () => {
    callCount++;
    if (callCount === 1) return new Response("error", { status: 503 });
    return new Response("ok", { status: 200 });
  };

  try {
    const endpoint = makeEndpoint();
    const payload = makePayload();
    const result = await deliverWebhook(endpoint, payload);
    assert.equal(result.success, true, "should succeed on 2nd attempt");
    assert.equal(result.attempts, 2, "should report 2 attempts");
    assert.equal(callCount, 2, "fetch should be called exactly twice");
  } finally {
    global.fetch = origFetch;
    global.setTimeout = origST;
  }
});

test("deliverWebhook() marks webhook as failed after 3 unsuccessful attempts", async () => {
  // Speed up sleep() delays to 0ms so the test completes quickly
  const origST = global.setTimeout;
  // @ts-ignore
  global.setTimeout = (fn: () => void) => origST(fn, 0);

  const origFetch = global.fetch;
  let callCount = 0;
  // @ts-ignore
  global.fetch = async () => {
    callCount++;
    return new Response("server error", { status: 500 });
  };

  try {
    const endpoint = makeEndpoint();
    const payload = makePayload();
    const result = await deliverWebhook(endpoint, payload);
    assert.equal(result.success, false, "should fail after all 3 attempts");
    assert.equal(result.attempts, 3, "should report 3 attempts");
    assert.equal(callCount, 3, "fetch should be called exactly 3 times");
    assert.equal(result.lastStatus, 500);
  } finally {
    global.fetch = origFetch;
    global.setTimeout = origST;
  }
});

test("deliverWebhook() marks webhook as failed after 3 network errors", async () => {
  const origST = global.setTimeout;
  // @ts-ignore
  global.setTimeout = (fn: () => void) => origST(fn, 0);

  const origFetch = global.fetch;
  let callCount = 0;
  // @ts-ignore
  global.fetch = async () => {
    callCount++;
    throw new Error("ECONNREFUSED");
  };

  try {
    const endpoint = makeEndpoint();
    const payload = makePayload();
    const result = await deliverWebhook(endpoint, payload);
    assert.equal(result.success, false);
    assert.equal(result.attempts, 3);
    assert.equal(callCount, 3);
    assert.ok(result.error?.includes("ECONNREFUSED"), "error should include the network error message");
  } finally {
    global.fetch = origFetch;
    global.setTimeout = origST;
  }
});

test("deliverWebhook() sends ArxMint-Signature header with correct format", async () => {
  let capturedHeaders: Record<string, string> = {};
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async (_url: string, opts: { headers: Record<string, string> }) => {
    capturedHeaders = opts.headers;
    return new Response("ok", { status: 200 });
  };

  try {
    const secret = "whsec_header_test_secret";
    const endpoint = makeEndpoint({ secret });
    const payload = makePayload();
    await deliverWebhook(endpoint, payload);
    assert.ok(capturedHeaders["ArxMint-Signature"], "ArxMint-Signature header should be present");
    assert.ok(
      capturedHeaders["ArxMint-Signature"].startsWith("t="),
      "signature header should start with t="
    );
    assert.ok(
      capturedHeaders["ArxMint-Signature"].includes("v1="),
      "signature header should contain v1="
    );
    assert.equal(capturedHeaders["ArxMint-Webhook-Event"], "payment.completed");
  } finally {
    global.fetch = origFetch;
  }
});
