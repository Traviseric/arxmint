---
id: 125
title: "Add text alternatives for color-only status indicators in dashboard"
priority: P1
severity: high
status: completed
source: ux_audit
file: app/dashboard/page.tsx
line: 376
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: dashboard
group_reason: "Same file as tasks 126, 131"
---

# Add text alternatives for color-only status indicators in dashboard

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** app/dashboard/page.tsx:376
**WCAG:** 1.4.1 Use of Color (Level A)

## Problem

Connection status indicators in the dashboard use colored dots (green/red) to show connected/disconnected state with no text alternative. Users who are colorblind or using screen readers cannot determine connection status.

**Code with issue (approximate):**
```tsx
// Green or red dot with no text alternative
<span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
```

## How to Fix

Add visually hidden text alongside the colored dot using Tailwind's `sr-only` utility, or add `aria-label` to the status container:

**Option A — sr-only text:**
```tsx
<span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
  <span className="sr-only">{isConnected ? '(connected)' : '(disconnected)'}</span>
</span>
```

**Option B — aria-label on container:**
```tsx
<div
  className="flex items-center gap-1"
  aria-label={`Connection status: ${isConnected ? 'connected' : 'disconnected'}`}
>
  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
</div>
```

Apply this fix to ALL connection status indicators in the dashboard (Fedimint, Cashu, Lightning, etc.).

## Acceptance Criteria

- [ ] All color-only status indicators have a text alternative readable by screen readers
- [ ] Colored dot visual is unchanged for sighted users
- [ ] Fix applied consistently to all status indicators in dashboard
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: accessibility, WCAG 1.4.1 Level A)._
