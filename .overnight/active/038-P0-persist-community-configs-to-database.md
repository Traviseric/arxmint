---
id: 38
title: "Persist community configs to database"
priority: P0
severity: high
status: completed
source: project_declared
file: lib/community-generator.ts
line: null
created: "2026-02-27T04:30:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Requires task 037 (Prisma schema). Part of persistence_layer group with 039, 040."
---

# Persist Community Configs to Database

**Priority:** P0 (blocking dashboard data)
**Source:** OVERNIGHT_TASKS.md ID:3
**Location:** `lib/community-generator.ts`, `app/create/page.tsx`, `app/dashboard/page.tsx`

## Problem

After community generation, configs exist only in the Zustand store and are lost on page refresh. There is no backend persistence for communities. The dashboard cannot show previously created communities after a browser reload.

## How to Fix

### Step 1: Create community API route
Create `app/api/community/route.ts` (or update if it exists):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { name, slug, config, description } = body;

  const community = await prisma.community.create({
    data: {
      name,
      slug: slug ?? name.toLowerCase().replace(/\s+/g, '-'),
      config,
      description,
      createdBy: auth.pubkey,
    },
  });
  return NextResponse.json(community, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const communities = await prisma.community.findMany({
    where: { createdBy: auth.pubkey },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(communities);
}
```

### Step 2: Save community after generation
In `app/create/page.tsx` (or the form submit handler), after calling `generateDeployment()`:

```typescript
// After generating the community config:
const savedCommunity = await fetch('/api/community', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: communityConfig.name,
    config: communityConfig,
    description: communityConfig.description,
  }),
});
```

### Step 3: Load communities on dashboard
In `app/dashboard/page.tsx`, fetch communities from the API:

```typescript
useEffect(() => {
  fetch('/api/community')
    .then(r => r.json())
    .then(communities => {
      // Update Zustand store with persisted communities
      setSavedCommunities(communities);
    });
}, []);
```

### Step 4: Update Zustand store
Add `savedCommunities` and `setSavedCommunities` to `lib/store.ts`:

```typescript
savedCommunities: Community[], // from DB
setSavedCommunities: (communities: Community[]) => void;
```

## Acceptance Criteria

- [ ] Community config is saved to the database after generation
- [ ] Dashboard loads saved communities from the database
- [ ] Communities persist across page refresh
- [ ] The community API route uses `requireAuth` (from task 006)
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Dependencies

- **Blocked by:** Task 037 (Prisma schema must exist first)
- **Requires:** Task 006 (auth middleware — already completed)

## Notes

The `config` field stores the full `CommunityConfig` JSON. Use Prisma's `Json` type — no need to map every field to columns. The `slug` should be URL-safe. Use `requireAuth` from `lib/auth-middleware.ts` (already implemented in task 006).

_Generated from OVERNIGHT_TASKS.md P0 ID:3._
