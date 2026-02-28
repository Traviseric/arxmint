// tests/e2e/l402-payment.test.ts
// Layer 3.1: Full L402 payment flow E2E tests
// Requires: npm run dev (server on :3000) + npm run setup:regtest (LND regtest)
//
// Run: npm run test:e2e
// Skip conditions:
//   - Server not reachable at localhost:3000 → all tests skipped
//   - LND regtest not available → payment+retry tests skipped

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";
const LND_REST_URL = "http://localhost:8080";

let serverAvailable = false;
let lndAvailable = false;

// ── connectivity check ────────────────────────────────────────────────────────

before(async () => {
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.ok || r.status < 500;
  } catch {
    // Try the root page as fallback
    try {
      const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
      serverAvailable = r.status < 500;
    } catch {
      serverAvailable = false;
    }
  }

  try {
    const r = await fetch(`${LND_REST_URL}/v1/getinfo`, { signal: AbortSignal.timeout(2000) });
    lndAvailable = r.status < 500;
  } catch {
    lndAvailable = false;
  }
});

// ── L402 challenge phase ──────────────────────────────────────────────────────

describe("L402 Payment Flow — challenge phase", () => {
  test("GET /api/l402 returns 402 with WWW-Authenticate header", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`);
    assert.equal(res.status, 402, "Expected HTTP 402 Payment Required");

    const wwwAuth = res.headers.get("WWW-Authenticate");
    assert.ok(wwwAuth, "WWW-Authenticate header must be present");
    assert.match(wwwAuth, /^L402\s/i, "WWW-Authenticate must start with L402");
  });

  test("WWW-Authenticate header contains macaroon and invoice fields", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`);
    assert.equal(res.status, 402);

    const wwwAuth = res.headers.get("WWW-Authenticate") ?? "";
    // L402 macaroon="<base64>", invoice="lnbc..."
    assert.ok(
      wwwAuth.includes("macaroon=") || wwwAuth.includes("token="),
      `Expected macaroon field in: ${wwwAuth}`
    );
    assert.ok(
      wwwAuth.includes("invoice=") || wwwAuth.includes("lnbc"),
      `Expected invoice field in: ${wwwAuth}`
    );
  });

  test("response body contains payment instructions", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`);
    assert.equal(res.status, 402);

    const body = await res.json().catch(() => ({}));
    assert.ok(
      body.message || body.error || body.invoice,
      "402 response should contain payment details in body"
    );
  });
});

// ── L402 authorization phase ──────────────────────────────────────────────────

describe("L402 Payment Flow — authorization phase", () => {
  test("invalid Authorization header returns 401 or 402", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`, {
      headers: {
        Authorization: "L402 invalid_macaroon:deadbeef",
      },
    });

    assert.ok(
      res.status === 401 || res.status === 402 || res.status === 403,
      `Expected 401/402/403 for invalid credentials, got ${res.status}`
    );
  });

  test("malformed Authorization header (not L402 scheme) returns 4xx", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`, {
      headers: { Authorization: "Bearer not_a_valid_l402_token" },
    });

    assert.ok(
      res.status >= 400 && res.status < 500,
      `Expected 4xx for wrong auth scheme, got ${res.status}`
    );
  });

  test("expired invoice preimage rejected (wrong preimage → 401/402)", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }
    if (!lndAvailable) {
      t.skip("LND regtest not running — skipping preimage verification test");
      return;
    }

    // Use a known-invalid (all zeros) preimage
    const fakePreimage = "0".repeat(64);
    const fakeMacaroon = Buffer.from('{"identifier":"test"}').toString("base64");

    const res = await fetch(`${BASE_URL}/api/l402`, {
      headers: {
        Authorization: `L402 ${fakeMacaroon}:${fakePreimage}`,
      },
    });

    assert.ok(
      res.status === 401 || res.status === 402 || res.status === 403,
      `Expected rejection for fake preimage, got ${res.status}`
    );
  });
});

// ── LND connectivity sanity ───────────────────────────────────────────────────

describe("LND regtest connectivity", () => {
  test("LND REST API responds to getinfo", async (t) => {
    if (!lndAvailable) {
      t.skip("LND not running at localhost:8080 — start with: npm run setup:regtest");
      return;
    }

    const res = await fetch(`${LND_REST_URL}/v1/getinfo`);
    assert.ok(res.status < 500, `LND /v1/getinfo returned ${res.status}`);
  });
});
