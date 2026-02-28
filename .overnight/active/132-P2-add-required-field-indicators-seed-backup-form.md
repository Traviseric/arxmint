---
id: 132
title: "Add required field indicators to seed backup/restore form in wallet panel"
priority: P2
severity: medium
status: completed
source: ux_audit
file: components/wallet-panel.tsx
line: 1200
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: wallet_panel
group_reason: "Same file as tasks 122, 127, 129"
---

# Add required field indicators to seed backup/restore form in wallet panel

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** components/wallet-panel.tsx:1200
**WCAG:** 3.3.2 Labels or Instructions (Level A)

## Problem

The seed backup/restore form fields in the wallet panel lack required field indicators. Other forms in the project use asterisk (*) plus sr-only '(required)' text to meet WCAG 3.3.2, but the seed backup form omits this pattern. Additionally, password fields have no minimum length requirement hint or password strength indicator.

## How to Fix

**1. Required field asterisk pattern:**
```tsx
<label htmlFor="seed-passphrase" className="sovereign-label">
  Pairing Phrase
  <span className="text-red-400 ml-1" aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
```

Apply to all required fields in the seed backup/restore form.

**2. Password hint text:**
```tsx
<label htmlFor="seed-password" className="sovereign-label">
  Encryption Password
</label>
<input
  id="seed-password"
  type="password"
  aria-describedby="seed-password-hint"
  ...
/>
<p id="seed-password-hint" className="text-xs text-sovereign-muted mt-1">
  Minimum 12 characters. Used to encrypt your seed phrase backup.
</p>
```

This also fixes the `aria-describedby` association from task 122's work.

## Acceptance Criteria

- [ ] Required fields in seed backup form have asterisk + sr-only "(required)" text
- [ ] Password fields have hint text describing minimum requirements
- [ ] `aria-describedby` links password inputs to their hint text
- [ ] Pattern matches other forms in the codebase
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: medium, category: accessibility, WCAG 3.3.2 Level A)._
