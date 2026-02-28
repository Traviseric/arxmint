---
id: 136
title: "Add mobile hamburger menu to nav-bar"
priority: P2
severity: medium
status: completed
source: ux_audit
file: components/nav-bar.tsx
line: 37
created: "2026-02-28T12:00:00"
execution_hint: parallel
context_group: navigation
group_reason: "Related to nav/layout components; parallel with 133, 138"
---

# Add mobile hamburger menu to nav-bar

**Priority:** P2 (medium)
**Source:** ux_audit
**Location:** components/nav-bar.tsx:37

## Problem

Navigation links 'Why' and 'Whitepaper' are hidden on mobile screens with `hidden sm:block` but there is no hamburger menu or any mobile navigation alternative. Mobile users cannot access these navigation links at all.

**Code with issue:**
```tsx
<Link href="/why"
  className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
  Why
</Link>
<Link href="/whitepaper"
  className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
  Whitepaper
</Link>
```

## How to Fix

Add a hamburger button that appears on mobile (`block sm:hidden`) and toggles a mobile dropdown menu:

```tsx
const [mobileOpen, setMobileOpen] = useState(false);

// In nav, after existing links:
{/* Mobile hamburger trigger */}
<button
  className="block sm:hidden p-2 rounded-lg hover:bg-sovereign-panel transition-colors"
  onClick={() => setMobileOpen(!mobileOpen)}
  aria-label="Toggle mobile menu"
  aria-expanded={mobileOpen}
>
  <Menu className="w-5 h-5 text-sovereign-muted" />
</button>

// Mobile dropdown (below nav bar, absolutely positioned):
{mobileOpen && (
  <div className="block sm:hidden absolute top-full left-0 right-0 bg-sovereign-panel border-b border-white/10 z-50">
    <div className="flex flex-col p-4 gap-3">
      <Link href="/why" onClick={() => setMobileOpen(false)}
        className="text-sm text-sovereign-muted hover:text-sovereign-text">
        Why
      </Link>
      <Link href="/whitepaper" onClick={() => setMobileOpen(false)}
        className="text-sm text-sovereign-muted hover:text-sovereign-text">
        Whitepaper
      </Link>
    </div>
  </div>
)}
```

Use `Menu` icon from `lucide-react` (consistent with project). Close mobile menu on link click.

## Acceptance Criteria

- [ ] Hamburger button appears on mobile (`< 640px`) when nav links are hidden
- [ ] Clicking hamburger opens a mobile dropdown with 'Why' and 'Whitepaper' links
- [ ] Links work and close the mobile menu on click
- [ ] Desktop nav is unchanged (hamburger hidden on sm+)
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: medium, category: responsive)._
