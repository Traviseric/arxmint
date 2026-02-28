---
id: 120
title: "Add retry button on community generation error"
priority: P0
severity: critical
status: completed
source: ux_audit
file: components/create-community-form.tsx
line: 60
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: create_form
group_reason: "Same file as tasks 123, 135"
---

# Add retry button on community generation error

**Priority:** P0 (critical)
**Source:** ux_audit
**Location:** components/create-community-form.tsx:60

## Problem

When the community generation API call fails, an error message is shown (via `generateError` state at line 180) but there is no retry button or clear recovery path. Users must manually scroll up, re-read the form, and re-submit from scratch. The form state is preserved but the path to retry is unclear.

**Code with issue:**
```tsx
{generateError && (
  <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
    {generateError}
  </div>
)}
```

## How to Fix

Add a 'Retry' button inside the error alert that calls the existing generation handler without clearing form state. The button should:
1. Appear inline within or directly below the error message div
2. Re-call the `handleGenerate` function (or equivalent submit handler)
3. Clear the error on retry attempt start
4. Use the `.sovereign-btn-outline` CSS class to match the project style

Example:
```tsx
{generateError && (
  <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
    <div className="flex items-center justify-between gap-3">
      <span>{generateError}</span>
      <button
        onClick={handleGenerate}
        className="sovereign-btn-outline text-xs px-3 py-1 shrink-0"
      >
        Retry
      </button>
    </div>
  </div>
)}
```

## Acceptance Criteria

- [ ] Error message includes a visible Retry button
- [ ] Clicking Retry re-submits the generation without clearing form input
- [ ] Error message clears when Retry is clicked (before new attempt starts)
- [ ] No regressions to the success/output flow
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: critical, category: flow)._
