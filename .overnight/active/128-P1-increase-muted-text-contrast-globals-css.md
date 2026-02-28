---
id: 128
title: "Increase muted text contrast ratio in globals.css"
priority: P1
severity: high
status: completed
source: ux_audit
file: app/globals.css
line: 21
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: contrast_theme
group_reason: "Related to task 137 (dashboard tab + error text contrast)"
---

# Increase muted text contrast ratio in globals.css

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** app/globals.css:21
**WCAG:** 1.4.3 Contrast Minimum (Level AA)

## Problem

The `--text-muted` CSS variable is set to `#737373`. On the project's dark backgrounds (`#0a0a0a` sovereign-dark, `#111` sovereign-panel), this produces a contrast ratio of approximately 3.8:1, which is **below the WCAG AA minimum of 4.5:1** for normal text.

This affects all elements using `text-sovereign-muted` or `var(--text-muted)` — including dashboard balance labels, form descriptions, and help text throughout the application.

**Code with issue:**
```css
:root {
  --text-muted: #737373;  /* contrast 3.8:1 on #0a0a0a — below WCAG AA 4.5:1 */
}
```

## How to Fix

Increase the muted color from `#737373` to at least `#909090` (which achieves ~4.6:1 on #0a0a0a).

```css
:root {
  --text-muted: #909090;  /* contrast ~4.6:1 on #0a0a0a — passes WCAG AA */
}
```

Also update the Tailwind config reference if `sovereign-muted` is defined separately:
```js
// tailwind.config.ts
'sovereign-muted': '#909090',  // was '#737373'
```

Note: This is a global change — review the visual result to ensure the increase doesn't make "muted" text feel too prominent. If any specific uses need to stay darker, use a more specific class instead of `text-sovereign-muted`.

## Acceptance Criteria

- [ ] `--text-muted` value updated to pass WCAG AA contrast on both #0a0a0a and #111 backgrounds
- [ ] `sovereign-muted` color in tailwind.config.ts updated to match
- [ ] Visual inspection confirms muted text is still visually subordinate but readable
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: accessibility, WCAG 1.4.3 Level AA)._
