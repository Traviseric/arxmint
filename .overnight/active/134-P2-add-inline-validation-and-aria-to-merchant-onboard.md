---
id: 134
title: "Add inline validation feedback and aria-label to merchant-onboard form"
priority: P2
severity: medium
status: completed
source: ux_audit
file: components/merchant-onboard.tsx
line: 173
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: merchant_form
group_reason: "Same file as task 121"
---

# Add inline validation feedback and aria-label to merchant-onboard form

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** components/merchant-onboard.tsx:173, 222
**WCAG:** 3.3.1 Error Identification (Level A), 1.3.1 Info and Relationships (Level A)

## Problem

**Issue 1 — No inline validation (line 173):**
Form fields show no validation feedback until the user attempts to proceed to the next step. Errors are only shown on submit, not on blur. Users don't know a field is invalid until they hit proceed.

**Issue 2 — Textarea missing aria-label (line 222):**
The description textarea is linked to a character counter via `aria-describedby` but lacks an `aria-label` explaining the character limit to screen readers. Screen readers read the counter value but without context.

## How to Fix

**Fix 1 — On-blur validation:**
Add `onBlur` validation handlers for each required field:
```tsx
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const validateField = (name: string, value: string) => {
  if (name === 'businessName' && !value.trim()) {
    setFieldErrors(prev => ({ ...prev, businessName: 'Business name is required' }));
  } else {
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  }
};

<input
  onBlur={(e) => validateField('businessName', e.target.value)}
  aria-describedby={fieldErrors.businessName ? 'businessName-error' : undefined}
  className={`sovereign-input ${fieldErrors.businessName ? 'border-red-500' : ''}`}
  ...
/>
{fieldErrors.businessName && (
  <p id="businessName-error" role="alert" className="text-xs text-red-400 mt-1">
    {fieldErrors.businessName}
  </p>
)}
```

**Fix 2 — aria-label on description textarea:**
```tsx
<textarea
  aria-label="Business description, maximum 200 characters"
  aria-describedby="description-counter"
  maxLength={200}
  ...
/>
<p id="description-counter" className="text-xs text-sovereign-muted text-right">
  {description.length}/200
</p>
```

## Acceptance Criteria

- [ ] Required form fields show validation errors on blur (not only on submit)
- [ ] Error messages have `role="alert"` so they're announced by screen readers
- [ ] Description textarea has `aria-label` with character limit info
- [ ] Existing submit-time validation is preserved (don't remove it)
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit findings (severity: medium, category: forms) — merged two adjacent merchant-onboard form issues._
