---
id: 4
title: "Persist merchant listings to database"
priority: P0
severity: critical
status: completed
source: gap_analyzer + feature_audit + overnight_tasks
file: components/merchant-onboard.tsx
line: null
created: "2026-02-27T00:00:00"
execution_hint: sequential
context_group: persistence_layer
group_reason: "Same DB layer as tasks 001, 003, 005 — run after 001 completes"
---

# Persist merchant listings to database

**Priority:** P0 (critical)
**Source:** feature_audit MEDIUM + gap_analyzer P1 + OVERNIGHT_TASKS.md (ID: 4)
**Location:** `components/merchant-onboard.tsx`, `app/community/[id]/page.tsx`

## Problem

The merchant onboarding component has a complete multi-step UI (form, QR code generation, NFC tap-to-pay setup, payment URI display) but form data is not saved anywhere. Merchant profiles are stored only in React state and are lost on page refresh. Any merchant who onboards has to repeat the entire setup every session. The community merchant directory is always empty on fresh load.

**Code with issue:**
The `merchant-onboard.tsx` component builds a merchant profile locally but has no API call to persist it. The NFC provisioning step uses a `setTimeout` simulation with no real `navigator.ndf.write` call.

## Dependencies

- **Requires task 001 (Prisma schema) to be completed first** — needs `Merchant` model

## How to Fix

1. Create `app/api/merchants/route.ts`:
   ```typescript
   // POST /api/merchants — create merchant
   export async function POST(request: Request) {
     const body = await request.json();
     const merchant = await db.merchant.create({
       data: {
         communityId: body.communityId,
         name: body.name,
         description: body.description,
         category: body.category,
         cashuAddress: body.cashuAddress,
         lightningAddress: body.lightningAddress,
       }
     });
     return NextResponse.json({ merchant });
   }
   // GET /api/merchants?communityId=xxx — list merchants
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const communityId = searchParams.get('communityId');
     const merchants = await db.merchant.findMany({
       where: communityId ? { communityId } : {},
       orderBy: { createdAt: 'desc' }
     });
     return NextResponse.json({ merchants });
   }
   ```
2. In `components/merchant-onboard.tsx`:
   - On final step submission, call `POST /api/merchants` with the collected form data
   - Show success state with the returned merchant `id`
3. In `app/community/[id]/page.tsx`:
   - Fetch `GET /api/merchants?communityId=id` on mount
   - Render the merchant directory from the fetched list
4. For NFC provisioning: replace the `setTimeout` stub with a comment block:
   ```typescript
   // TODO: Real NFC provisioning requires Web NFC API (navigator.nfc.write)
   // and Numo NFC card backend integration. Currently queues card setup
   // for manual fulfillment. See: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
   ```
   Show a "Card setup queued — Numo will contact you" message instead of simulated success.

## Acceptance Criteria

- [ ] `app/api/merchants/route.ts` POST handler saves merchant to DB
- [ ] `app/api/merchants/route.ts` GET handler returns merchant list by communityId
- [ ] Merchant onboarding form calls API on submission
- [ ] Community page loads merchant directory from DB
- [ ] NFC simulation is replaced with honest "queued" status message
- [ ] `npm run build` passes

## Notes

NFC card provisioning via Web NFC API is a browser experimental feature (Chrome on Android). It's fine to leave it as a manual fulfillment flow with a clear message. Don't simulate fake success.

_Generated from feature_audit "Merchant directory (persistence + NFC)" + gap_analyzer P1 + OVERNIGHT_TASKS.md ID:4._
