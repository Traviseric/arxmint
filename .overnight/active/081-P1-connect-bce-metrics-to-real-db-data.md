---
id: 81
title: "Connect BCE metrics to real transaction data from Postgres"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_10
file: lib/bce-metrics.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Reads from Transaction table — depends on tasks 073 (schema) and 077 (ledger)."
---

# Connect BCE metrics to real transaction data from Postgres

**Priority:** P1 (medium)
**Source:** OVERNIGHT_TASKS.md ID 10
**Location:** lib/bce-metrics.ts, app/dashboard/page.tsx

## Problem

`lib/bce-metrics.ts` uses `getDemoBCEMetrics()` which returns hardcoded values. The dashboard shows fake circular economy metrics. Metrics should be computed from real transaction data in the Postgres Transaction table.

Key metrics to compute from real data:
- `merchantCount` — count distinct merchants from Merchant table
- `activeSpenders` — count distinct counterparties in recent transactions
- `spendVelocity` — sum of amounts over past 7 days
- `successRate` — confirmed / (confirmed + failed) transactions

## How to Fix

1. **Update `lib/bce-metrics.ts`**: Replace `getDemoBCEMetrics()` with real DB computation:

```typescript
import { prisma } from '@/lib/prisma';

export async function computeRealBCEMetrics(communityId?: string): Promise<BCEMetrics> {
  const where = communityId ? { communityId } : {};
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [merchantCount, recentTxs, allTxs] = await Promise.all([
    prisma.merchant.count({ where }),
    prisma.transaction.findMany({
      where: { ...where, timestamp: { gte: sevenDaysAgo } },
      select: { counterparty: true, amount: true, status: true }
    }),
    prisma.transaction.findMany({
      where,
      select: { status: true }
    })
  ]);

  const activeSpenders = new Set(recentTxs.map(t => t.counterparty).filter(Boolean)).size;
  const spendVelocity = recentTxs.filter(t => t.status === 'confirmed').reduce((sum, t) => sum + t.amount, 0);
  const confirmed = allTxs.filter(t => t.status === 'confirmed').length;
  const failed = allTxs.filter(t => t.status === 'failed').length;
  const successRate = confirmed + failed > 0 ? confirmed / (confirmed + failed) : 1;

  return { merchantCount, activeSpenders, spendVelocity, successRate };
}
```

2. **Update `app/dashboard/page.tsx`**: Replace `getDemoBCEMetrics()` call with `computeRealBCEMetrics()`. Use server-side data fetching or API route.

3. **Create `app/api/bce-metrics/route.ts`**: Expose BCE metrics as an API endpoint for client-side polling.

4. **Keep `getDemoBCEMetrics()` as a fallback** for when DB is unavailable (dev without Postgres).

## Acceptance Criteria

- [ ] Dashboard shows real merchant count from DB
- [ ] Active spenders computed from transaction counterparties
- [ ] Spend velocity computed from last 7 days of confirmed transactions
- [ ] Falls back to demo metrics when DB unavailable
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 10. Depends on tasks 073 (schema fix), 075 (community persistence), 077 (transaction ledger)._
