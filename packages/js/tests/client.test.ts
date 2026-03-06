import { test, mock } from "node:test";
import assert from "node:assert/strict";

// Mock checkout.js before importing client.ts.
// The packages/js source uses ESM .js extensions in imports (TypeScript ESM pattern),
// but the Node experimental strip-types runner requires explicit .ts extensions.
// mock.module intercepts by resolved path, so this stubs the otherwise-unresolvable
// checkout.js import inside client.ts.
await mock.module("../src/checkout.js", {
  namedExports: {
    createCheckout: async () => {
      throw new Error("createCheckout: mock — should not be called in unit tests");
    },
    listPayments: async () => {
      throw new Error("listPayments: mock — should not be called in unit tests");
    },
    pollStatus: async () => {
      throw new Error("pollStatus: mock — should not be called in unit tests");
    },
  },
});

// Dynamically import after mock is registered
const { ArxMintClient } = await import("../src/client.ts");
const { verifyWebhookSignature } = await import("../src/webhook.ts");

// ---- ArxMintClient constructor validation ----

test("ArxMintClient constructor throws on missing apiKey", () => {
  assert.throws(
    () => new ArxMintClient({ apiKey: "" }),
    /apiKey is required/
  );
});

test("ArxMintClient constructor throws when apiKey is undefined", () => {
  assert.throws(
    // @ts-ignore — intentionally passing bad config for test
    () => new ArxMintClient({}),
    /apiKey is required/
  );
});

test("ArxMintClient constructor succeeds with valid apiKey", () => {
  const client = new ArxMintClient({ apiKey: "arx_live_abc123" });
  assert.ok(client instanceof ArxMintClient);
});

// ---- API key scope guard (listPayments requires arx_live_ prefix) ----

test("listPayments() throws on non-live key (no arx_live_ prefix)", async () => {
  const client = new ArxMintClient({ apiKey: "arx_test_xyz" });
  await assert.rejects(
    () => client.listPayments(),
    /live API key/
  );
});

test("listPayments() throws on public key", async () => {
  const client = new ArxMintClient({ apiKey: "pk_arxmint_abc" });
  await assert.rejects(
    () => client.listPayments(),
    /arx_live_/
  );
});

// ---- createCheckout amount validation ----

test("createCheckout() rejects zero amount", async () => {
  const client = new ArxMintClient({ apiKey: "arx_live_abc" });
  await assert.rejects(
    () => client.createCheckout({ amount: 0 }),
    /positive integer/
  );
});

test("createCheckout() rejects negative amount", async () => {
  const client = new ArxMintClient({ apiKey: "arx_live_abc" });
  await assert.rejects(
    () => client.createCheckout({ amount: -100 }),
    /positive integer/
  );
});

// ---- verifyWebhookSignature HMAC round-trip ----

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

test("verifyWebhookSignature() round-trip: sign + verify succeeds", async () => {
  const payload = JSON.stringify({ event: "payment.paid", amount: 1000 });
  const secret = "whsec_test_supersecret";
  const signature = await signPayload(payload, secret);
  const valid = await verifyWebhookSignature(payload, signature, secret);
  assert.equal(valid, true);
});

test("verifyWebhookSignature() rejects tampered payload", async () => {
  const payload = JSON.stringify({ event: "payment.paid", amount: 1000 });
  const secret = "whsec_test_supersecret";
  const signature = await signPayload(payload, secret);
  const tampered = JSON.stringify({ event: "payment.paid", amount: 9999 });
  const valid = await verifyWebhookSignature(tampered, signature, secret);
  assert.equal(valid, false);
});

test("verifyWebhookSignature() rejects wrong secret", async () => {
  const payload = JSON.stringify({ event: "payment.paid", amount: 1000 });
  const signature = await signPayload(payload, "correct_secret");
  const valid = await verifyWebhookSignature(payload, signature, "wrong_secret");
  assert.equal(valid, false);
});

test("verifyWebhookSignature() returns false for malformed signature hex", async () => {
  const valid = await verifyWebhookSignature("payload", "not-hex!!!", "secret");
  assert.equal(valid, false);
});
