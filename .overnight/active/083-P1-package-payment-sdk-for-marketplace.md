---
id: 83
title: "Package L402 + NUT-24 + spend router as importable payment SDK"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_18
file: lib/payment-sdk.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: marketplace_integration
group_reason: "Tasks 084 (HTTP API) and 085 (settlement) build on this SDK."
---

# Package L402 + NUT-24 + spend router as importable payment SDK

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 18
**Location:** lib/payment-sdk.ts (new), lib/index.ts (new)

## Problem

Teneo Marketplace (`C:\code\teneo-marketplace`, github.com/Traviseric/teneo-marketplace) needs to use ArxMint's payment primitives — but they're scattered across multiple files (`lib/cashu-paywall.ts`, `lib/spend-router.ts`, `app/api/l402/route.ts`) with no clean public API. The marketplace cannot import these without understanding ArxMint internals.

## How to Fix

Create `lib/payment-sdk.ts` with a clean unified API:

```typescript
// lib/payment-sdk.ts
// ArxMint Payment SDK — importable by Teneo Marketplace and other integrators

export interface PaymentChallenge {
  type: 'l402' | 'cashu';
  amount: number;
  currency: 'sats';
  invoice?: string;       // for L402: Lightning invoice
  mintUrl?: string;       // for Cashu: mint to request token from
  macaroon?: string;      // for L402: macaroon to include in proof
  expiresAt: number;
}

export interface PaymentResult {
  success: boolean;
  type: 'l402' | 'cashu';
  proof?: string;         // preimage (L402) or token (Cashu)
  error?: string;
}

export interface SpendRoute {
  backend: 'cashu' | 'lightning' | 'fedimint';
  reason: string;
  estimatedFee: number;
}

/**
 * Create a payment challenge for the given amount.
 * Returns L402 or Cashu challenge based on amount and privacy preference.
 */
export async function createL402Challenge(params: {
  amount: number;
  resourcePath: string;
  mintUrl?: string;
  lndConfig?: { host: string; macaroon: string; cert: string };
}): Promise<PaymentChallenge>

/**
 * Verify an L402 token (macaroon + preimage pair).
 */
export async function verifyL402Token(params: {
  macaroon: string;
  preimage: string;
  lndConfig?: { host: string; macaroon: string; cert: string };
}): Promise<PaymentResult>

/**
 * Create a Cashu ecash payment challenge.
 */
export async function createCashuChallenge(params: {
  amount: number;
  mintUrl: string;
}): Promise<PaymentChallenge>

/**
 * Verify a Cashu ecash token payment.
 */
export async function verifyCashuPayment(params: {
  token: string;
  expectedAmount: number;
  mintUrl: string;
}): Promise<PaymentResult>

/**
 * Route a payment to the best backend.
 * amount: sats, privacyLevel: 'standard' | 'enhanced' | 'maximum'
 */
export async function routePayment(params: {
  amount: number;
  privacyLevel?: 'standard' | 'enhanced' | 'maximum';
  availableBackends?: Array<'cashu' | 'lightning' | 'fedimint'>;
}): Promise<SpendRoute>
```

Implementation should:
- Extract logic from `lib/cashu-paywall.ts` into `verifyCashuPayment()`
- Extract logic from `app/api/l402/route.ts` into `createL402Challenge()` and `verifyL402Token()`
- Wrap `lib/spend-router.ts` `routeSpend()` in `routePayment()`

Create `lib/index.ts` barrel export:
```typescript
export { createL402Challenge, verifyL402Token, createCashuChallenge, verifyCashuPayment, routePayment } from './payment-sdk';
export type { PaymentChallenge, PaymentResult, SpendRoute } from './payment-sdk';
```

## Acceptance Criteria

- [ ] `lib/payment-sdk.ts` created with all 5 exported functions
- [ ] `lib/index.ts` barrel export created
- [ ] `createL402Challenge()` and `verifyL402Token()` work end-to-end
- [ ] `createCashuChallenge()` and `verifyCashuPayment()` work end-to-end
- [ ] `routePayment()` returns correct backend based on amount and privacy
- [ ] TypeScript types exported: `PaymentChallenge`, `PaymentResult`, `SpendRoute`
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 18. This is the foundation for tasks 084 (HTTP API) and 085 (settlement endpoint). The SDK lets Teneo Marketplace integrate ArxMint payments without knowing internals._
