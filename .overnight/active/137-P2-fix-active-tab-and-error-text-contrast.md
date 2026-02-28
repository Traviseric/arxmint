---
id: 137
title: "Fix active tab text contrast and error text contrast"
priority: P2
severity: medium
status: completed
source: ux_audit
file: app/dashboard/page.tsx
line: 149
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: contrast_theme
group_reason: "Related to task 128 (muted text contrast); both are contrast WCAG fixes"
---

# Fix active tab text contrast and error text contrast

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** app/dashboard/page.tsx:149, components/create-community-form.tsx:180
**WCAG:** 1.4.3 Contrast Minimum (Level AA)

## Problem

**Issue 1 — Dashboard active tab (dashboard/page.tsx:149):**
Active tab uses `text-btc-orange` (#F7931A) on `sovereign-panel` (#111) background. Contrast ratio is ~3.1:1, below WCAG AA 4.5:1 for normal text.

**Code with issue:**
```tsx
activeTab === tab.id
  ? "bg-sovereign-panel text-btc-orange shadow-sm"  // 3.1:1 contrast — FAIL
  : "text-sovereign-muted hover:text-sovereign-text"
```

**Issue 2 — Error message text (create-community-form.tsx:180):**
Error message uses `text-red-400` on `bg-red-500/10` (transparent red on dark), producing contrast ratio ~2.2:1, far below 4.5:1.

**Code with issue:**
```tsx
<div role="alert" className="... bg-red-500/10 ... text-red-400">
  {generateError}
</div>
```

## How to Fix

**Fix 1 — Dashboard active tab:**
Change active tab text to white and use only the border/underline for orange accent:
```tsx
activeTab === tab.id
  ? "bg-sovereign-panel text-sovereign-text border-b-2 border-btc-orange shadow-sm"
  : "text-sovereign-muted hover:text-sovereign-text border-b-2 border-transparent"
```
White (#e5e5e5) on #111 = ~12:1 contrast — well above AA.

**Fix 2 — Error message text:**
Use `text-red-200` or white on a more opaque red background:
```tsx
<div role="alert" className="... bg-red-900/40 border border-red-500/50 ... text-red-200">
  {generateError}
</div>
```
`text-red-200` (#fecaca) on dark red = ~8:1 contrast.

## Acceptance Criteria

- [ ] Active dashboard tab text passes WCAG AA contrast (≥4.5:1)
- [ ] Orange btc-orange is still used as a design accent (border, indicator) not the text color
- [ ] Error message text in create-community-form passes WCAG AA contrast
- [ ] Visual style remains coherent with the dark theme
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit findings (severity: medium, category: accessibility, WCAG 1.4.3 Level AA) — merged two contrast fixes._
