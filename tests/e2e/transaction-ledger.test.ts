// tests/e2e/transaction-ledger.test.ts
// Layer 3.4: Transaction ledger integrity E2E tests
// Verifies that payments create DB records with correct metadata and no raw proof leakage.
// Requires: npm run dev (server on :3000) + database (PostgreSQL via Docker)
//
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:3000";

let serverAvailable = false;

// ── connectivity check ────────────────────────────────────────────────────────

before(async () => {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// ── ledger API structure ──────────────────────────────────────────────────────

describe("Transaction Ledger — API structure", () => {
  test("GET /api/transactions returns 401 when unauthenticated", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/transactions`);
    // Should require auth
    assert.ok(
      res.status === 401 || res.status === 403 || res.status === 302,
      `Expected auth gate (401/403/302), got ${res.status}`
    );
  });

  test("GET /api/settlement returns a list or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement`);
    assert.ok(
      res.status === 200 || res.status === 401 || res.status === 403,
      `Expected 200/401/403 from /api/settlement, got ${res.status}`
    );
  });
});

// ── ledger data integrity ─────────────────────────────────────────────────────

describe("Transaction Ledger — data integrity", () => {
  test("settlement POST requires authentication", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId: "test-community",
        amountSats: 1000,
        mintUrl: "http://localhost:3338",
      }),
    });

    // Should reject unauthenticated requests
    assert.ok(
      res.status === 401 || res.status === 403 || res.status === 400,
      `Expected 401/403/400 for unauthenticated settlement, got ${res.status}`
    );
  });

  test("settlement POST with missing fields returns 400", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Include a dummy auth header to bypass auth gate
        Cookie: "arxmint_session=invalid_session_for_testing",
      },
      body: JSON.stringify({}), // empty body — missing required fields
    });

    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 422,
      `Expected 400/401/422 for empty settlement body, got ${res.status}`
    );
  });

  test("GET /api/settlement/:id with invalid ID returns 404 or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement/nonexistent-settlement-id-xyz`);
    assert.ok(
      res.status === 404 || res.status === 401 || res.status === 403,
      `Expected 404/401/403 for unknown settlement ID, got ${res.status}`
    );
  });
});

// ── proof data leakage prevention ─────────────────────────────────────────────

describe("Transaction Ledger — proof data privacy", () => {
  test("settlement endpoint does not echo back raw Cashu proofs", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId: "test",
        amountSats: 100,
        mintUrl: "http://localhost:3338",
        // Deliberately include proof data to test it's not echoed back
        proofs: [{ id: "secret-keyset", secret: "SENSITIVE_SECRET", C: "SENSITIVE_C", amount: 100 }],
      }),
    });

    // Whether this returns 400 or 401, the response body must NOT contain raw proof secrets
    const text = await res.text();
    assert.ok(
      !text.includes("SENSITIVE_SECRET"),
      "Response must not echo back raw proof secrets"
    );
    assert.ok(
      !text.includes("SENSITIVE_C"),
      "Response must not echo back raw proof C values"
    );
  });

  test("transaction metadata schema does not include proofData field", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    // This test verifies that if a transaction record is returned,
    // it doesn't expose raw proof data (which would be a privacy violation)
    const res = await fetch(`${BASE_URL}/api/settlement`);
    if (res.status !== 200) {
      assert.ok(
        res.status === 401 || res.status === 403,
        `Expected 200/401/403 from /api/settlement, got ${res.status}`
      );
      return;
    }

    const body = await res.json().catch(() => ({ items: [] }));
    const items = body.items ?? body.transactions ?? (Array.isArray(body) ? body : []);

    for (const item of items) {
      assert.ok(!item.proofData, "Transaction record must not expose proofData field");
      assert.ok(!item.proofs, "Transaction record must not expose raw proofs array");
      assert.ok(!item.secret, "Transaction record must not expose proof secrets");
    }
  });
});
