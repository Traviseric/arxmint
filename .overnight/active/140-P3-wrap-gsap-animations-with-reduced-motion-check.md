---
id: 140
title: "Wrap GSAP scroll animations with prefers-reduced-motion check"
priority: P3
severity: low
status: completed
source: ux_audit
file: app/page.tsx
line: 49
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: landing_page
group_reason: "Same file as task 139"
---

# Wrap GSAP scroll animations with prefers-reduced-motion check

**Priority:** P3 (low)
**Source:** ux_audit
**Location:** app/page.tsx:49-64
**WCAG:** 2.3.3 Animation from Interactions (Level AAA)

## Problem

The landing page uses GSAP + ScrollTrigger for scroll animations (heroBg parallax etc.). While `globals.css` correctly handles `prefers-reduced-motion` in CSS, the JavaScript GSAP animation calls on lines 49-64 of page.tsx do not check this media query. Users who have enabled "reduce motion" in their OS settings will still see GSAP scroll animations.

**Code with issue:**
```tsx
// app/page.tsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);
  // ...
  gsap.to(heroBgRef.current, {   // ← no reduced-motion check
    yPercent: -30,
    ease: "none",
    scrollTrigger: { ... }
  });
}, []);
```

## How to Fix

Check the `prefers-reduced-motion` media query before registering GSAP animations:

```tsx
useEffect(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;  // Skip all animations if user prefers reduced motion

  gsap.registerPlugin(ScrollTrigger);
  // ... rest of animation setup
  gsap.to(heroBgRef.current, {
    yPercent: -30,
    // ...
  });

  return () => {
    ScrollTrigger.getAll().forEach(t => t.kill());
  };
}, []);
```

This ensures GSAP animations respect the OS-level "reduce motion" preference.

## Acceptance Criteria

- [ ] GSAP animation setup is wrapped with `prefers-reduced-motion` check
- [ ] When `prefers-reduced-motion: reduce` is set, GSAP animations do not run
- [ ] When `prefers-reduced-motion` is not set, animations work as before
- [ ] ScrollTrigger cleanup on unmount is preserved
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: low, category: accessibility, WCAG 2.3.3 Level AAA)._
