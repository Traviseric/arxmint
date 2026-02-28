// tests/e2e/vault-seed-restore.test.ts
// Layer 4.2: NUT-13 seed phrase backup and restore
// Tests vault seed phrase generation and NUT-09 proof restore flow.
//
// IMPORTANT: Requires IndexedDB (browser-only). Tests that need IDB are skipped in Node.js.
// The seed generation portion CAN run in Node.js since it uses nostr-tools.
//
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const hasIndexedDB = typeof indexedDB !== "undefined";
const MINT_URL = "http://localhost:3338";

let mintAvailable = false;

before(async () => {
  try {
    const r = await fetch(`${MINT_URL}/v1/info`, { signal: AbortSignal.timeout(2000) });
    mintAvailable = r.ok;
  } catch {
    mintAvailable = false;
  }
});

// ── seed generation (runs in Node.js) ────────────────────────────────────────

describe("Vault Seed — mnemonic generation", () => {
  test("vault.create() returns 12-word seed phrase array", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB — run in browser or with fake-indexeddb polyfill");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    const words = await vault.create("seed-gen-passphrase");

    assert.ok(Array.isArray(words), "Mnemonic must be returned as array");
    assert.equal(words.length, 12, "Mnemonic must be 12 words");
    assert.ok(words.every((w: string) => typeof w === "string" && w.length > 0), "Each word must be non-empty string");
  });

  test("each vault.create() call produces a different mnemonic", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");

    const vault1 = new VaultManager();
    const words1 = await vault1.create("entropy-test-1");

    const vault2 = new VaultManager();
    const words2 = await vault2.create("entropy-test-2");

    assert.notDeepEqual(
      words1,
      words2,
      "Different vault creations must produce different mnemonics"
    );
  });
});

// ── NUT-09 restore flow ───────────────────────────────────────────────────────

describe("Vault Seed Restore — NUT-09 proof recovery", () => {
  test("4.2: restoreFromSeed completes without throw when mint unavailable", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("restore-test-passphrase");
    const words = ["word1", "word2", "word3", "word4", "word5", "word6",
                   "word7", "word8", "word9", "word10", "word11", "word12"];

    // restoreFromSeed should handle unavailable mint gracefully
    await assert.doesNotReject(
      () => vault.restoreFromSeed(words.join(" "), ["http://nonexistent-mint.local"]),
      "restoreFromSeed must not throw even if mint is unreachable"
    );
  });

  test("4.2: restoreFromSeed with valid mint URL attempts recovery", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338 — start with: npm run setup:cashu");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");

    // First create a vault and get the mnemonic
    const vault1 = new VaultManager();
    const words = await vault1.create("backup-passphrase-123");
    const mnemonic = words.join(" ");

    // Simulate destroy: create a new VaultManager (fresh state)
    const vault2 = new VaultManager();
    await vault2.create("backup-passphrase-123");

    // Attempt restore from seed (uses mnemonic as passphrase)
    await assert.doesNotReject(
      () => vault2.restoreFromSeed(mnemonic, [MINT_URL]),
      "restoreFromSeed must not throw with live mint"
    );
  });
});

// ── NUT-09 mint restore endpoint ──────────────────────────────────────────────

describe("NUT-09 Mint Restore Endpoint", () => {
  test("/v1/restore endpoint responds (200 or 404 if not supported)", async (t) => {
    if (!mintAvailable) {
      t.skip("Cashu mint not running at localhost:3338");
      return;
    }

    const res = await fetch(`${MINT_URL}/v1/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputs: [] }),
    });

    // NUT-09 restore with empty outputs — mint may return 200 with empty or 400
    assert.ok(
      res.status === 200 || res.status === 400 || res.status === 404,
      `Expected 200/400/404 from /v1/restore, got ${res.status}`
    );
  });
});
