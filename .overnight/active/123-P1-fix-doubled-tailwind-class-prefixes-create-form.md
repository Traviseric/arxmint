---
id: 123
title: "Fix doubled Tailwind class prefixes in create-community-form"
priority: P1
severity: high
status: completed
source: ux_audit
file: components/create-community-form.tsx
line: 118
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: create_form
group_reason: "Same file as tasks 120, 135"
---

# Fix doubled Tailwind class prefixes in create-community-form

**Priority:** P1 (high)
**Source:** ux_audit
**Location:** components/create-community-form.tsx:118, 198, 243, 288+

## Problem

The create-community-form uses CSS class names with doubled prefixes like:
- `border-border-border-default` (should be `border-border-default` or just `border`)
- `text-text-text-secondary` (should be `text-text-secondary` or `text-sovereign-muted`)
- `bg-bg-bg-elevated` (should be `bg-bg-elevated` or `bg-sovereign-panel`)
- `bg-bg-bg-surface` (should be `bg-bg-surface` or appropriate sovereign class)
- `hover:bg-border-border-default` (should be `hover:bg-border-default`)

These classes do NOT exist in Tailwind CSS or the project's globals.css, so all style rules are silently ignored. Network selector buttons, community summary cards, copy/download buttons and other elements have broken visual styling.

**Examples from code:**
```tsx
// Line 118: Network selector buttons
className="text-xs px-3 py-1.5 rounded-full border border-border-border-default
           text-text-text-secondary hover:text-accent hover:border-accent/30"

// Line 198: Community summary card labels
<div className="text-text-text-secondary">Backend</div>

// Line 243: Config display area
: "bg-bg-bg-elevated/50 text-text-text-secondary"

// Line 288: Copy button background
className="p-2 rounded-lg bg-bg-bg-surface hover:bg-bg-elevated hover:bg-border-border-default"
```

## How to Fix

Replace all doubled-prefix class names with correct project classes:

| Broken class | Correct replacement |
|---|---|
| `border-border-border-default` | `border-sovereign-panel` or `border-white/10` |
| `text-text-text-secondary` | `text-sovereign-muted` |
| `bg-bg-bg-elevated` | `bg-sovereign-panel` |
| `bg-bg-bg-surface` | `bg-sovereign-dark` |
| `bg-bg-bg-elevated/50` | `bg-sovereign-panel/50` |
| `hover:bg-border-border-default` | `hover:bg-white/5` |

Do a full search of the file for any pattern matching `\w+-\w+-\w+-` (triple-segment classes with repeated segments) and fix them all.

Reference: project uses `sovereign-dark` (#0a0a0a), `sovereign-panel` (#111), `sovereign-muted` (#737373), `sovereign-text` (#e5e5e5) from CLAUDE.md conventions.

## Acceptance Criteria

- [ ] No `border-border-border-*`, `text-text-text-*`, `bg-bg-bg-*` classes remain in the file
- [ ] All network selector buttons render with visible borders and text
- [ ] Community summary card labels render with correct muted color
- [ ] Copy/download buttons render with correct background
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit findings (severity: high, category: forms) — merged two adjacent findings about doubled prefixes in same file._
