// tests/e2e/vault-crash-recovery.test.ts
// Layer 4.3: Vault crash recovery — pending proof reconciliation via NUT-07
//
// IMPORTANT: Requires IndexedDB (browser-only). Tests are skipped in Node.js.
// In production this test validates the saga pattern that reconciles proofs
// left in 'pending' state after an interrupted payment operation.
//
// Run: npm run test:e2e

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const hasIndexedDB = typeof indexedDB !== "undefined";

// ── crash reconciliation ──────────────────────────────────────────────────────

describe("Vault Crash Recovery — pending proof reconciliation", () => {
  test("4.3: checkAndReconcile marks pending proofs as spent", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB (browser environment) — skipped in Node.js test runner");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const { ProofRepo } = await import("../../lib/proof-repo.js");

    const vault = new VaultManager();
    await vault.create("reconcile-test-passphrase");

    // Store a proof then manually mark it as 'pending' (simulating crash)
    const mockProofs = [
      { id: "crash-keyset", secret: "pending-secret-xyz", C: "pending-C-xyz", amount: 50 },
    ];
    await vault.storeProofs(mockProofs as any, "http://localhost:3338", "crash-keyset", 0);

    // Manually set proof to pending state (simulates interrupted payment)
    const all = await ProofRepo.getAll("http://localhost:3338");
    assert.ok(all.length > 0, "Should have stored proofs");

    // Directly update status to pending via ProofRepo.put()
    // (This simulates a crash mid-payment where proof is marked pending but
    //  the payment never completed)
    await ProofRepo.put({ ...all[0], status: "pending" });

    const pendingBefore = (await ProofRepo.getAll("http://localhost:3338"))
      .filter((p: { status: string }) => p.status === "pending");
    assert.equal(pendingBefore.length, 1, "Should have 1 pending proof before reconciliation");

    // Run crash recovery
    await vault.checkAndReconcile("http://localhost:3338");

    const pendingAfter = (await ProofRepo.getAll("http://localhost:3338"))
      .filter((p: { status: string }) => p.status === "pending");
    assert.equal(pendingAfter.length, 0, "All pending proofs should be reconciled after checkAndReconcile");
  });

  test("4.3: checkAndReconcile is a no-op when no pending proofs", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("no-pending-passphrase");

    // No pending proofs → should complete without error
    await assert.doesNotReject(
      () => vault.checkAndReconcile("http://localhost:3338"),
      "checkAndReconcile with no pending proofs must not throw"
    );
  });

  test("4.3: live proofs are not affected by checkAndReconcile", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("live-proofs-passphrase");

    const mockProofs = [
      { id: "live-keyset", secret: "live-secret-abc", C: "live-C-abc", amount: 200 },
    ];
    await vault.storeProofs(mockProofs as any, "http://localhost:3338", "live-keyset", 0);

    // Run reconciliation — live proofs should be untouched
    await vault.checkAndReconcile("http://localhost:3338");

    const retrieved = await vault.getProofs("http://localhost:3338");
    assert.equal(retrieved.length, 1, "Live proof should survive checkAndReconcile");
    assert.equal(retrieved[0].amount, 200, "Live proof amount must be unchanged");
  });
});

// ── pending state transitions ──────────────────────────────────────────────────

describe("Vault Crash Recovery — state transitions", () => {
  test("spent proofs are excluded from getProofs", async (t) => {
    if (!hasIndexedDB) {
      t.skip("Requires IndexedDB");
      return;
    }

    const { VaultManager } = await import("../../lib/cashu-vault.js");
    const vault = new VaultManager();
    await vault.create("spent-test-passphrase");

    const mockProofs = [
      { id: "spent-keyset", secret: "spent-secret-456", C: "spent-C-456", amount: 75 },
    ];
    await vault.storeProofs(mockProofs as any, "http://localhost:3338", "spent-keyset", 0);

    // Mark proof as spent
    await vault.markProofsSpent(mockProofs as any);

    const live = await vault.getProofs("http://localhost:3338");
    assert.equal(live.length, 0, "Spent proofs must not appear in getProofs");
  });
});
