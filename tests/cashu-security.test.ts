import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  __cashuSecurityTestUtils,
  deriveKeysetIdInt,
  validateAndRegisterKeysets,
  validateMintKeysetSnapshot,
  validateRestoredProofs,
} from "../lib/cashu-sdk.ts";

test.beforeEach(() => {
  __cashuSecurityTestUtils.resetRegistry();
});

test("deriveKeysetIdInt exposes NUT-13 31-bit collision behavior", () => {
  const idA = "0000000000000001";
  const idB = "0000000080000000"; // idA + (2^31 - 1)

  assert.notEqual(idA, idB);
  assert.equal(deriveKeysetIdInt(idA), deriveKeysetIdInt(idB));
});

test("validateAndRegisterKeysets rejects full keyset ID collisions across mints", () => {
  const keysetId = "0000000000003039";

  const first = validateAndRegisterKeysets("https://mint-a.example", [keysetId]);
  assert.equal(first.valid, true);

  const second = validateAndRegisterKeysets("https://mint-b.example", [keysetId]);
  assert.equal(second.valid, false);
  assert.match(second.errors.join(" "), /Full keyset ID collision/);
});

test("validateAndRegisterKeysets rejects 31-bit keyset_id_int collisions across mints", () => {
  const idA = "0000000000000001";
  const idB = "0000000080000000"; // collides with idA on keyset_id_int

  const first = validateAndRegisterKeysets("https://mint-a.example", [idA]);
  assert.equal(first.valid, true);

  const second = validateAndRegisterKeysets("https://mint-b.example", [idB]);
  assert.equal(second.valid, false);
  assert.match(second.errors.join(" "), /31-bit keyset_id_int collision/);
});

test("validateMintKeysetSnapshot rejects active keysets that fail pubkey-based verification", () => {
  const keysetId = "0000000000001234";
  const result = validateMintKeysetSnapshot(
    "https://mint-a.example",
    [{ id: keysetId, active: true }],
    [{ id: keysetId } as any],
    () => false
  );

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /verification failed/i);
});

test("validateRestoredProofs filters malformed, unknown, and cross-mint proofs", () => {
  const trustedId = "0000000000001111";
  const otherMintId = "0000000000002222";
  const unknownId = "0000000000003333";

  const trusted = validateAndRegisterKeysets("https://mint-a.example", [trustedId]);
  assert.equal(trusted.valid, true);
  const other = validateAndRegisterKeysets("https://mint-b.example", [otherMintId]);
  assert.equal(other.valid, true);

  const payload = [
    { id: trustedId, amount: 10, secret: "s-1", C: "C-1" }, // valid
    { id: unknownId, amount: 10, secret: "s-2", C: "C-2" }, // unknown keyset
    { id: otherMintId, amount: 10, secret: "s-3", C: "C-3" }, // cross-mint keyset
    { id: trustedId, amount: 10, secret: "s-1", C: "C-dup" }, // duplicate secret
    { id: trustedId, amount: -1, secret: "bad", C: "bad" }, // malformed amount
  ];

  const restored = validateRestoredProofs(
    "https://mint-a.example",
    payload,
    new Set(trusted.trustedKeysetIds)
  );

  assert.equal(restored.proofs.length, 1);
  assert.equal(restored.proofs[0].id, trustedId);
  assert.equal(restored.rejected, 4);
  assert.ok(restored.warnings.length >= 4);
});
