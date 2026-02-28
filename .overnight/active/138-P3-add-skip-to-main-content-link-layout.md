---
id: 138
title: "Add skip-to-main-content link to app layout"
priority: P3
severity: low
status: completed
source: ux_audit
file: app/layout.tsx
line: 1
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: navigation
group_reason: "Related to nav/layout components; parallel with 133, 136"
---

# Add skip-to-main-content link to app layout

**Priority:** P3 (low)
**Source:** ux_audit
**Location:** app/layout.tsx:1
**WCAG:** 2.4.1 Bypass Blocks (Level A)

## Problem

No 'Skip to main content' link exists at the top of any page. Keyboard users must Tab through the entire navigation bar before reaching main content on every page they visit. This is especially burdensome on pages with large nav elements.

## How to Fix

Add a visually hidden skip link at the very start of the `<body>` in layout.tsx, and add `id="main"` to the main content wrapper:

```tsx
// In app/layout.tsx, inside <body> before NavBar:
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-btc-orange focus:text-black focus:font-medium focus:text-sm"
>
  Skip to main content
</a>
<NavBar />
<main id="main">
  {children}
</main>
```

The link is invisible until focused (via Tab), then appears as a visible orange button in the top-left corner. This satisfies WCAG 2.4.1 Level A.

## Acceptance Criteria

- [ ] Skip link is present in layout.tsx before NavBar
- [ ] Skip link is invisible until focused
- [ ] When focused and activated, focus jumps to `id="main"` content
- [ ] Skip link appears with btc-orange styling when focused (consistent with brand)
- [ ] Main content area has `id="main"`
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: low, category: accessibility, WCAG 2.4.1 Level A)._
