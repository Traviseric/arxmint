---
id: 76
title: "Wire merchant onboarding to persist listings in Postgres"
priority: P0
severity: high
status: completed
source: overnight_tasks_id_4
file: components/merchant-onboard.tsx
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Same DB layer as tasks 073, 075, 077. Depends on task 073 (fixed schema)."
---

# Wire merchant onboarding to persist listings in Postgres

**Priority:** P0 (high)
**Source:** OVERNIGHT_TASKS.md ID 4
**Location:** components/merchant-onboard.tsx, app/community/[id]/page.tsx

## Problem

The merchant onboarding form in `components/merchant-onboard.tsx` collects merchant data (name, description, category, Cashu address, Lightning address, etc.) but currently only saves it to localStorage (task 070 added localStorage persistence). There is no server-side persistence — if localStorage is cleared or the merchant opens the app on a different device, all merchant data is lost.

The `prisma/schema.prisma` has a `Merchant` model that is never written to. Community directory pages cannot show merchant listings because there's no DB to read from.

## How to Fix

1. **Create API route `app/api/merchants/route.ts`**:
   - `POST /api/merchants` — save merchant listing to Postgres
   - `GET /api/merchants?communityId=xxx` — list merchants for a community

```typescript
// app/api/merchants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { communityId, name, description, category, cashuAddress, lightningAddress, metadata } = await req.json();
  const merchant = await prisma.merchant.create({
    data: { communityId, name, description, category, cashuAddress, lightningAddress, metadata }
  });
  return NextResponse.json({ merchant });
}

export async function GET(req: NextRequest) {
  const communityId = req.nextUrl.searchParams.get('communityId');
  const where = communityId ? { communityId } : {};
  const merchants = await prisma.merchant.findMany({ where, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ merchants });
}
```

2. **Update `components/merchant-onboard.tsx`**: On successful form submission, call `POST /api/merchants`. Keep localStorage as a local cache/fallback. On success, show confirmation and clear the form.

3. **Update `app/community/[id]/page.tsx`** (or equivalent community listing page): Fetch merchants from `GET /api/merchants?communityId={id}` and display them. Replace any hardcoded or in-memory merchant arrays.

4. **Reuse `lib/prisma.ts`** singleton created in task 075.

## Acceptance Criteria

- [ ] `POST /api/merchants` saves merchant data to Postgres Merchant table
- [ ] `GET /api/merchants` returns merchants with optional communityId filter
- [ ] Merchant onboarding form calls the API on submit
- [ ] Community directory page loads merchants from DB
- [ ] Merchant data survives page refresh and browser restart
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 4. Depends on task 073 (fixed schema). Task 070 already added localStorage as a cache — keep it as a fallback when the DB API is unavailable._
