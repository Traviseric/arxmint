---
id: 77
title: "Add transaction history ledger with Postgres persistence"
priority: P0
severity: high
status: completed
source: overnight_tasks_id_5
file: components/wallet-panel.tsx
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Same DB layer as tasks 073-076. BCE metrics (task 081) depends on this data."
---

# Add transaction history ledger with Postgres persistence

**Priority:** P0 (high)
**Source:** OVERNIGHT_TASKS.md ID 5
**Location:** components/wallet-panel.tsx, new app/api/transactions/route.ts

## Problem

ArxMint has no transaction history. Every send/receive/swap in the wallet panel disappears on refresh. The `Transaction` model in the Prisma schema exists but no code writes to it. Users have no record of their payment activity — no receipts, no history, no debugging trail.

**Critical architecture constraint:** The Transaction table stores **metadata only** — type, amount, backend, timestamp, status. It must NEVER store raw Cashu proofs (those go in the client-side vault per Research #1).

## How to Fix

1. **Create API route `app/api/transactions/route.ts`**:
   - `POST /api/transactions` — record a transaction event (metadata only)
   - `GET /api/transactions?communityId=xxx` — list transactions for display

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { communityId, type, amount, backend, status, counterparty, notes } = await req.json();
  // Validate: reject any request that includes proof data
  const tx = await prisma.transaction.create({
    data: { communityId, type, amount, backend, status, counterparty, notes }
  });
  return NextResponse.json({ transaction: tx });
}

export async function GET(req: NextRequest) {
  const communityId = req.nextUrl.searchParams.get('communityId');
  const transactions = await prisma.transaction.findMany({
    where: communityId ? { communityId } : {},
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  return NextResponse.json({ transactions });
}
```

2. **Update `components/wallet-panel.tsx`**: After each send/receive/swap operation completes, call `POST /api/transactions` with metadata. Show a transaction history list in the panel (most recent 10-20 txs).

3. **Create transaction helper in `lib/cashu-sdk.ts` or a new `lib/tx-logger.ts`**:
```typescript
export async function logTransaction(params: {
  communityId: string;
  type: 'send' | 'receive' | 'swap';
  amount: number;
  backend: 'cashu' | 'lightning' | 'fedimint';
  status: 'pending' | 'confirmed' | 'failed';
  counterparty?: string;
}) {
  await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
}
```

4. **Display in wallet panel**: Fetch `GET /api/transactions` on mount, display in a scrollable list with type icon, amount, backend badge, and timestamp.

## Acceptance Criteria

- [ ] `POST /api/transactions` creates transaction records (metadata only — no raw proofs)
- [ ] `GET /api/transactions` returns transaction history
- [ ] Wallet panel records transactions on send/receive/swap
- [ ] Transaction history is visible in wallet panel UI
- [ ] History survives page refresh
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 5. Depends on task 073 (fixed schema with Transaction.notes instead of proofData). BCE metrics wiring (task 081) depends on this table having real data._
