// ============================================================
// ArxMint — Merchant Payment Lifecycle Test
//
// Covers the full payment chain at the unit level:
//   create invoice → simulate payment → verify paid status
//   → webhook delivery → HMAC verification → SSE code-path audit
//
// These tests do NOT spin up an HTTP server. Instead they call
// library functions directly with mocked fetch/DB, proving each
// link in the chain works before the full integration stack.
//
// Run: node --experimental-strip-types --test tests/lifecycle/merchant-payment-lifecycle.test.ts
// ============================================================

import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register extended resolver: handles @/ alias AND extensionless relative .ts imports
// (e.g. lib/lnbits.ts does `import { logger } from "./logger"` without extension)
register(new URL("../helpers/ts-resolver.mjs", import.meta.url));

// LNbits mock helpers (TypeScript — loaded via strip-types)
// @ts-ignore
const {
  mockCreateInvoice,
  simulatePaymentReceived,
  resetLNbitsMock,
  createLNbitsMockFetch,
} = await import("../helpers/lnbits-mock.ts");

// Webhook engine (uses @/lib/logger → needs at-resolver above)
// @ts-ignore
const {
  buildWebhookSignature,
  verifyWebhookSignature,
  deliverWebhook,
} = await import("../../lib/webhook-engine.ts");

// LNbits client
// @ts-ignore
const {
  createLNbitsInvoice,
  checkLNbitsPayment,
} = await import("../../lib/lnbits.ts");

// ---- Shared state across steps ----

interface LifecycleState {
  paymentHash: string;
  paymentRequest: string;
  sessionId: string;
  webhookDeliveries: Array<{ status: string; attempts: number; lastStatus: number }>;
}

// ============================================================
// Step 1: Create Invoice
// Proves createLNbitsInvoice() returns a valid BOLT11 string
// when LNbits is reachable (mocked).
// ============================================================

test("lifecycle step 1 — createLNbitsInvoice() returns invoice for merchant checkout", async () => {
  resetLNbitsMock();
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = createLNbitsMockFetch();
  // Provide mock env vars
  process.env.LNBITS_URL = "http://mock-lnbits.test";
  process.env.LNBITS_INVOICE_KEY = "mock_invoice_key_test";

  try {
    const result = await createLNbitsInvoice({
      amount: 100,
      memo: "POS sale — Test Merchant",
    });

    assert.ok(result !== null, "should return an invoice object");
    assert.ok(result!.paymentHash.length > 0, "paymentHash should be non-empty");
    assert.ok(result!.paymentRequest.startsWith("lnbc"), "paymentRequest should start with lnbc");
    assert.ok(result!.checkingId.length > 0, "checkingId should be non-empty");
  } finally {
    global.fetch = origFetch;
    delete process.env.LNBITS_URL;
    delete process.env.LNBITS_INVOICE_KEY;
  }
});

// ============================================================
// Step 2: Simulate Payment Received
// Proves simulatePaymentReceived() marks the invoice as paid
// and checkLNbitsPayment() reflects the new state.
// ============================================================

test("lifecycle step 2 — simulatePaymentReceived() + checkLNbitsPayment() returns paid: true", async () => {
  resetLNbitsMock();
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = createLNbitsMockFetch();
  process.env.LNBITS_URL = "http://mock-lnbits.test";
  process.env.LNBITS_INVOICE_KEY = "mock_invoice_key_test";

  try {
    // Create invoice
    const created = await createLNbitsInvoice({ amount: 100, memo: "Test payment" });
    assert.ok(created, "invoice should be created");
    const { paymentHash } = created!;

    // Before payment: should be unpaid
    const before = await checkLNbitsPayment({ paymentHash });
    assert.equal(before.paid, false, "invoice should be unpaid before simulation");

    // Simulate LNbits receiving the payment
    simulatePaymentReceived(paymentHash);

    // After payment: should be paid
    const after = await checkLNbitsPayment({ paymentHash });
    assert.equal(after.paid, true, "invoice should be paid after simulatePaymentReceived()");
    assert.ok(after.preimage !== null, "preimage should be set after payment");
  } finally {
    global.fetch = origFetch;
    delete process.env.LNBITS_URL;
    delete process.env.LNBITS_INVOICE_KEY;
    resetLNbitsMock();
  }
});

