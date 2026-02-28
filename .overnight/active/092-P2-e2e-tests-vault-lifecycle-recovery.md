---
id: 92
title: "Add E2E tests: vault lifecycle + crash recovery"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_14
file: tests/e2e/vault-lifecycle.test.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: e2e_testing
group_reason: "E2E vault tests. Depends on task 074 (Cashu vault) and 090 (regtest stack)."
---

# Add E2E tests: vault lifecycle + crash recovery

**Priority:** P2 (medium)
**Source:** OVERNIGHT_TASKS.md ID 14
**Location:** tests/e2e/vault-lifecycle.test.ts + vault-crash-recovery.test.ts

## Problem

The Cashu vault (task 074) has complex lifecycle (create, unlock, lock, auto-lock) and crash recovery logic (saga pattern). Without automated tests, these are impossible to verify reliably. See `docs/E2E_TESTING.md` — Layer 4 tests (4.1-4.4).

## How to Fix

### `tests/e2e/vault-lifecycle.test.ts` (Layer 4.1 + 4.4)

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VaultManager } from '../../lib/cashu-vault';

describe('Vault Lifecycle', () => {
  test('4.1: create → lock → unlock with correct passphrase', async () => {
    const vault = new VaultManager();
    const mnemonic = await vault.create('test-passphrase-123');
    assert.ok(mnemonic.length === 12, 'Should return 12-word mnemonic');
    assert.ok(vault.isUnlocked());

    vault.lock();
    assert.ok(!vault.isUnlocked());

    await vault.unlock('test-passphrase-123');
    assert.ok(vault.isUnlocked());
  });

  test('4.1: wrong passphrase → unlock fails', async () => {
    const vault = new VaultManager();
    await vault.create('correct-passphrase');
    vault.lock();
    await assert.rejects(() => vault.unlock('wrong-passphrase'));
  });

  test('4.4: proofs survive round-trip (store → lock → unlock → read)', async () => {
    const vault = new VaultManager();
    await vault.create('test-passphrase');
    const mockProofs = [{ secret: 'test', C: 'testC', amount: 100, id: 'test-id' }];
    await vault.storeProofs(mockProofs as any, 'http://localhost:3338', 'test-keyset', 0);

    vault.lock();
    await vault.unlock('test-passphrase');
    const retrieved = await vault.getProofs('http://localhost:3338');
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].amount, 100);
  });
});
```

### `tests/e2e/vault-crash-recovery.test.ts` (Layer 4.3)

```typescript
describe('Vault Crash Recovery', () => {
  test('4.3: pending proofs reconciled via NUT-07 on restart', async () => {
    // 1. Mark a proof as 'pending' in IDB (simulate crash mid-payment)
    // 2. Call vault.checkAndReconcile(mintUrl)
    // 3. Verify proofs are correctly marked as live or spent
  });
});
```

### `tests/e2e/vault-seed-restore.test.ts` (Layer 4.2)

```typescript
describe('Vault Seed Restore', () => {
  test('4.2: NUT-13 seed phrase → destroy vault → restore from mint', async () => {
    // 1. Create vault, store proofs, save mnemonic
    // 2. Destroy vault (clear IndexedDB)
    // 3. Call vault.restoreFromSeed(mnemonic, [mintUrl])
    // 4. Verify proofs restored via NUT-09 /v1/restore
  });
});
```

## Acceptance Criteria

- [ ] `tests/e2e/vault-lifecycle.test.ts` created with create/lock/unlock tests
- [ ] `tests/e2e/vault-crash-recovery.test.ts` created with saga reconciliation tests
- [ ] `tests/e2e/vault-seed-restore.test.ts` created with NUT-13 restore tests
- [ ] Wrong passphrase correctly rejected
- [ ] Proofs survive lock/unlock round-trip
- [ ] `npm run test:e2e` includes vault tests
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 14. Depends on task 074 (Cashu vault) and 090 (regtest stack). See `docs/E2E_TESTING.md` Layer 4 for full test specs._
