---
id: 98
title: "Fix silent DB error swallow in wallet-panel.tsx — log + set UI error state"
priority: P2
severity: medium
status: completed
source: code_quality_audit
file: components/wallet-panel.tsx
line: 851
created: "2026-02-28T08:00:00Z"
execution_hint: sequential
context_group: error_handling
group_reason: "Same file as task 097 (wallet-panel.tsx). Should be done after 097 to avoid conflicts."
---

# Fix silent DB error swallow in wallet-panel.tsx — log + set UI error state

**Priority:** P2 (medium)
**Source:** code_quality_audit
**Location:** `components/wallet-panel.tsx:851`

## Problem

In `wallet-panel.tsx` around line 851, there is a `.catch()` block that silently swallows database errors:

```typescript
// Approximate pattern at line 851:
.catch(() => {/* DB unavailable — ignore */})
```

When the transaction history fails to load (DB down, network error, Prisma error), the UI gives no indication to the user — the transaction list simply appears empty, indistinguishable from "no transactions yet."

This is problematic because:
1. Users cannot tell if their transaction history failed to load vs. having no history
2. Errors are undetectable during development/testing
3. Silent failures make debugging production issues impossible

## How to Fix

Replace the silent catch with one that:
1. Logs the error to the console (at warn level since DB unavailability is expected in some deployments)
2. Sets an error state to inform the UI

```typescript
// BEFORE:
.catch(() => {/* DB unavailable — ignore */})

// AFTER:
.catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn('[wallet-panel] Transaction history unavailable:', msg);
  setTxLoadError('Transaction history temporarily unavailable');
})
```

Add the corresponding state variable if not already present:
```typescript
const [txLoadError, setTxLoadError] = useState<string | null>(null);
```

And display the error state in the transaction list section:
```typescript
{txLoadError ? (
  <p className="text-sovereign-muted text-sm">{txLoadError}</p>
) : (
  // existing transaction list render
)}
```

The message should be user-friendly (not a raw error). Keep the fallback behavior (showing empty list), but make it visible to the user.

## Acceptance Criteria

- [ ] `.catch(() => {})` silent swallow is replaced with logging + state update
- [ ] User sees a non-empty message when transaction history fails to load
- [ ] Error is logged to console at `warn` level (not `error` — DB unavailable is expected)
- [ ] Normal transaction loading flow is not disrupted
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from code_quality_audit round 6. This is separate from the catch(e:any) pattern fix in task 097 — here the issue is silent swallowing, not type safety. Task 097 should be done first since it also touches wallet-panel.tsx._
