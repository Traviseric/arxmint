---
id: 117
title: "Persist L402 challenges to DB (PaymentChallenge table)"
priority: P2
severity: medium
status: completed
source: feature_audit
file: app/api/l402/route.ts
line: 17
created: "2026-02-28T10:00:00Z"
execution_hint: parallel
context_group: payment_persistence
group_reason: "Touches app/api/l402/route.ts only — pattern from payment/route.ts already established in task 113"
---

# Persist L402 challenges to DB (PaymentChallenge table)

**Priority:** P2 (medium)
**Source:** feature_audit + security_audit
**Location:** app/api/l402/route.ts:17

## Problem

`app/api/l402/route.ts` stores macaroon↔rHash mappings in a process-level in-memory Map (`pendingL402`). A `PaymentChallenge` DB model and schema already exist (added by task 113 for `app/api/payment/route.ts`), but the L402 route does NOT persist challenges to the database.

**Code with issue:**
```typescript
/** In-memory store: base64-macaroon → { rHashBase64, expiresAt } */
const pendingL402 = new Map<
  string,
  { rHashBase64: string; expiresAt: number }
>();
```

A server restart drops all pending L402 sessions, breaking in-flight agent payments. An agent that paid a Lightning invoice but hasn't completed the retry step loses their payment if the server restarts.

The `PaymentChallenge` Prisma model already exists in `prisma/schema.prisma` (added in task 113). The pattern for writing/reading challenges from DB is already established in `app/api/payment/route.ts` (via `dbWriteChallenge()` and `getOrLoadChallenge()`).

## How to Fix

Follow the exact same pattern as `app/api/payment/route.ts`:

1. On L402 challenge creation (when writing to `pendingL402.set()`), also write to the `PaymentChallenge` table via `db.paymentChallenge.create()`:
   - `challengeId`: the macaroon base64 string
   - `type`: `"l402"`
   - `invoice`: the BOLT-11 invoice string
   - `expiresAt`: `new Date(Date.now() + TTL_MS)`
   - Store `rHashBase64` in the `notes` JSON field

2. On verification (when reading from `pendingL402.get(macaroon)`), use memory-first then DB fallback:
   ```typescript
   let pending = pendingL402.get(macaroon);
   if (!pending) {
     // DB fallback for restarts
     const dbChallenge = await db.paymentChallenge.findUnique({
       where: { challengeId: macaroon },
     });
     if (dbChallenge && dbChallenge.expiresAt > new Date()) {
       const notes = dbChallenge.notes as { rHashBase64: string };
       pending = { rHashBase64: notes.rHashBase64, expiresAt: dbChallenge.expiresAt.getTime() };
     }
   }
   ```

3. After successful verification, mark as paid in DB via `db.paymentChallenge.update({ where: { challengeId: macaroon }, data: { paidAt: new Date() } })`

4. Keep the in-memory Map as a fast-path cache (no need to remove it — it already has TTL via `pruneExpired()`)

5. DB operations should be fire-and-forget (`void db...`) with try/catch to avoid blocking the L402 flow if DB is unavailable

## Acceptance Criteria

- [ ] L402 challenges are written to the `PaymentChallenge` DB table on creation
- [ ] L402 verification reads from memory first, falls back to DB on cache miss
- [ ] Server restart: an in-flight L402 payment survives and can be redeemed after restart
- [ ] DB unavailability falls back gracefully to in-memory only (no 500 error)
- [ ] `npm run build` passes with no errors

## Notes

_Generated from feature_audit finding: "L402 challenge persistence across restarts" (medium severity, low effort). Conductor confirmed this as actionable (round 22). The DB schema (`PaymentChallenge` model) already exists from task 113._
