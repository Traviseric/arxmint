// tests/e2e/keyset-safety.test.ts
// Layer 8: Keyset safety failure modes
// Tests double-spend prevention, expired macaroons, invalid/colliding keyset IDs.
//
// Tests 8.1-8.4: keyset collision, double-spend, expired macaroon, invalid keyset.
// These tests use both the library (keyset validation) and HTTP API (payment rejection).
//
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  deriveKeysetIdInt,
  validateAndRegisterKeysets,
  validateMintKeysetSnapshot,
  validateRestoredProofs,
  __cashuSecurityTestUtils,
} from "../../lib/cashu-sdk.ts";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:3000";

let serverAvailable = false;

before(async () => {
  // Reset keyset registry before tests
  if (__cashuSecurityTestUtils) {
    __cashuSecurityTestUtils.resetRegistry();
  }

  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// ── keyset ID collision detection ──────────────────────────────────────────────

describe("Keyset Safety — 8.4: keyset ID collision detection", () => {
  test("full keyset ID collision across mints is rejected", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const keysetId = "0000000000003039";

    const first = validateAndRegisterKeysets("https://mint-a.test", [keysetId]);
    assert.equal(first.valid, true, "First registration should succeed");

    const second = validateAndRegisterKeysets("https://mint-b.test", [keysetId]);
    assert.equal(second.valid, false, "Second registration with same keyset ID must fail");
    assert.match(
      second.errors.join(" "),
      /collision/i,
      "Error must mention collision"
    );
  });

  test("31-bit keyset_id_int collision across mints is rejected", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const idA = "0000000000000001";
    const idB = "0000000080000000"; // collides on keyset_id_int

    const first = validateAndRegisterKeysets("https://mint-a.test", [idA]);
    assert.equal(first.valid, true);

    const second = validateAndRegisterKeysets("https://mint-b.test", [idB]);
    assert.equal(second.valid, false, "31-bit collision must be detected");
    assert.match(
      second.errors.join(" "),
      /31-bit/i,
      "Error must mention 31-bit collision"
    );
  });

  test("8.4: deriveKeysetIdInt exposes NUT-13 modular collision", () => {
    const idA = "0000000000000001";
    const idB = "0000000080000000";
    assert.equal(
      deriveKeysetIdInt(idA),
      deriveKeysetIdInt(idB),
      "These IDs must collide on keyset_id_int (NUT-13 edge case)"
    );
    assert.notEqual(idA, idB, "The full IDs must be different strings");
  });
});

// ── keyset snapshot verification ──────────────────────────────────────────────

describe("Keyset Safety — 8.3: invalid keyset rejected", () => {
  test("active keyset failing pubkey verification is rejected", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const keysetId = "0000000000001234";

    const result = validateMintKeysetSnapshot(
      "https://mint.test",
      [{ id: keysetId, active: true }],
      [{ id: keysetId } as any], // keys that fail verification
      () => false // verifyPubkey always returns false
    );

    assert.equal(result.valid, false, "Keyset with failed pubkey verification must be rejected");
    assert.match(result.errors.join(" "), /verification failed/i);
  });

  test("active keyset with valid pubkey verification is accepted", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const keysetId = "0000000000005678";

    const result = validateMintKeysetSnapshot(
      "https://mint.test",
      [{ id: keysetId, active: true }],
      [{ id: keysetId } as any],
      () => true // pubkey verification passes
    );

    assert.equal(result.valid, true, "Active keyset with valid pubkeys must be accepted");
  });
});

// ── proof restoration validation ──────────────────────────────────────────────

describe("Keyset Safety — 8.1: double-spend / invalid proof rejection", () => {
  test("8.1: duplicate proof secrets are filtered on restore", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const trustedId = "0000000000001111";
    validateAndRegisterKeysets("https://mint.test", [trustedId]);

    const payload = [
      { id: trustedId, amount: 10, secret: "secret-dup", C: "C-1" },
      { id: trustedId, amount: 10, secret: "secret-dup", C: "C-2" }, // duplicate secret
    ];

    const result = validateRestoredProofs(
      "https://mint.test",
      payload,
      new Set([trustedId])
    );

    // Only one of the duplicates should be accepted
    assert.equal(result.proofs.length, 1, "Duplicate proofs must be deduplicated");
    assert.ok(result.rejected >= 1, "At least 1 proof must be rejected as duplicate");
  });

  test("proofs from wrong mint's keyset are rejected", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const myMintId = "0000000000002222";
    const otherMintId = "0000000000003333";

    validateAndRegisterKeysets("https://my-mint.test", [myMintId]);
    validateAndRegisterKeysets("https://other-mint.test", [otherMintId]);

    const payload = [
      { id: myMintId, amount: 10, secret: "my-secret", C: "my-C" },       // valid
      { id: otherMintId, amount: 10, secret: "other-secret", C: "other-C" }, // cross-mint
    ];

    const result = validateRestoredProofs(
      "https://my-mint.test",
      payload,
      new Set([myMintId]) // only my mint's keysets are trusted
    );

    assert.equal(result.proofs.length, 1, "Only proofs from trusted mint should be accepted");
    assert.equal(result.proofs[0].id, myMintId, "Accepted proof must be from trusted mint");
  });

  test("malformed proofs (negative amount) are rejected", () => {
    __cashuSecurityTestUtils?.resetRegistry();
    const trustedId = "0000000000004444";
    validateAndRegisterKeysets("https://mint.test", [trustedId]);

    const payload = [
      { id: trustedId, amount: 10, secret: "valid-secret", C: "valid-C" },  // valid
      { id: trustedId, amount: -5, secret: "bad-amount", C: "bad-C" },       // malformed
    ];

    const result = validateRestoredProofs(
      "https://mint.test",
      payload,
      new Set([trustedId])
    );

    assert.equal(result.proofs.length, 1, "Malformed proof must be rejected");
    assert.equal(result.proofs[0].amount, 10, "Valid proof must be accepted");
  });
});

// ── macaroon expiry (8.2) ─────────────────────────────────────────────────────

describe("Keyset Safety — 8.2: expired macaroon rejection", () => {
  test("L402 request with expired macaroon returns 401/402", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    // Craft a mock expired macaroon (base64-encoded expired JSON)
    const expiredMacaroon = Buffer.from(
      JSON.stringify({
        identifier: "test-identifier",
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      })
    ).toString("base64");

    const fakePreimage = "a".repeat(64);

    const res = await fetch(`${BASE_URL}/api/l402`, {
      headers: {
        Authorization: `L402 ${expiredMacaroon}:${fakePreimage}`,
      },
    });

    assert.ok(
      res.status === 401 || res.status === 402 || res.status === 403,
      `Expected rejection for expired macaroon, got ${res.status}`
    );
  });
});
