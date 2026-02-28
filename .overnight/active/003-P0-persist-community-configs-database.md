---
id: 3
title: "Persist community configs to database after generation"
priority: P0
severity: critical
status: completed
source: gap_analyzer + overnight_tasks
file: lib/community-generator.ts
line: null
created: "2026-02-27T00:00:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Touches same DB layer as tasks 001, 004, 005 — run after 001 (Prisma schema) completes"
---

# Persist community configs to database after generation

**Priority:** P0 (critical)
**Source:** gap_analyzer P0 + OVERNIGHT_TASKS.md (ID: 3)
**Location:** `lib/community-generator.ts`, `app/create/page.tsx`, `app/dashboard/page.tsx`

## Problem

Community configurations are generated correctly and stored in Zustand, but Zustand is in-memory. Every page refresh loses all created communities. The dashboard has no way to show previously created communities because there is no persistent source of truth. The entire core product promise ("generate a sovereign economy") is undermined by not saving the result.

## Dependencies

- **Requires task 001 (Prisma schema) to be completed first** — needs `Community` model and `lib/db.ts` singleton

## How to Fix

1. In `app/api/community/route.ts` (POST handler):
   - After `generateDeployment()` returns a config, save it to DB:
     ```typescript
     import { db } from '@/lib/db';
     const saved = await db.community.create({
       data: {
         name: config.name,
         prompt: body.prompt,
         config: config as object,
       }
     });
     return NextResponse.json({ ...config, id: saved.id });
     ```
2. Add `GET /api/community` route to list communities:
   ```typescript
   const communities = await db.community.findMany({ orderBy: { createdAt: 'desc' } });
   return NextResponse.json({ communities });
   ```
3. In `app/dashboard/page.tsx`:
   - On mount, fetch `GET /api/community` and populate the dashboard with saved communities
   - Update Zustand store with fetched communities (so UI is in sync)
4. In `app/create/page.tsx`:
   - After successful community creation, the returned config now has `id` — store it in Zustand and navigate to `/community/${id}`

## Acceptance Criteria

- [ ] Communities are saved to PostgreSQL `Community` table after generation
- [ ] Dashboard loads previously created communities from DB on page load
- [ ] Community `id` from DB is used in routing to `/community/[id]`
- [ ] Page refresh does not lose communities
- [ ] `npm run build` passes

## Notes

The `config` field in the Community model is `Json` type in Prisma — the entire `CommunityConfig` object can be stored as JSON. No need to normalize sub-fields at this stage.

_Generated from gap_analyzer P0 "Data persistence" + OVERNIGHT_TASKS.md ID:3._