// ============================================================
// Step 3: Webhook Delivery
// Proves deliverWebhook() sends payment.completed to the
// merchant's registered endpoint after payment is confirmed.
// ============================================================

test("lifecycle step 3 — webhook delivers payment.completed after payment confirmed", async () => {
  const WEBHOOK_SECRET = "whsec_lifecycle_test_secret";
  const MERCHANT_ID = "seed-black-bear";
  const SESSION_ID = "sess_lifecycle_test_001";
  const AMOUNT_SATS = 100;

  let capturedUrl = "";
  let capturedBody = "";
  let capturedHeaders: Record<string, string> = {};

  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async (url: string, opts: { headers: Record<string, string>; body: string }) => {
    capturedUrl = url;
    capturedHeaders = opts.headers;
    capturedBody = opts.body;
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  };

  try {
    const payload = {
      id: `wdlv_lifecycle_${SESSION_ID.slice(0, 8)}`,
      event: "payment.completed" as const,
      created: Math.floor(Date.now() / 1000),
      data: {
        paymentId: SESSION_ID,
        amount: AMOUNT_SATS,
        merchantId: MERCHANT_ID,
        metadata: { source: "pos" },
      },
    };

    const endpoint = {
      id: "wh_lifecycle_test_endpoint",
      merchantId: MERCHANT_ID,
      url: "https://merchant.example.com/webhook",
      secret: WEBHOOK_SECRET,
      events: ["payment.completed" as const],
      active: true,
      createdAt: Date.now(),
    };

    const result = await deliverWebhook(endpoint, payload);

    assert.equal(result.success, true, "webhook delivery should succeed");
    assert.equal(result.attempts, 1, "should deliver in 1 attempt");
    assert.equal(result.lastStatus, 200, "should receive HTTP 200 from endpoint");
    assert.equal(capturedUrl, "https://merchant.example.com/webhook");
    assert.ok(capturedHeaders["ArxMint-Signature"], "ArxMint-Signature header must be present");
    assert.equal(capturedHeaders["ArxMint-Webhook-Event"], "payment.completed");
    assert.ok(capturedBody.includes(SESSION_ID), "body should contain the session ID");
  } finally {
    global.fetch = origFetch;
  }
});

// ============================================================
// Step 4: HMAC Signature Verification
// Proves the ArxMint-Signature on the delivered webhook
// correctly verifies with the endpoint secret.
// ============================================================

test("lifecycle step 4 — delivered webhook signature verifies with endpoint secret", async () => {
  const WEBHOOK_SECRET = "whsec_lifecycle_hmac_test_secret";

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
    const payload = {
      id: "wdlv_hmac_test_001",
      event: "payment.completed" as const,
      created: Math.floor(Date.now() / 1000),
      data: {
        paymentId: "sess_hmac_test",
        amount: 500,
        merchantId: "seed-glacier",
        metadata: { source: "pos" },
      },
    };

    const endpoint = {
      id: "wh_hmac_test",
      merchantId: "seed-glacier",
      url: "https://pos.example.com/webhook",
      secret: WEBHOOK_SECRET,
      events: ["payment.completed" as const],
      active: true,
      createdAt: Date.now(),
    };

    await deliverWebhook(endpoint, payload);

    // Simulate what the merchant receiver does: verify the signature
    const valid = verifyWebhookSignature(capturedBody, capturedSignature, WEBHOOK_SECRET);
    assert.equal(valid, true, "delivered webhook signature must verify correctly");

    // Confirm payload structure
    const parsed = JSON.parse(capturedBody) as {
      event: string;
      data: { paymentId: string; amount: number };
    };
    assert.equal(parsed.event, "payment.completed");
    assert.equal(parsed.data.amount, 500);
    assert.equal(parsed.data.paymentId, "sess_hmac_test");
  } finally {
    global.fetch = origFetch;
  }
});

