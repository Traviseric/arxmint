---
id: 135
title: "Add aria-pressed and active state to example prompt buttons in create-community-form"
priority: P2
severity: medium
status: completed
source: ux_audit
file: components/create-community-form.tsx
line: 114
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: create_form
group_reason: "Same file as tasks 120, 123"
---

# Add aria-pressed and active state to example prompt buttons in create-community-form

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** components/create-community-form.tsx:114
**WCAG:** 4.1.2 Name Role Value (Level A)

## Problem

The example prompt suggestion buttons in the create community form have no `aria-pressed` attribute and no visual active/selected state when clicked. Users (especially screen reader users) cannot tell which example prompt is currently active in the text area.

**Code with issue:**
```tsx
// Example prompt buttons lack aria-pressed and active visual state
{examplePrompts.map((ex) => (
  <button
    key={ex}
    onClick={() => setPrompt(ex)}
    className="text-xs px-3 py-1.5 rounded-full border border-border-border-default ..."
    // Missing: aria-pressed, visual selected state
  >
    {ex}
  </button>
))}
```

## How to Fix

Add `aria-pressed` and conditional active styling:
```tsx
{examplePrompts.map((ex) => (
  <button
    key={ex}
    onClick={() => setPrompt(ex)}
    aria-pressed={prompt === ex}
    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
      prompt === ex
        ? 'border-btc-orange bg-btc-orange/10 text-btc-orange'
        : 'border-white/10 text-sovereign-muted hover:text-sovereign-text hover:border-white/20'
    }`}
  >
    {ex}
  </button>
))}
```

Also fix the broken class names (`border-border-border-default` → `border-white/10`) as part of task 123 — these two tasks can be done in the same pass on this file.

## Acceptance Criteria

- [ ] Each example prompt button has `aria-pressed={prompt === ex}`
- [ ] Selected prompt button has visible active styling (btc-orange border/background)
- [ ] Screen readers can announce which example is currently active
- [ ] No regression to prompt text area behavior
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: medium, category: forms, WCAG 4.1.2 Level A)._
