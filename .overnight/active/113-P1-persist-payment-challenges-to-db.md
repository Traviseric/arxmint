---
id: 113
title: "Persist payment challenges to DB to survive server restarts"
priority: P1
severity: medium
status: completed
source: security_audit
file: app/api/payment/route.ts
line: 23
created: "2026-02-28T00:00:00Z"
cwe: CWE-400
execution_hint: sequential
context_group: payment_persistence
group_reason: "PAYMENT PERSISTENCE group — DB persistence for payment state."
---

# Persist Payment Challenges to DB to Survive Server Restarts

**Priority:** P1 (medium)
**Source:** security_audit
**Location:** app/api/payment/route.ts:23
**CWE:** CWE-400 — Uncontrolled Resource Consumption / State Loss

## Problem

Payment challenges are stored in an in-process `Map`. After any server restart, all pending challenges are lost. Users who paid a Lightning invoice but haven't completed verification will have their payment lost (the preimage won't match any stored challenge). This is also a DoS vector: if an attacker can trigger server restarts, they can invalidate all pending payments.

**Code with issue:**
```typescript
/** In-process challenge registry (process lifetime) */
export const _challenges = new Map<
  string,
  { challenge: PaymentChallenge; paidAt?: number; createdAt: number }
>();
```

This Map is wiped on every server restart. For a pilot accepting real money, this is a data loss risk.

## How to Fix

Persist payment challenges to the `Transaction` table using `type: 'challenge'`:

```typescript
// On challenge creation: save to DB
await db.transaction.create({
  data: {
    id: challengeId,
    type: 'challenge',
    amount: challenge.amount,
    backend: challenge.type,
    status: 'pending',
    notes: JSON.stringify({ challenge, createdAt: Date.now() }),
    timestamp: new Date(),
  }
});

// On verification: load from DB if not in memory
async function getChallenge(id: string) {
  // Fast path: in-memory
  const cached = _challenges.get(id);
  if (cached) return cached;
  // Fallback: DB lookup
  const tx = await db.transaction.findFirst({
    where: { id, type: 'challenge', status: 'pending' }
  });
  if (tx) {
    const data = JSON.parse(tx.notes ?? '{}');
    return data;
  }
  return null;
}

// On payment completion: update DB status
await db.transaction.update({
  where: { id: challengeId },
  data: { status: 'completed', notes: JSON.stringify({ ...existingNotes, paidAt: Date.now() }) }
});
```

Keep the in-memory Map as a write-through cache for performance. Clean up expired challenges from DB (TTL-based, same 24h as current `TTL_MS`).

## Acceptance Criteria

- [ ] Payment challenges are written to DB when created
- [ ] Verification lookup falls back to DB if challenge not in memory
- [ ] Server restart does not lose pending payment challenges
- [ ] Expired challenges (>24h) are cleaned from DB on next prune cycle
- [ ] `paidAt` is recorded in DB when payment is confirmed
- [ ] No regressions on existing payment tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-400 — State loss on restart. For a financial application accepting real Lightning payments, losing pending payment state directly causes user funds loss (they paid, can't verify). P1 before pilot accepts real money._