// ============================================================
// Step 5: Webhook delivery log — result carries audit fields
// Proves DeliveryResult reports the correct fields that
// would appear in a delivery log (success, attempts, lastStatus).
// ============================================================

test("lifecycle step 5 — delivery result has correct audit fields for delivery log", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => new Response(JSON.stringify({ received: true }), { status: 200 });

  try {
    const payload = {
      id: "wdlv_audit_test_001",
      event: "payment.completed" as const,
      created: Math.floor(Date.now() / 1000),
      data: {
        paymentId: "sess_audit_test",
        amount: 21,
        merchantId: "seed-teneo",
      },
    };

    const endpoint = {
      id: "wh_audit_test",
      merchantId: "seed-teneo",
      url: "https://teneo.example.com/webhook",
      secret: "whsec_audit_test",
      events: ["payment.completed" as const],
      active: true,
      createdAt: Date.now(),
    };

    const result = await deliverWebhook(endpoint, payload);

    // These are the fields a delivery log would record
    assert.equal(typeof result.success, "boolean", "result.success should be boolean");
    assert.equal(typeof result.attempts, "number", "result.attempts should be number");
    assert.equal(typeof result.lastStatus, "number", "result.lastStatus should be number");
    assert.equal(result.success, true, "delivery should succeed → delivered: true");
    assert.equal(result.attempts, 1);
    assert.equal(result.lastStatus, 200);
  } finally {
    global.fetch = origFetch;
  }
});

// ============================================================
// Step 6: Full chain integration
// Proves the complete lifecycle: invoice created → payment
// simulated → webhook fired → signature verified → log shows success.
// ============================================================

