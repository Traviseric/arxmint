---
id: 122
title: "Fix password input label associations in wallet panel seed backup"
priority: P0
severity: critical
status: completed
source: ux_audit
file: components/wallet-panel.tsx
line: 1235
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: wallet_panel
group_reason: "Same file as tasks 127, 129, 132"
---

# Fix password input label associations in wallet panel seed backup

**Priority:** P0 (critical)
**Source:** ux_audit
**Location:** components/wallet-panel.tsx:1235
**WCAG:** 1.3.1 Info and Relationships (Level A)

## Problem

The seed backup/restore section in the wallet panel uses `<label className="sovereign-label">` elements, but none have `htmlFor` attributes, and the corresponding `<input>` elements have no `id` attributes. This means labels are visually present but not programmatically associated with their inputs.

Screen readers cannot identify the purpose of these password fields. This is a WCAG Level A violation affecting all users of assistive technology.

**Code with issue (example at line ~1231-1245):**
```tsx
<label className="sovereign-label">Pairing Phrase (10 words)</label>
<input
  type="password"
  // no id attribute — label cannot reference this input
  ...
/>

<label className="sovereign-label">Password (optional)</label>
<input
  type="password"
  // no id attribute
  ...
/>
```

## How to Fix

Add `htmlFor` to each label and matching `id` to each input in the seed backup/restore section. Apply the same fix to any other password inputs in the wallet panel that lack this association.

```tsx
<label htmlFor="seed-pairing-phrase" className="sovereign-label">
  Pairing Phrase (10 words)
</label>
<input
  id="seed-pairing-phrase"
  type="password"
  ...
/>

<label htmlFor="seed-password" className="sovereign-label">
  Password (optional)
</label>
<input
  id="seed-password"
  type="password"
  ...
/>
```

Scan the entire wallet-panel.tsx for any other `<label>` elements missing `htmlFor` and fix them all in one pass.

## Acceptance Criteria

- [ ] All `<label>` elements in seed backup/restore form have `htmlFor` attributes
- [ ] All corresponding `<input>` elements have matching `id` attributes
- [ ] No other labels in wallet-panel.tsx are missing `htmlFor` associations
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: critical, category: accessibility, WCAG 1.3.1 Level A)._
