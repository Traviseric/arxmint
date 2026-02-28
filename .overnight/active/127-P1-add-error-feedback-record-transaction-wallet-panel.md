---
id: 127
title: "Add error feedback when recordTransaction fails in wallet panel"
priority: P1
severity: high
status: completed
source: ux_audit
file: components/wallet-panel.tsx
line: 50
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: wallet_panel
group_reason: "Same file as tasks 122, 129, 132"
---

# Add error feedback when recordTransaction fails in wallet panel

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** components/wallet-panel.tsx:50

## Problem

When `recordTransaction()` fails (e.g., DB is unavailable), the wallet operation (send/receive/swap) itself may succeed but the transaction is not recorded in the ledger. The user receives no indication that their transaction history wasn't saved. This is distinct from task 098 which added error UI for loading transaction history — this is about writing a transaction record after a payment.

If the DB is down during a payment, the user's wallet balance changes correctly but the transaction ledger is silently incomplete, making it hard to reconcile activity.

**Pattern with issue:**
```tsx
// Transaction recording likely wraps API call without user-visible error feedback:
await recordTransaction({ ... });
// If this throws, the error is swallowed or logged to console only
```

## How to Fix

Add a try-catch around `recordTransaction()` calls and surface a non-blocking warning to the user when recording fails. The payment itself should still succeed; this is just a ledger recording issue.

```tsx
try {
  await recordTransaction({
    type: "receive",
    amount: amountSats,
    backend: "cashu",
    status: "completed",
  });
} catch (err: unknown) {
  // Payment succeeded but ledger recording failed — warn without blocking
  console.warn("Transaction record failed:", err);
  setTxRecordError("Payment succeeded, but transaction wasn't saved to history.");
}
```

Then render `txRecordError` as a dismissible warning toast or banner using the `.sovereign-card` style with `text-yellow-400` text (amber warning, not red error — payment did succeed).

## Acceptance Criteria

- [ ] `recordTransaction()` failures are caught and surfaced to the user
- [ ] Warning message is non-blocking (payment flow continues)
- [ ] Warning uses amber/yellow styling to distinguish from payment failure (red)
- [ ] Warning is dismissible or auto-clears after a reasonable time
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: feedback)._
