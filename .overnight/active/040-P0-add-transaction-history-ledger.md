---
id: 40
title: "Add transaction history / ledger"
priority: P0
severity: high
status: completed
source: project_declared
file: components/wallet-panel.tsx
line: null
created: "2026-02-27T04:30:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Requires task 037 (Prisma schema). Part of persistence_layer group with 038, 039."
---

# Add Transaction History / Ledger

**Priority:** P0 (no audit trail for payments)
**Source:** OVERNIGHT_TASKS.md ID:5
**Location:** `components/wallet-panel.tsx`, new `app/api/transactions/route.ts`

## Problem

No transaction logging exists anywhere. Payments happen in-memory with no record. There is no ledger component, no journal API, no export. BCE metrics reference transaction data but use hardcoded demo values because no real transaction data exists.

## How to Fix

### Step 1: Create transaction API route
Create `app/api/transactions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { communityId, type, amount, backend, status, counterparty, memo } = body;

  const tx = await prisma.transaction.create({
    data: {
      communityId,
      pubkey: auth.pubkey,
      type,    // 'send' | 'receive' | 'swap'
      amount,  // sats
      backend, // 'cashu' | 'fedimint' | 'lightning'
      status: status ?? 'confirmed',
      counterparty,
      memo,
    },
  });
  return NextResponse.json(tx, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const communityId = searchParams.get('communityId') ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: { pubkey: auth.pubkey, communityId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json(transactions);
}
```

### Step 2: Log transactions from wallet operations
In `lib/cashu-sdk.ts` (SovereignCashuClient), after successful send/receive:

```typescript
// After successful payment:
await fetch('/api/transactions', {
  method: 'POST',
  body: JSON.stringify({
    type: 'send',
    amount: amountSats,
    backend: 'cashu',
    status: 'confirmed',
    memo,
  }),
});
```

Or create a helper `lib/transaction-logger.ts`:
```typescript
export async function logTransaction(tx: {
  type: 'send' | 'receive' | 'swap';
  amount: number;
  backend: string;
  communityId?: string;
  counterparty?: string;
  memo?: string;
}) {
  await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...tx, status: 'confirmed' }),
  });
}
```

### Step 3: Add transaction list to wallet panel
In `components/wallet-panel.tsx`, add a transaction history section:

```typescript
const [transactions, setTransactions] = useState<Transaction[]>([]);

useEffect(() => {
  fetch('/api/transactions?limit=20')
    .then(r => r.json())
    .then(setTransactions);
}, []);

// In the render:
<div className="sovereign-card mt-4">
  <h3 className="text-sm font-medium text-sovereign-muted">Recent Transactions</h3>
  {transactions.map(tx => (
    <div key={tx.id} className="flex justify-between py-2 border-b border-sovereign-panel">
      <span className={tx.type === 'receive' ? 'text-green-400' : 'text-sovereign-text'}>
        {tx.type === 'receive' ? '+' : '-'}{tx.amount} sats
      </span>
      <span className="text-sovereign-muted text-xs">
        {tx.backend} · {new Date(tx.createdAt).toLocaleTimeString()}
      </span>
    </div>
  ))}
</div>
```

## Acceptance Criteria

- [ ] `app/api/transactions/route.ts` created with GET and POST handlers
- [ ] Transactions are logged when Cashu send/receive occurs
- [ ] Wallet panel shows recent transaction list loaded from the database
- [ ] Transactions persist across page refresh
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Dependencies

- **Blocked by:** Task 037 (Prisma schema must exist first)
- **Requires:** Task 006 (auth middleware — already completed)
- **Enables:** BCE metrics real data (the metrics can query this table once populated)

## Notes

The Transaction model includes `backend` field — log which backend (cashu/fedimint/lightning) each payment used. This enables BCE metrics to compute real backend-split data later. Log transactions from at minimum the Cashu send/receive paths — Lightning and Fedimint can be added incrementally.

_Generated from OVERNIGHT_TASKS.md P0 ID:5._
