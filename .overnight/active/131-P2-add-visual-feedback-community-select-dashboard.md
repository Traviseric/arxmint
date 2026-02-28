---
id: 131
title: "Add visual feedback on community selection in dashboard"
priority: P2
severity: high
status: completed
source: ux_audit
file: app/dashboard/page.tsx
line: 271
created: "2026-02-28T12:00:00"
execution_hint: sequential
context_group: dashboard
group_reason: "Same file as tasks 125, 126"
---

# Add visual feedback on community selection in dashboard

**Priority:** P2 (high)
**Source:** ux_audit
**Location:** app/dashboard/page.tsx:271

## Problem

Clicking 'Select' on a community in the dashboard list switches the active community context but provides no visual confirmation or loading state. The transition is instantaneous with no feedback, leaving users unsure whether their click was registered or if the context actually changed.

## How to Fix

Add brief visual feedback when a community is selected. Options (choose the simplest):

**Option A — Brief loading state with Zustand:**
```tsx
const [selectingId, setSelectingId] = useState<string | null>(null);

const handleSelect = async (communityId: string) => {
  setSelectingId(communityId);
  setCommunity(communityId);
  // Brief visual feedback
  await new Promise(resolve => setTimeout(resolve, 300));
  setSelectingId(null);
};

// In the Select button:
<button
  onClick={() => handleSelect(community.id)}
  disabled={selectingId === community.id}
  className={`sovereign-btn-outline text-xs ${selectingId === community.id ? 'opacity-50' : ''}`}
>
  {selectingId === community.id ? (
    <span className="flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      Selecting...
    </span>
  ) : 'Select'}
</button>
```

**Option B — Highlight the selected row briefly:**
Apply a momentary ring/border highlight on the selected community card using a timed state flag.

Use `Loader2` from `lucide-react` for any spinner (consistent with project).

## Acceptance Criteria

- [ ] Clicking Select provides visible feedback (spinner, highlight, or text change)
- [ ] Feedback clears after the selection is complete
- [ ] Active/selected community is visually distinct from others in the list
- [ ] Build passes (`npm run build`)

## Notes

_Generated from ux_audit finding (severity: high, category: flow)._
