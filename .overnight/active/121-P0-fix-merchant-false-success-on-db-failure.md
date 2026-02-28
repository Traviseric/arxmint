---
id: 121
title: "Fix merchant false success screen on DB save failure"
priority: P0
severity: critical
status: completed
source: ux_audit
file: components/merchant-onboard.tsx
line: 424
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: merchant_form
group_reason: "Same file as task 134"
---

# Fix merchant false success screen on DB save failure

**Priority:** P0 (critical)
**Source:** ux_audit
**Location:** components/merchant-onboard.tsx:424

## Problem

When the DB save fails during merchant submission, the current catch block (line 437) calls `setStep("complete")` even on failure. This means the user sees the "Listed!" success screen and believes their listing was saved to the database, when in fact it only exists locally in Zustand state (and will be lost on page refresh).

**Code with issue:**
```tsx
} catch (err: unknown) {
  // Fallback: complete locally even if DB save fails
  setSubmitError(`Note: ${err instanceof Error ? err.message : String(err)} — listing shown locally only`);
  addMerchant(merchant);
  saveMerchantsToStorage();
  onComplete(savedMerchant);
  setStep("complete");  // ← THIS is the problem: success screen shown on DB error
}
```

The error note is set via `setSubmitError` but the step transitions to "complete" anyway, likely hiding the error message behind the success screen.

## How to Fix

On DB error, do NOT transition to the "complete" step. Instead:
1. Stay on the current review/submission step
2. Show the error prominently with a retry option
3. Only call `setStep("complete")` when the DB save actually succeeds

```tsx
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  setSubmitError(`Failed to save listing: ${message}. Please retry.`);
  // Do NOT call setStep("complete") — keep user on review screen
  // Optionally still save to local state as fallback so data isn't lost:
  addMerchant(merchant);
  saveMerchantsToStorage();
  // Let user see the error and retry
}
```

The review step should render `submitError` visibly with a retry button that re-calls the submission handler.

## Acceptance Criteria

- [ ] DB failure does NOT transition user to "Listed!" success screen
- [ ] Error message is visible on the review/submission step
- [ ] A retry option is available after DB failure
- [ ] Successful DB save still transitions to success screen as before
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: critical, category: feedback)._
