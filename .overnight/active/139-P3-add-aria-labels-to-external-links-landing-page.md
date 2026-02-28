---
id: 139
title: "Add aria-labels to external links on landing page"
priority: P3
severity: low
status: completed
source: ux_audit
file: app/page.tsx
line: 145
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: landing_page
group_reason: "Same file as task 140"
---

# Add aria-labels to external links on landing page

**Priority:** P3 (low)
**Source:** ux_audit
**Location:** app/page.tsx:145
**WCAG:** 2.4.4 Link Purpose in Context (Level A)

## Problem

External links (GitHub repository, Whitepaper) on the landing page open in a new tab (`target="_blank"`) but lack `aria-label` attributes indicating they open in a new window. Screen reader users are not warned that clicking these links will open a new tab.

## How to Fix

Add descriptive `aria-label` attributes to external links:

```tsx
<a
  href="https://github.com/..."
  target="_blank"
  rel="noopener noreferrer"
  aria-label="GitHub repository (opens in new window)"
>
  GitHub
</a>

<a
  href="/whitepaper.pdf"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Whitepaper (opens in new window)"
>
  Whitepaper
</a>
```

Optionally add a small external link icon using `ExternalLink` from `lucide-react`:
```tsx
<ExternalLink className="w-3 h-3 inline ml-1" aria-hidden="true" />
```

## Acceptance Criteria

- [ ] External links that open in new tabs have `aria-label` describing the destination and new-window behavior
- [ ] `rel="noopener noreferrer"` is present on all `target="_blank"` links (security best practice)
- [ ] Optionally: external link icon added for visual users
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: low, category: accessibility, WCAG 2.4.4 Level A)._
