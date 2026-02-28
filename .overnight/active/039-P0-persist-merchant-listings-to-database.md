---
id: 39
title: "Persist merchant listings to database"
priority: P0
severity: high
status: completed
source: project_declared
file: components/merchant-onboard.tsx
line: null
created: "2026-02-27T04:30:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Requires task 037 (Prisma schema). Part of persistence_layer group with 038, 040."
---

# Persist Merchant Listings to Database

**Priority:** P0 (merchant onboarding data loss)
**Source:** OVERNIGHT_TASKS.md ID:4
**Location:** `components/merchant-onboard.tsx`, `app/community/[id]/page.tsx`

## Problem

Merchant onboarding form collects: name, category, description, payment URI (BIP-21/BOLT11/Cashu), Lightning address, and NFC config. However, the data is stored only in React state / Zustand in-memory and is completely lost on page refresh. Merchants must re-onboard every session.

## How to Fix

### Step 1: Create merchant API route
Create `app/api/merchants/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { communityId, name, category, description, paymentUri, lightningAddress } = body;

  const merchant = await prisma.merchant.create({
    data: {
      communityId,
      name,
      category,
      description,
      paymentUri,
      lightningAddress,
    },
  });
  return NextResponse.json(merchant, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');

  const merchants = await prisma.merchant.findMany({
    where: communityId ? { communityId } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(merchants);
}
```

### Step 2: Save merchant on form submit
In `components/merchant-onboard.tsx`, in the final submission handler (the "Complete Setup" or submit step):

```typescript
const handleMerchantSubmit = async () => {
  const response = await fetch('/api/merchants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      communityId: currentCommunityId, // from Zustand store
      name: formData.name,
      category: formData.category,
      description: formData.description,
      paymentUri: formData.paymentUri,
      lightningAddress: formData.lightningAddress,
    }),
  });
  if (response.ok) {
    const saved = await response.json();
    // Update local state with the saved merchant
    setSavedMerchantId(saved.id);
    onComplete(saved);
  }
};
```

### Step 3: Load merchants in community directory
In `app/community/[id]/page.tsx`:

```typescript
const { data: merchants } = await fetch(`/api/merchants?communityId=${communityId}`).then(r => r.json());
```

### Step 4: Update Zustand store
Add merchant state to `lib/store.ts`:

```typescript
savedMerchants: Merchant[];
setSavedMerchants: (merchants: Merchant[]) => void;
```

## Acceptance Criteria

- [ ] Merchant data is saved to the database on form completion
- [ ] Community directory loads merchants from the database
- [ ] Merchants persist across page refresh
- [ ] The merchant API supports filtering by `communityId`
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Dependencies

- **Blocked by:** Task 037 (Prisma schema must exist first)
- **Requires:** Task 006 (auth middleware — already completed)

## Notes

The NFC provisioning feature (navigator.nfc.write) remains a TODO — this task only covers data persistence, not NFC. Read `components/merchant-onboard.tsx` fully before modifying to understand the form flow and existing state management.

_Generated from OVERNIGHT_TASKS.md P0 ID:4._
