---
id: 103
title: "Add pilot value caps — max wallet balance, max tx, max daily volume"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_32
file: lib/value-caps.ts
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: sequential
context_group: api_security
group_reason: "API security layer: enforced server-side in same payment API routes as tasks 100, 101, 102"
---

# Add pilot value caps — max wallet balance, max tx, max daily volume

**Priority:** P1
**Source:** OVERNIGHT_TASKS.md ID 32 — Production Readiness Gate
**Location:** new `lib/value-caps.ts`, update API routes, update wallet-panel.tsx, update `.env.example`

## Problem

ArxMint has no limits on transaction sizes or wallet balances. For the Longmont pilot:
- A bug in payment routing could drain a wallet completely
- There's no protection against accidentally sending 1,000,000 sats in a single transaction
- Users have no visibility into what limits apply

Required caps (from OVERNIGHT_TASKS.md):
- **Max wallet balance per user:** default 50,000 sats (configurable via env)
- **Max single transaction:** default 10,000 sats (configurable via env)
- **Max daily volume per user:** default 100,000 sats (configurable via env)

These MUST be enforced server-side, not just in UI.

## How to Fix

### Step 1: Create `lib/value-caps.ts`

```typescript
export interface ValueCaps {
  maxWalletBalance: number;  // sats
  maxSingleTx: number;       // sats
  maxDailyVolume: number;    // sats
}

export function getValueCaps(): ValueCaps {
  return {
    maxWalletBalance: parseInt(process.env.MAX_WALLET_BALANCE_SATS ?? '50000', 10),
    maxSingleTx: parseInt(process.env.MAX_SINGLE_TX_SATS ?? '10000', 10),
    maxDailyVolume: parseInt(process.env.MAX_DAILY_VOLUME_SATS ?? '100000', 10),
  };
}

export class ValueCapError extends Error {
  constructor(public readonly cap: keyof ValueCaps, message: string) {
    super(message);
    this.name = 'ValueCapError';
  }
}

export function checkSingleTxCap(amountSats: number): void {
  const caps = getValueCaps();
  if (amountSats > caps.maxSingleTx) {
    throw new ValueCapError(
      'maxSingleTx',
      `Transaction amount ${amountSats} sats exceeds pilot limit of ${caps.maxSingleTx} sats`
    );
  }
}

export function checkDailyVolumeCap(todayVolumeSats: number, additionalSats: number): void {
  const caps = getValueCaps();
  if (todayVolumeSats + additionalSats > caps.maxDailyVolume) {
    throw new ValueCapError(
      'maxDailyVolume',
      `Daily volume limit of ${caps.maxDailyVolume} sats would be exceeded`
    );
  }
}

export function checkWalletBalanceCap(currentBalanceSats: number): void {
  const caps = getValueCaps();
  if (currentBalanceSats > caps.maxWalletBalance) {
    throw new ValueCapError(
      'maxWalletBalance',
      `Wallet balance ${currentBalanceSats} sats exceeds pilot limit of ${caps.maxWalletBalance} sats`
    );
  }
}
```

### Step 2: Update API routes to enforce caps

In payment API routes, call `checkSingleTxCap()` before processing:

```typescript
import { checkSingleTxCap, ValueCapError } from '@/lib/value-caps';

// In payment route POST handler:
checkSingleTxCap(amountSats); // throws ValueCapError if exceeded

// In error handling:
if (e instanceof ValueCapError) {
  return NextResponse.json({ error: e.message, code: 'VALUE_CAP_EXCEEDED' }, { status: 400 });
}
```

For daily volume: query today's transactions from the DB and check before proceeding:
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayVolume = await db.transaction.aggregate({
  where: { communityId, timestamp: { gte: today }, status: 'confirmed' },
  _sum: { amount: true }
});
checkDailyVolumeCap(todayVolume._sum.amount ?? 0, amountSats);
```

**Routes to update:** `app/api/payment/route.ts`, `app/api/l402/route.ts`, `app/api/settlement/route.ts`

### Step 3: Add env vars to `.env.example`

```bash
# Pilot value caps (sats)
MAX_WALLET_BALANCE_SATS=50000
MAX_SINGLE_TX_SATS=10000
MAX_DAILY_VOLUME_SATS=100000
```

### Step 4: Display limits in wallet UI

In `components/wallet-panel.tsx`, show current limits to users:
```tsx
<p className="text-sovereign-muted text-xs">
  Pilot limits: max {maxSingleTx.toLocaleString()} sats per transaction ·
  {maxDailyVolume.toLocaleString()} sats per day
</p>
```

## Acceptance Criteria

- [ ] `lib/value-caps.ts` created with `getValueCaps()`, `checkSingleTxCap()`, `checkDailyVolumeCap()`, `checkWalletBalanceCap()`
- [ ] Value caps are configurable via env vars (not hardcoded)
- [ ] Payment API routes enforce single-tx cap server-side
- [ ] Daily volume cap enforced using DB aggregation
- [ ] Exceeded cap returns HTTP 400 with `{ error, code: "VALUE_CAP_EXCEEDED" }`
- [ ] `.env.example` has `MAX_WALLET_BALANCE_SATS`, `MAX_SINGLE_TX_SATS`, `MAX_DAILY_VOLUME_SATS`
- [ ] Wallet UI shows current limits to users
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 32. Pilot value caps are a safety net for real-money testing — they prevent bugs from causing large losses. Admin can adjust via env vars without code changes. Server-side enforcement is mandatory; UI-only limits are insufficient._
