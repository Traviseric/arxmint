---
id: 91
title: "Add E2E tests: L402 + NUT-24 + spend router payment flows"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_13
file: tests/e2e/l402-payment.test.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: e2e_testing
group_reason: "E2E tests. Depends on tasks 079 (L402 LND), 080 (NUT-24), 090 (regtest stack)."
---

# Add E2E tests: L402 + NUT-24 + spend router payment flows

**Priority:** P2 (medium)
**Source:** OVERNIGHT_TASKS.md ID 13
**Location:** tests/e2e/ (new directory with 4 test files)

## Problem

ArxMint has no E2E payment flow tests. The payment stack (L402, NUT-24, spend router, transaction ledger) can only be verified manually. See `docs/E2E_TESTING.md` — Layer 3 tests (3.1-3.4).

## How to Fix

Create 4 E2E test files using Node.js built-in test runner:

### `tests/e2e/l402-payment.test.ts` (Layer 3.1)
```typescript
// Test 3.1: Full L402 flow
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

describe('L402 Payment Flow', () => {
  test('402 challenge → pay invoice → preimage → access granted', async () => {
    // 1. GET /api/l402/resource — expect 402
    const r1 = await fetch('http://localhost:3000/api/l402/resource');
    assert.equal(r1.status, 402);
    const wwwAuth = r1.headers.get('WWW-Authenticate');
    assert.ok(wwwAuth?.startsWith('L402 '));

    // 2. Pay invoice via regtest LND
    // 3. Retry with Authorization: L402 <macaroon>:<preimage>
    // 4. Expect 200
  });

  test('invalid preimage → access denied', async () => { /* ... */ });
  test('expired invoice → 402', async () => { /* ... */ });
});
```

### `tests/e2e/nut24-payment.test.ts` (Layer 3.2)
```typescript
// Test 3.2: NUT-24 Cashu paywall
describe('NUT-24 Cashu Paywall', () => {
  test('valid unspent token → access granted', async () => { /* ... */ });
  test('double-spend → access denied', async () => { /* ... */ });
  test('wrong amount → access denied', async () => { /* ... */ });
});
```

### `tests/e2e/spend-router.test.ts` (Layer 3.3)
```typescript
// Test 3.3: Spend router path selection
describe('Spend Router', () => {
  test('small amount + standard privacy → cashu backend', async () => { /* ... */ });
  test('large amount → lightning backend', async () => { /* ... */ });
  test('maximum privacy → fedimint backend', async () => { /* ... */ });
});
```

### `tests/e2e/transaction-ledger.test.ts` (Layer 3.4)
```typescript
// Test 3.4: Transaction ledger integrity
describe('Transaction Ledger', () => {
  test('payment creates metadata record (no raw proofs)', async () => {
    // Make a payment
    // Check DB: Transaction created with correct metadata
    // Verify: no proofData/raw proof fields in the record
  });
});
```

Update `package.json`:
```json
"test:e2e": "node --test tests/e2e/*.test.ts"
```

## Acceptance Criteria

- [ ] `tests/e2e/l402-payment.test.ts` created with L402 flow tests
- [ ] `tests/e2e/nut24-payment.test.ts` created with NUT-24 tests
- [ ] `tests/e2e/spend-router.test.ts` created with routing tests
- [ ] `tests/e2e/transaction-ledger.test.ts` created with ledger integrity tests
- [ ] `npm run test:e2e` runs all E2E tests against regtest stack
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 13. See `docs/E2E_TESTING.md` Layer 3 for full test specs. Depends on tasks 079 (L402 LND), 080 (NUT-24), 090 (regtest stack)._
