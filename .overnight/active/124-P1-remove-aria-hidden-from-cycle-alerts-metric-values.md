---
id: 124
title: "Remove aria-hidden from cycle-alerts metric card content"
priority: P1
severity: high
status: completed
source: ux_audit
file: components/cycle-alerts.tsx
line: 199
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: cycle_alerts
group_reason: "Same file as task 130"
---

# Remove aria-hidden from cycle-alerts metric card content

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** components/cycle-alerts.tsx:199
**WCAG:** 1.3.1 Info and Relationships (Level A)

## Problem

The `MetricCard` component sets `aria-hidden="true"` on every content div inside the card including the metric value, zone label, and description. This makes all actual metric data invisible to screen readers. Only the outer container's `aria-label` is readable, which provides insufficient context (e.g., "Bitcoin Market Cycle" without the actual current value or zone).

**Code with issue:**
```tsx
<div className="text-xs text-sovereign-muted mb-1" aria-hidden="true">
  {tooltip ? <span ...>{label}</span> : label}
</div>
<div className="text-xl font-bold" style={{ color }} aria-hidden="true">
  {value}                        {/* ← hidden from screen readers! */}
</div>
<div className="text-xs font-medium text-sovereign-muted mt-0.5" aria-hidden="true">
  {zone}                         {/* ← hidden from screen readers! */}
</div>
<div className="text-xs text-sovereign-muted mt-1 leading-tight" aria-hidden="true">
  {description}                  {/* ← hidden from screen readers! */}
</div>
```

## How to Fix

Remove `aria-hidden="true"` from the value, zone, and description content divs. The label div with tooltip can retain aria-hidden if the tooltip info is conveyed another way, but the numeric value and zone MUST be accessible.

The outer container's `aria-label` (e.g., "Bitcoin Market Cycle") provides context, so the value/zone/description inside will be read in sequence and make sense.

```tsx
<div className="text-xs text-sovereign-muted mb-1" aria-hidden="true">
  {/* label/tooltip div can stay hidden if aria-label on container is sufficient */}
  {tooltip ? <span title={tooltip}>{label}</span> : label}
</div>
<div className="text-xl font-bold" style={{ color }}>
  {value}  {/* REMOVE aria-hidden */}
</div>
<div className="text-xs font-medium text-sovereign-muted mt-0.5">
  {zone}   {/* REMOVE aria-hidden */}
</div>
<div className="text-xs text-sovereign-muted mt-1 leading-tight">
  {description}  {/* REMOVE aria-hidden */}
</div>
```

## Acceptance Criteria

- [ ] `aria-hidden="true"` removed from the value, zone, and description divs in MetricCard
- [ ] Screen readers can access metric values (NVDA/VoiceOver would read "Bitcoin Market Cycle 68 Accumulation Zone Bitcoin is in...")
- [ ] Visual rendering unchanged
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: accessibility, WCAG 1.3.1 Level A)._
