// tests/e2e/vault-lifecycle.test.ts
// Layer 4.1 + 4.4: Vault lifecycle tests (create, lock, unlock, proof round-trip)
//
// IMPORTANT: VaultManager uses IndexedDB and navigator APIs — browser-only.
// Tests that require IndexedDB are skipped automatically in Node.js.
// The cryptographic primitives (AES-256-GCM, PBKDF2) ARE tested since
// crypto.subtle is available in Node 18+.
//
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { deriveKey, encrypt, decrypt, generateSalt } from "../../lib/crypto.ts";

const hasIndexedDB = typeof indexedDB !== "undefined";

// ── crypto primitives (run everywhere) ───────────────────────────────────────

describe("Vault Crypto — key derivation (Node.js compatible)", () => {
  test("generateSalt produces 32-byte random salt", () => {
    const salt = generateSalt();
    assert.ok(salt instanceof Uint8Array, "Salt must be Uint8Array");
    assert.equal(salt.length, 32, "Salt must be 32 bytes (256-bit per OWASP)");
  });

  test("deriveKey produces a CryptoKey from passphrase + salt", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase-123", salt);
    assert.ok(key, "Key must be derived");
    assert.equal(key.type, "secret", "Derived key must be a secret key");
    assert.equal(key.algorithm.name, "AES-GCM", "Key algorithm must be AES-GCM");
    assert.equal(key.extractable, false, "Key must not be extractable");
  });

  test("deriveKey is deterministic — same passphrase + salt → same key behavior", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("deterministic-passphrase", salt);
    const key2 = await deriveKey("deterministic-passphrase", salt);

    // Verify both keys encrypt/decrypt the same plaintext correctly
    const { iv, ciphertext } = await encrypt(key1, "test-plaintext");
    const decrypted = await decrypt(key2, iv, ciphertext);
    assert.equal(decrypted, "test-plaintext", "Keys derived from same passphrase+salt must be equivalent");
  });

  test("different passphrases → different keys (decrypt fails cross-key)", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("passphrase-A", salt);
    const key2 = await deriveKey("passphrase-B", salt);

    const { iv, ciphertext } = await encrypt(key1, "secret-data");

    await assert.rejects(
      () => decrypt(key2, iv, ciphertext),
      "Decrypting with wrong key must fail"
    );
  });

  test("encrypt produces non-empty ciphertext and IV", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-passphrase", salt);
    const { iv, ciphertext } = await encrypt(key, "hello world");

    assert.ok(iv instanceof Uint8Array && iv.length > 0, "IV must be non-empty");
    assert.ok(ciphertext instanceof ArrayBuffer && ciphertext.byteLength > 0, "Ciphertext must be non-empty");
  });

  test("encrypt → decrypt round-trip produces original plaintext", async () => {
    const salt = generateSalt();
    const key = await deriveKey("roundtrip-passphrase", salt);
    const plaintext = "this is a cashu proof secret 0x1234abcd";
    const { iv, ciphertext } = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, iv, ciphertext);

    assert.equal(decrypted, plaintext, "Decrypted text must match original");
  });
});

// ── VaultManager — full lifecycle (IndexedDB required) ───────────────────────

describe("Vault Lifecycle — create / lock / unlock", () => {
  test("4.1: vault.create() returns 12-word mnemonic", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB — run in browser or with fake-indexeddb polyfill");
      return;
    }

    // Dynamic import to avoid module-level issues in Node.js
    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    const words = await vault.create("test-passphrase-123");

    assert.ok(Array.isArray(words), "create() must return an array");
    assert.equal(words.length, 12, "Mnemonic must be 12 words");
    assert.ok(vault.isUnlocked(), "Vault must be unlocked after create()");
  });

  test("4.1: vault.lock() clears key from memory", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("lock-test-passphrase");
    assert.ok(vault.isUnlocked());

    vault.lock();
    assert.ok(!vault.isUnlocked(), "Vault must be locked after lock()");
  });

  test("4.1: vault.unlock() with correct passphrase re-opens vault", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("unlock-test-passphrase");
    vault.lock();

    await vault.unlock("unlock-test-passphrase");
    assert.ok(vault.isUnlocked(), "Vault must be unlocked after correct unlock()");
  });

  test("4.1: wrong passphrase → unlock throws", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("correct-passphrase-xyz");
    vault.lock();

    await assert.rejects(
      () => vault.unlock("wrong-passphrase-xyz"),
      "Unlock with wrong passphrase must throw"
    );
  });

  test("4.4: proofs survive lock → unlock round-trip", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("proof-roundtrip-passphrase");

    const mockProofs = [
      { id: "test-keyset-id", secret: "test-secret-abc", C: "test-C-abc", amount: 100 },
    ];

    await vault.storeProofs(mockProofs as any, "http://localhost:3338", "test-keyset-id", 0);

    vault.lock();
    await vault.unlock("proof-roundtrip-passphrase");

    const retrieved = await vault.getProofs("http://localhost:3338");
    assert.equal(retrieved.length, 1, "Should retrieve 1 proof after round-trip");
    assert.equal(retrieved[0].amount, 100, "Proof amount must match");
  });
});

// ── VaultManager — operations on locked vault ─────────────────────────────────

describe("Vault Lifecycle — locked vault guards", () => {
  test("getProofs on locked vault throws", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("guard-test-passphrase");
    vault.lock();

    await assert.rejects(
      () => vault.getProofs("http://localhost:3338"),
      "getProofs on locked vault must throw"
    );
  });

  test("storeProofs on locked vault throws", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("guard-test-store-passphrase");
    vault.lock();

    await assert.rejects(
      () => vault.storeProofs([], "http://localhost:3338", "keyset", 0),
      "storeProofs on locked vault must throw"
    );
  });
});
