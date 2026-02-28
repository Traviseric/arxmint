---
id: 130
title: "Fix responsive height issues in cycle-alerts and create-community-form"
priority: P2
severity: high
status: completed
source: ux_audit
file: components/cycle-alerts.tsx
line: 180
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: cycle_alerts
group_reason: "Same file as task 124; create-community-form fix is in the same responsive pass"
---

# Fix responsive height issues in cycle-alerts and create-community-form

**Priority:** P2 (high)
**Source:** ux_audit
**Location:** components/cycle-alerts.tsx:180, components/create-community-form.tsx:277

## Problem

**Issue 1 — cycle-alerts.tsx:180:**
Metric cards use a fixed `h-16` height but contain description text that overflows or gets cut off on mobile viewports below 640px. On mobile, the card content is truncated.

**Code with issue:**
```tsx
<div className="h-16 bg-sovereign-dark rounded" />  {/* skeleton */}
// and in MetricCard:
className="... h-16 ..."  // fixed height clips text on mobile
```

**Issue 2 — create-community-form.tsx:277:**
Pre blocks displaying Docker config use `max-h-[500px]` which creates a scroll-within-scroll UX on mobile where the viewport is often less than 800px tall. Users on mobile must scroll inside the pre block while the whole page is also scrolling, which is a poor experience.

**Code with issue:**
```tsx
<pre className="... max-h-[500px]">  {/* too tall for mobile */}
```

## How to Fix

**Fix 1 — cycle-alerts MetricCard:**
Replace fixed `h-16` with responsive min-height:
```tsx
// Replace h-16 with:
className="min-h-[64px] sm:h-16"
// or simply remove the fixed height and use padding:
className="py-3"
```

**Fix 2 — create-community-form pre blocks:**
Make height responsive:
```tsx
// Before:
<pre className="... max-h-[500px]">
// After:
<pre className="... max-h-[280px] sm:max-h-[400px] md:max-h-[500px]">
```

## Acceptance Criteria

- [ ] MetricCard content is not cut off on mobile viewports
- [ ] Pre blocks in create-community-form are shorter on mobile to reduce nested scrolling
- [ ] Changes are purely CSS/Tailwind class changes — no logic changes
- [ ] Visual result on desktop is unchanged
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit findings (severity: high, category: responsive) — merged two responsive height fixes._
