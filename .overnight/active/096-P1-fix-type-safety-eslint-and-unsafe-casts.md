---
id: 96
title: "Fix type-safety: enable ESLint no-explicit-any warn + fix unsafe as-any casts"
priority: P1
severity: high
status: completed
source: code_quality_audit
file: .eslintrc.json
line: 5
created: "2026-02-28T08:00:00Z"
execution_hint: sequential
context_group: type_safety
group_reason: "Same root cause: ESLint config disables any-type checking, enabling unsafe casts in nostr-auth.ts:227 and fedimint-sdk.ts:149"
---

# Fix type-safety: enable ESLint no-explicit-any warn + fix unsafe as-any casts

**Priority:** P1 (high)
**Source:** code_quality_audit
**Locations:** `.eslintrc.json:5`, `lib/nostr-auth.ts:227`, `lib/fedimint-sdk.ts:149`

## Problem

**Finding 1 — ESLint no-explicit-any is disabled (HIGH):**
`.eslintrc.json` has `'@typescript-eslint/no-explicit-any': 'off'`, allowing unbounded use of `any` types throughout the codebase despite `tsconfig.json` having strict mode enabled. This completely defeats strict TypeScript and means type errors in `any`-typed code are invisible in CI.

**Finding 2 — Unsafe type cast in nostr-auth.ts:227:**
```typescript
verifyEvent(event as any)
```
`verifyEvent` from `nostr-tools` accepts a specific `NostrEvent` type. Casting to `any` bypasses compile-time type checking and could allow a malformed event object to reach the verifier.

**Finding 3 — Unsafe type cast in fedimint-sdk.ts:149:**
```typescript
result.payment_type as any
```
The `payment_type` field from Fedimint's payment result should be a typed union (e.g., `'bolt11' | 'onchain'`). Casting to `any` loses type safety on downstream switch/if branches.

## How to Fix

### Step 1: Change ESLint config
In `.eslintrc.json`, change:
```json
"@typescript-eslint/no-explicit-any": "off"
```
to:
```json
"@typescript-eslint/no-explicit-any": "warn"
```
This surfaces `any` usage as warnings (not errors, to avoid breaking the build while fixing incrementally). Run `npm run build` after to confirm no new build failures.

### Step 2: Fix nostr-auth.ts:227
Import the proper Nostr event type and remove the cast:
```typescript
import { verifyEvent, type NostrEvent } from 'nostr-tools';

// Change:
verifyEvent(event as any)

// To (with the event typed as NostrEvent at the parameter level):
verifyEvent(event as NostrEvent)
// or if verifyEvent accepts the broader Event type from nostr-tools:
import type { Event as NostrEventType } from 'nostr-tools';
verifyEvent(event as NostrEventType)
```
Read the current parameter type of `event` in the function signature and use the correct import from `nostr-tools`.

### Step 3: Fix fedimint-sdk.ts:149
Define a proper type for Fedimint payment type and use it:
```typescript
type FedimintPaymentType = 'bolt11' | 'onchain' | string; // extend as needed

// Change:
result.payment_type as any

// To:
result.payment_type as FedimintPaymentType
```
Or better, if the payment_type is only used in a conditional, check it with a string guard:
```typescript
if (result.payment_type === 'bolt11') { ... }
```

## Acceptance Criteria

- [ ] `.eslintrc.json` has `'@typescript-eslint/no-explicit-any': 'warn'` (not `'off'`)
- [ ] `nostr-auth.ts:227` uses proper NostrEvent type, no `as any` cast
- [ ] `fedimint-sdk.ts:149` uses proper type or string union for payment_type, no `as any` cast
- [ ] `npm run build` passes without new errors
- [ ] `npm test` passes

## Notes

_Generated from code_quality_audit round 6. WASM `any` types in fedimint-sdk.ts (WalletDirector, WasmWorkerTransport) and LNC `any` types in lightning-agent.ts are explicitly deferred in lessons.json — do NOT touch those._
