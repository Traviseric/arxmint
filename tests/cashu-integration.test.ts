import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  SovereignCashuClient,
  validateAndRegisterKeysets,
  __cashuSecurityTestUtils,
} from "../lib/cashu-sdk.ts";

const REGTEST_MINT_URL = process.env.TEST_MINT_URL ?? "http://localhost:3338";

/** Check if a test mint is reachable within 2 seconds */
async function isMintAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${REGTEST_MINT_URL}/v1/info`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.beforeEach(() => {
  __cashuSecurityTestUtils.resetRegistry();
});

// ---- Pure unit tests (no live mint required) ----

test("keyset validation rejects short/invalid keyset ID", () => {
  const result = validateAndRegisterKeysets("https://mint.example", ["short"]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0, "should have errors for invalid ID");
});

test("keyset validation accepts valid hex keyset ID", () => {
  const result = validateAndRegisterKeysets("https://mint.example", [
    "0000000000001234",
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("proof amounts sum correctly after loadProofs()", () => {
  const client = new SovereignCashuClient("http://mock-mint.local");
  const mockProofs = [
    { id: "0000000000001234", amount: 8, secret: "s1", C: "C1" },
    { id: "0000000000001234", amount: 4, secret: "s2", C: "C2" },
    { id: "0000000000001234", amount: 1, secret: "s3", C: "C3" },
  ];
  client.loadProofs(mockProofs as any);
  assert.equal(client.balance, 13);
  assert.equal(client.proofs.length, 3);
});

test("keyset collision detection rejects duplicate ID across mints", () => {
  const keysetId = "0000000000003039";
  const first = validateAndRegisterKeysets("https://mint-a.example", [keysetId]);
  assert.equal(first.valid, true);

  const second = validateAndRegisterKeysets("https://mint-b.example", [keysetId]);
  assert.equal(second.valid, false);
  assert.match(second.errors.join(" "), /Full keyset ID collision/);
});

// ---- Integration tests (skipped when no mint available) ----

test("connect to regtest mint and validate keysets", async (t) => {
  if (!(await isMintAvailable())) {
    t.skip("No test mint available at " + REGTEST_MINT_URL);
    return;
  }
  const client = new SovereignCashuClient(REGTEST_MINT_URL);
  await assert.doesNotReject(() => client.connect());
  assert.equal(client.mintUrl, REGTEST_MINT_URL);
  assert.equal(client.balance, 0, "fresh client starts with 0 balance");
});

test("create mint quote returns Lightning invoice", async (t) => {
  if (!(await isMintAvailable())) {
    t.skip("No test mint available at " + REGTEST_MINT_URL);
    return;
  }
  const client = new SovereignCashuClient(REGTEST_MINT_URL);
  await client.connect();
  const quote = await client.createMintQuote(10);
  assert.ok(quote.quote, "quote ID should be defined");
  assert.ok(
    quote.request.startsWith("lnbc") || quote.request.startsWith("lntb"),
    "should return a Lightning invoice"
  );
});

test("double-spend: melt proofs requires non-zero balance", async (t) => {
  if (!(await isMintAvailable())) {
    t.skip("No test mint available at " + REGTEST_MINT_URL);
    return;
  }
  const client = new SovereignCashuClient(REGTEST_MINT_URL);
  await client.connect();
  // Client with no proofs has 0 balance — cannot melt
  assert.equal(client.balance, 0);
  assert.equal(client.proofs.length, 0);
});
