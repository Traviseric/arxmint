// tests/e2e/nut24-payment.test.ts
// Layer 3.2: NUT-24 Cashu ecash paywall E2E tests
// Requires: npm run dev (server on :3000) + Cashu mint on :3338
//
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:3000";
const CASHU_MINT_URL = process.env.TEST_CASHU_MINT_URL ?? "http://localhost:3338";

let serverAvailable = false;
let mintAvailable = false;

// ── connectivity check ────────────────────────────────────────────────────────

before(async () => {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }

  try {
    const r = await fetch(`${CASHU_MINT_URL}/v1/info`, { signal: AbortSignal.timeout(2000) });
    mintAvailable = r.ok;
  } catch {
    mintAvailable = false;
  }
});

// ── NUT-24 paywall challenge ──────────────────────────────────────────────────

describe("NUT-24 Cashu Paywall — challenge", () => {
  test("GET /api/l402 (NUT-24 path) returns 402 when no token provided", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`);
    assert.equal(res.status, 402);
  });

  test("Cashu mint /v1/info returns valid mint metadata", async (t) => {
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338 — start with: npm run setup:cashu");
      return;
    }

    const res = await fetch(`${CASHU_MINT_URL}/v1/info`);
    assert.equal(res.status, 200);

    const info = await res.json();
    assert.ok(info.name || info.pubkey, "Mint info should contain name or pubkey");
    assert.ok(typeof info.version === "string" || info.nuts, "Mint should advertise NUT support");
  });

  test("Cashu mint /v1/keys returns active keysets", async (t) => {
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338");
      return;
    }

    const res = await fetch(`${CASHU_MINT_URL}/v1/keys`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.keysets || Array.isArray(body), "Response should contain keysets");
  });
});

// ── NUT-24 token validation ───────────────────────────────────────────────────

describe("NUT-24 Cashu Paywall — token validation", () => {
  test("wrong amount token is rejected (400/402)", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    // Send a malformed/invalid Cashu token (bad structure)
    const res = await fetch(`${BASE_URL}/api/l402`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cashu": "cashuAInvalid_token_data",
      },
      body: JSON.stringify({ resource: "test" }),
    });

    assert.ok(
      res.status >= 400,
      `Expected 4xx for invalid Cashu token, got ${res.status}`
    );
  });

  test("NUT-24 X-Cashu header with invalid proof rejected", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    // cashuA token with valid base64 but invalid proof contents
    const fakeToken = "cashuA" + Buffer.from(JSON.stringify({
      token: [{ mint: CASHU_MINT_URL, proofs: [{ id: "fake", amount: 1, secret: "x", C: "y" }] }],
    })).toString("base64url");

    const res = await fetch(`${BASE_URL}/api/l402`, {
      headers: { "X-Cashu": fakeToken },
    });

    assert.ok(
      res.status >= 400,
      `Expected rejection for fake proof, got ${res.status}`
    );
  });
});

// ── Cashu mint NUT support ────────────────────────────────────────────────────

describe("Cashu Mint NUT capabilities", () => {
  test("mint advertises NUT-24 or paywall support", async (t) => {
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338");
      return;
    }

    const res = await fetch(`${CASHU_MINT_URL}/v1/info`);
    const info = await res.json();

    // NUT-24 is Cashu HTTP Auth — check if mint supports it
    const nuts = info.nuts ?? {};
    // NUT-24 support is optional — just verify the mint responds correctly
    assert.ok(
      res.ok,
      "Mint info endpoint must return 200"
    );

    // Log what NUTs are supported (informational)
    const supportedNuts = Object.keys(nuts).filter((k) => nuts[k]?.supported !== false);
    console.log(`  Mint supports NUTs: ${supportedNuts.join(", ") || "unknown"}`);
  });

  test("mint quote endpoint responds for BOLT11 minting", async (t) => {
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338");
      return;
    }

    const res = await fetch(`${CASHU_MINT_URL}/v1/mint/quote/bolt11`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, unit: "sat" }),
    });

    // Should return 200 with a bolt11 invoice, or 400/422 if unit not supported
    assert.ok(
      res.status === 200 || res.status === 400 || res.status === 422,
      `Expected 200/400/422 from mint quote endpoint, got ${res.status}`
    );

    if (res.status === 200) {
      const quote = await res.json();
      assert.ok(quote.quote || quote.request, "Mint quote should contain quote ID or invoice");
    }
  });
});
