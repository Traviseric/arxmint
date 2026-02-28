---
id: 84
title: "Add HTTP API mode for Teneo Marketplace integration"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_19
file: app/api/payment/route.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: marketplace_integration
group_reason: "Depends on task 083 (payment SDK). Together with 085, forms the full marketplace payment layer."
---

# Add HTTP API mode for Teneo Marketplace integration

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 19
**Location:** app/api/payment/ (new directory)

## Problem

Teneo Marketplace is Express.js and cannot import ArxMint TypeScript modules directly. The marketplace needs to call ArxMint as a payment service via REST API. Currently no such API exists — only internal Next.js route handlers that don't expose a clean payment API.

## How to Fix

Create three REST endpoints that wrap the payment SDK:

### `app/api/payment/route.ts` — Create payment challenge

```typescript
// POST /api/payment/create-challenge
// Body: { amount: number, type?: 'l402' | 'cashu' | 'auto', resourceId?: string }
// Returns: PaymentChallenge

import { createL402Challenge, createCashuChallenge, routePayment } from '@/lib/payment-sdk';

export async function POST(req: NextRequest) {
  const { amount, type = 'auto', resourceId } = await req.json();

  if (type === 'auto') {
    const route = await routePayment({ amount });
    // Route to appropriate challenge type
  }
  // ... return challenge
}
```

### `app/api/payment/verify/route.ts` — Verify payment proof

```typescript
// POST /api/payment/verify
// Body: { type: 'l402' | 'cashu', proof: string, challengeId?: string }
// Returns: { success: boolean, error?: string }
```

### `app/api/payment/status/[id]/route.ts` — Check payment status

```typescript
// GET /api/payment/status/:id
// Returns: { status: 'pending' | 'paid' | 'expired', challenge: PaymentChallenge }
```

**CORS config for marketplace domains**:

```typescript
const MARKETPLACE_ORIGINS = [
  'https://teneo-marketplace.com',
  process.env.TENEO_MARKETPLACE_URL,
  'http://localhost:3001' // local dev
].filter(Boolean);
```

**Update `middleware.ts`** to allow these origins on `/api/payment/*` routes.

**Add to `.env.example`**:
```
TENEO_MARKETPLACE_URL=https://teneo-marketplace.com
```

## Acceptance Criteria

- [ ] `POST /api/payment/create-challenge` returns valid payment challenge
- [ ] `POST /api/payment/verify` validates L402 and Cashu proofs
- [ ] `GET /api/payment/status/:id` returns payment status
- [ ] CORS configured for marketplace origins
- [ ] `TENEO_MARKETPLACE_URL` in `.env.example`
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 19. Depends on task 083 (payment SDK). Teneo Marketplace calls these endpoints as a payment service — ArxMint runs as the payment backend alongside the marketplace._
