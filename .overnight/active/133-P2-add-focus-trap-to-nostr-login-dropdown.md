---
id: 133
title: "Add focus trap to Nostr login dropdown"
priority: P2
severity: medium
status: completed
source: ux_audit
file: components/nostr-login.tsx
line: 36
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: navigation
group_reason: "Related to nav/auth components; parallel with 136, 138"
---

# Add focus trap to Nostr login dropdown

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** components/nostr-login.tsx:36
**WCAG:** 2.1.2 No Keyboard Trap (Level A)

## Problem

When the Nostr login dropdown opens, focus moves to the first focusable element but there is no focus trap. Tab key can escape the dropdown and focus main page content behind the overlay, making the modal/dropdown inaccessible for keyboard users.

There is also no Escape key handler to close the dropdown.

## How to Fix

Implement a focus trap inline (no extra library needed):

```tsx
const dropdownRef = useRef<HTMLDivElement>(null);

// On keydown in the dropdown:
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    setIsOpen(false);
    return;
  }
  if (e.key !== 'Tab') return;

  const focusable = dropdownRef.current?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable || focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
};

// On the dropdown container:
<div ref={dropdownRef} onKeyDown={handleKeyDown} ...>
```

Also move focus to the first focusable element inside the dropdown when it opens, and return focus to the trigger button when it closes.

## Acceptance Criteria

- [ ] Tab key cycles within the open dropdown, not to page content behind it
- [ ] Shift+Tab cycles backward within the dropdown
- [ ] Escape key closes the dropdown
- [ ] Focus returns to the trigger button when dropdown closes
- [ ] No additional npm packages required
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: medium, category: accessibility, WCAG 2.1.2 Level A)._
