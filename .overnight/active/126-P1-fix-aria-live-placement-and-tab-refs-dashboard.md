---
id: 126
title: "Fix aria-live placement and use refs for tab keyboard focus in dashboard"
priority: P1
severity: high
status: completed
source: ux_audit
file: app/dashboard/page.tsx
line: 112
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: dashboard
group_reason: "Same file as tasks 125, 131"
---

# Fix aria-live placement and use refs for tab keyboard focus in dashboard

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** app/dashboard/page.tsx:112, 437
**WCAG:** 2.1.1 Keyboard (Level A), 4.1.3 Status Messages (Level AA)

## Problem

**Issue 1 — Tab keyboard focus via getElementById (line 112):**
The dashboard uses `document.getElementById()` to focus tab elements on keyboard navigation:
```tsx
const handleTabClick = (tabId: Tab) => {
  setActiveTab(tabId);
  setTimeout(() => document.getElementById(`panel-${tabId}`)?.focus(), 0);
};
// and:
setTimeout(() => document.getElementById(`tab-${next}`)?.focus(), 0);
```
While this works in most cases, using `document.getElementById` is fragile — it relies on IDs being present in the DOM and can fail silently. The `setTimeout` + getElementById pattern is a code smell for what should be a ref.

**Issue 2 — aria-live placement (line 437):**
The `aria-live` region may be on a parent container rather than the element that directly contains the dynamic text, causing screen reader announcements to be missed. The live region must wrap the actual changing text node.

## How to Fix

**Fix 1 — Use useRef array for tab buttons:**
```tsx
const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

// In handleTablistKeyDown:
const nextIndex = tabs.indexOf(next);
tabRefs.current[nextIndex]?.focus();

// On each tab button:
<button
  ref={(el) => { tabRefs.current[tabs.indexOf(tab.id)] = el; }}
  ...
>
```

**Fix 2 — Correct aria-live placement:**
Ensure `aria-live="polite"` and `role="status"` are on the element that **directly contains** the status text, not a parent wrapper:
```tsx
{/* WRONG: aria-live on parent, text in child */}
<div aria-live="polite">
  <div className="p-4"><span>{status}</span></div>
</div>

{/* CORRECT: aria-live on element containing text */}
<div className="p-4">
  <span role="status" aria-live="polite">{status}</span>
</div>
```

## Acceptance Criteria

- [ ] Tab focus uses useRef array instead of document.getElementById
- [ ] Arrow key navigation between dashboard tabs works correctly
- [ ] aria-live region wraps the actual status text element directly
- [ ] Loading state announcements are readable by screen readers
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit findings (severity: high, category: accessibility) — merged two adjacent dashboard keyboard/aria issues._
