---
id: 93
title: "Add E2E tests: auth flows and failure modes"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_15
file: tests/e2e/auth-nostr.test.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: e2e_testing
group_reason: "E2E auth tests. Depends on tasks 078 (route protection) and 090 (regtest stack)."
---

# Add E2E tests: auth flows and failure modes

**Priority:** P2 (medium)
**Source:** OVERNIGHT_TASKS.md ID 15
**Location:** tests/e2e/ (auth test files)

## Problem

Auth routes (task 078) and failure modes need automated verification. Manual testing of NIP-98 auth flow, session management, and step-up reauth is unreliable. See `docs/E2E_TESTING.md` — Layer 2 (2.1-2.3) + Layer 8 (8.1-8.4).

## How to Fix

### `tests/e2e/auth-nostr.test.ts` (Layer 2.1)

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generatePrivateKey, getPublicKey, finalizeEvent } from 'nostr-tools';

describe('Nostr NIP-98 Auth', () => {
  test('2.1: valid NIP-98 event → session cookie set', async () => {
    const sk = generatePrivateKey();
    const pk = getPublicKey(sk);
    const event = finalizeEvent({
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['u', 'http://localhost:3000/api/auth'], ['method', 'POST']],
      content: ''
    }, sk);

    const res = await fetch('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pubkey: pk, signedEvent: event })
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('set-cookie')?.includes('arxmint_session'));
  });

  test('expired NIP-98 event → 400', async () => { /* stale timestamp */ });
  test('wrong pubkey → 401', async () => { /* pubkey mismatch */ });
  test('bad signature → 401', async () => { /* tampered event */ });
});
```

### `tests/e2e/auth-step-up.test.ts` (Layer 2.3)

```typescript
describe('Step-up Reauth', () => {
  test('2.3: stale session → 403 on spend operation → re-auth → 200', async () => {
    // 1. Create session
    // 2. Fast-forward clock past step-up TTL (5 min)
    // 3. Attempt spend operation → expect 403
    // 4. Re-authenticate → expect 200
  });
});
```

### `tests/e2e/keyset-safety.test.ts` (Layer 8.1-8.4)

```typescript
describe('Keyset Safety Failure Modes', () => {
  test('8.1: double-spend attempt → second claim rejected', async () => { /* ... */ });
  test('8.2: expired macaroon → L402 rejected', async () => { /* ... */ });
  test('8.3: invalid keyset ID → proof rejected', async () => { /* ... */ });
  test('8.4: keyset ID collision → proof rejected with warning', async () => { /* ... */ });
});
```

### `tests/e2e/protected-routes.test.ts` (middleware verification)

```typescript
describe('Route Protection', () => {
  test('unauthenticated /wallet → 302 redirect to /login', async () => { /* ... */ });
  test('unauthenticated /merchant → 302 redirect to /login', async () => { /* ... */ });
  test('authenticated request → 200', async () => { /* ... */ });
});
```

## Acceptance Criteria

- [ ] `tests/e2e/auth-nostr.test.ts` created with NIP-98 flow tests
- [ ] `tests/e2e/auth-step-up.test.ts` created with step-up reauth tests
- [ ] `tests/e2e/keyset-safety.test.ts` created with failure mode tests
- [ ] `tests/e2e/protected-routes.test.ts` created with route protection tests
- [ ] All tests use Node.js built-in test runner
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 15. See `docs/E2E_TESTING.md` Layer 2 and Layer 8. Depends on tasks 078 (route protection) and 090 (regtest stack)._
