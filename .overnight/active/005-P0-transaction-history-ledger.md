---
id: 5
title: "Add transaction history and ledger"
priority: P0
severity: critical
status: completed
source: gap_analyzer + overnight_tasks
file: components/wallet-panel.tsx
line: null
created: "2026-02-27T00:00:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Same DB layer as tasks 001, 003, 004 — run after 001. BCE metrics (task 012) depends on this"
---

# Add transaction history and ledger

**Priority:** P0 (critical)
**Source:** gap_analyzer P1 + OVERNIGHT_TASKS.md (ID: 5)
**Location:** `components/wallet-panel.tsx`, new `app/api/transactions/route.ts`

## Problem

No transaction logging exists anywhere. Payments happen in-memory with no record. When a send or receive operation completes, nothing is saved. There is no ledger, no audit trail, no export. The BCE metrics dashboard references transaction data but uses hardcoded demo values because there is no real transaction pipeline. Users have no way to review payment history.

## Dependencies

- **Requires task 001 (Prisma schema) to be completed first** — needs `Transaction` model
- **Task 012 (BCE real data) depends on this task**

## How to Fix

1. Create `app/api/transactions/route.ts`:
   ```typescript
   // POST /api/transactions — record a transaction
   export async function POST(request: Request) {
     const body = await request.json();
     const tx = await db.transaction.create({
       data: {
         communityId: body.communityId,
         type: body.type, // 'send' | 'receive' | 'swap'
         amount: body.amount,
         backend: body.backend, // 'cashu' | 'lightning' | 'fedimint'
         status: body.status ?? 'completed',
         counterparty: body.counterparty ?? null,
         proofData: body.proofData ?? null,
       }
     });
     return NextResponse.json({ transaction: tx });
   }
   // GET /api/transactions?communityId=xxx&limit=50
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const communityId = searchParams.get('communityId');
     const limit = parseInt(searchParams.get('limit') ?? '50');
     const txs = await db.transaction.findMany({
       where: communityId ? { communityId } : {},
       orderBy: { timestamp: 'desc' },
       take: limit,
     });
     return NextResponse.json({ transactions: txs });
   }
   ```
2. In `components/wallet-panel.tsx`:
   - After every successful send/receive in the Cashu, Fedimint, and Lightning handlers, call `POST /api/transactions`
   - Add a "Transaction History" section below the send/receive UI that fetches `GET /api/transactions?communityId=...` and renders a list
   - Show: date, type (sent/received), amount (sats), backend, status
3. In `lib/store.ts`:
   - Add `transactions: Transaction[]` to the store state
   - Add `addTransaction(tx: Transaction)` action
   - Update relevant send/receive actions to call `addTransaction`

## Acceptance Criteria

- [ ] `app/api/transactions/route.ts` exists with POST and GET handlers
- [ ] Every send/receive/swap in wallet-panel.tsx records a transaction via API
- [ ] Transaction history renders in wallet panel (most recent first)
- [ ] `npm run build` passes
- [ ] Transactions persist across page refresh

## Notes

Fields: `type` (send/receive/swap), `amount` (bigint sats), `backend` (cashu/lightning/fedimint), `timestamp` (auto-set by Prisma), `status` (pending/completed/failed), `counterparty` (optional address/pubkey), `proofData` (optional JSON for Cashu proofs).

_Generated from gap_analyzer P1 "Transaction history" + OVERNIGHT_TASKS.md ID:5._
