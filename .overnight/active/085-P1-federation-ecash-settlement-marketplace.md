---
id: 85
title: "Build federation ecash settlement endpoint for marketplace revenue sharing"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_20
file: app/api/settlement/route.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: marketplace_integration
group_reason: "Depends on tasks 080 (NUT-24 validation) and 083 (payment SDK). Completes the marketplace payment stack."
---

# Build federation ecash settlement endpoint for marketplace revenue sharing

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 20
**Location:** app/api/settlement/route.ts (new file)

## Problem

Teneo Marketplace has a federation network where nodes share 10-20% revenue on referral sales. Currently revenue shares are just database entries with no actual money movement — the revenue share never results in ecash being sent.

ArxMint should provide a settlement endpoint: when a referral sale completes, it mints Cashu ecash for the referral fee amount and sends it to the referring node's Fedimint guardian.

## How to Fix

Create `app/api/settlement/route.ts`:

```typescript
// POST /api/settlement
// Body: {
//   saleAmount: number,       // in sats
//   referralFeePct: number,   // e.g., 0.15 for 15%
//   recipientFedimintInvite: string,  // Fedimint federation invite code for recipient
//   recipientCashuAddress?: string,   // alternative: Cashu address
//   saleId: string            // marketplace sale ID for dedup
// }

import { getCashuClient } from '@/lib/cashu-sdk';
import { getFedimintClient } from '@/lib/fedimint-sdk';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { saleAmount, referralFeePct, recipientFedimintInvite, recipientCashuAddress, saleId } = await req.json();

  // Validate inputs
  if (!saleAmount || !referralFeePct || (!recipientFedimintInvite && !recipientCashuAddress)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const feeAmount = Math.floor(saleAmount * referralFeePct);
  if (feeAmount < 1) {
    return NextResponse.json({ error: 'Fee amount too small (< 1 sat)' }, { status: 400 });
  }

  // Idempotency: check if settlement for this saleId already processed
  // (store in Transaction table with type='settlement' and notes=saleId)

  if (recipientCashuAddress) {
    // Mint Cashu ecash for the fee amount
    const cashu = getCashuClient();
    const quote = await cashu.createMintQuoteBolt11(feeAmount);
    // Note: requires ArxMint to have LND funding available
    // Return quote for caller to fund, or auto-fund from ArxMint node
    return NextResponse.json({ quote, feeAmount, method: 'cashu' });
  }

  if (recipientFedimintInvite) {
    // Join recipient's federation and deposit
    const fedimint = getFedimintClient();
    await fedimint.joinFederation(recipientFedimintInvite);
    // Deposit ecash into federation
    return NextResponse.json({ feeAmount, method: 'fedimint', status: 'initiated' });
  }
}
```

Also add `GET /api/settlement/:id` to check settlement status.

## Acceptance Criteria

- [ ] `POST /api/settlement` accepts sale amount, fee %, and recipient info
- [ ] Cashu ecash is minted for the fee amount when `recipientCashuAddress` provided
- [ ] Fedimint deposit is initiated when `recipientFedimintInvite` provided
- [ ] Idempotency: duplicate settlement for same `saleId` is rejected
- [ ] Settlement logged to Transaction table with type='settlement'
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 20. Depends on task 080 (NUT-24 real mint validation). This endpoint is called by Teneo Marketplace when a referral sale completes._