test("lifecycle step 6 — full chain: invoice → pay → webhook → verify → log success", async () => {
  resetLNbitsMock();

  const WEBHOOK_SECRET = "whsec_full_chain_test";
  const MERCHANT_ID = "seed-black-bear";

  let webhookCalled = false;
  let capturedSignature = "";
  let capturedBody = "";

  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = createLNbitsMockFetch(
    async (url: string, opts?: RequestInit): Promise<Response> => {
      // Intercept webhook delivery
      if (String(url).includes("/webhook")) {
        webhookCalled = true;
        capturedSignature = (opts?.headers as Record<string, string>)["ArxMint-Signature"] ?? "";
        capturedBody = (opts?.body as string) ?? "";
        return new Response(JSON.stringify({ received: true, delivered: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }
  );
  process.env.LNBITS_URL = "http://mock-lnbits.test";
  process.env.LNBITS_INVOICE_KEY = "mock_invoice_key_test";

  try {
    // === Step A: Create invoice ===
    const created = await createLNbitsInvoice({
      amount: 1000,
      memo: `POS sale — Black Bear Window Cleaning`,
    });
    assert.ok(created, "invoice creation must succeed");
    const { paymentHash, paymentRequest } = created!;
    assert.ok(paymentRequest.startsWith("lnbc"), "paymentRequest must be BOLT11 format");

    // === Step B: Verify initially unpaid ===
    const beforeStatus = await checkLNbitsPayment({ paymentHash });
    assert.equal(beforeStatus.paid, false, "invoice should be unpaid initially");

    // === Step C: Customer pays (simulate LNbits callback) ===
    simulatePaymentReceived(paymentHash);
    const afterStatus = await checkLNbitsPayment({ paymentHash });
    assert.equal(afterStatus.paid, true, "invoice should be paid after simulation");

    // === Step D: Trigger webhook delivery (as the status poller would) ===
    const sessionId = "sess_full_chain_001";
    const webhookPayload = {
      id: `wdlv_${sessionId.slice(0, 8)}`,
      event: "payment.completed" as const,
      created: Math.floor(Date.now() / 1000),
      data: {
        paymentId: sessionId,
        amount: 1000,
        merchantId: MERCHANT_ID,
        metadata: { source: "pos", paymentHash },
      },
    };

    const endpoint = {
      id: "wh_full_chain",
      merchantId: MERCHANT_ID,
      url: "https://merchant.example.com/webhook",
      secret: WEBHOOK_SECRET,
      events: ["payment.completed" as const],
      active: true,
      createdAt: Date.now(),
    };

    const deliveryResult = await deliverWebhook(endpoint, webhookPayload);

    // === Step E: Verify delivery ===
    assert.equal(webhookCalled, true, "webhook endpoint should have been called");
    assert.equal(deliveryResult.success, true, "delivery must succeed");
    assert.equal(deliveryResult.lastStatus, 200);

    // === Step F: Verify HMAC signature (merchant receiver perspective) ===
    const sigValid = verifyWebhookSignature(capturedBody, capturedSignature, WEBHOOK_SECRET);
    assert.equal(sigValid, true, "HMAC signature on delivered webhook must be valid");

    // === Step G: Delivery log check ===
    const deliveryLog = {
      sessionId,
      delivered: deliveryResult.success,
      attempts: deliveryResult.attempts,
      httpStatus: deliveryResult.lastStatus,
    };
    assert.equal(deliveryLog.delivered, true, "delivery log: delivered should be true");
    assert.equal(deliveryLog.attempts, 1, "delivery log: attempts should be 1");
    assert.equal(deliveryLog.httpStatus, 200, "delivery log: HTTP status should be 200");
  } finally {
    global.fetch = origFetch;
    delete process.env.LNBITS_URL;
    delete process.env.LNBITS_INVOICE_KEY;
    resetLNbitsMock();
  }
});

// ============================================================
// Step 7: POS SSE integration code-path audit
// The POS terminal at /pos/[merchant-id] uses EventSource to
// subscribe to /api/checkout/status/:sessionId. This test verifies
// the SSE URL construction is correct by reading the source.
//
// Note: EventSource is browser-only — cannot be called in Node.js
// test runner. This test documents the integration contract instead.
// ============================================================

test("lifecycle step 7 — POS SSE integration: EventSource URL is /api/checkout/status/:sessionId", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");

  const posSource = readFileSync(
    resolve(process.cwd(), "app/pos/[merchant-id]/page.tsx"),
    "utf-8"
  );

  // Verify the SSE EventSource line exists and uses the correct URL pattern
  assert.ok(
    posSource.includes("new EventSource(`/api/checkout/status/${sessionId}`)"),
    "POS page must subscribe to SSE at /api/checkout/status/${sessionId}"
  );

  // Verify it handles both 'paid' and 'expired' states
  assert.ok(
    posSource.includes(`data.status === "paid"`),
    "POS SSE handler must transition to paid state on payment"
  );
  assert.ok(
    posSource.includes(`data.status === "expired"`),
    "POS SSE handler must transition to expired state on timeout"
  );

  // Verify cleanup: EventSource is closed on terminal state
  assert.ok(
    posSource.includes("es.close()"),
    "POS SSE handler must close EventSource on terminal state to prevent leaks"
  );
});

// ============================================================
// Step 8: createLNbitsInvoice() returns null when unconfigured
// Proves the 503 LNBITS_NOT_CONFIGURED guard in the checkout API
// is backed by real null-return behavior from the library.
// ============================================================

test("lifecycle step 8 — createLNbitsInvoice() returns null when env vars are absent", async () => {
  // Ensure env vars are not set
  const savedUrl = process.env.LNBITS_URL;
  const savedKey = process.env.LNBITS_INVOICE_KEY;
  delete process.env.LNBITS_URL;
  delete process.env.LNBITS_INVOICE_KEY;

  try {
    const result = await createLNbitsInvoice({ amount: 100, memo: "test" });
    assert.equal(result, null, "should return null when LNBITS_URL / LNBITS_INVOICE_KEY are missing");
  } finally {
    if (savedUrl) process.env.LNBITS_URL = savedUrl;
    if (savedKey) process.env.LNBITS_INVOICE_KEY = savedKey;
  }
});
