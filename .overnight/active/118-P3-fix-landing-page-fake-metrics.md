---
id: 118
title: "Fix landing page fake live metrics (liveVolume / activeNodes)"
priority: P3
severity: low
status: completed
source: feature_audit
file: app/page.tsx
line: 34
created: "2026-02-28T10:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "UI-only change to app/page.tsx — no overlap with other tasks"
---

# Fix landing page fake live metrics (liveVolume / activeNodes)

**Priority:** P3 (low)
**Source:** feature_audit
**Location:** app/page.tsx:34–44

## Problem

The landing page hero section displays "NETWORK_VAL" (live volume in $) and "ACTIVE_NODES" counters that are animated via `setInterval(Math.random())`. They are not backed by real network or federation data — they increment randomly every 2.8 seconds, creating a misleading impression of live activity for first-time visitors.

**Code with issue:**
```typescript
const [liveVolume, setLiveVolume] = useState(1284.45);
const [activeNodes, setActiveNodes] = useState(312);

// Auto-updating metric simulation
useEffect(() => {
  const interval = setInterval(() => {
    setLiveVolume(prev => prev + (Math.random() * 2.5));
    if (Math.random() > 0.7) {
      setActiveNodes(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }
  }, 2800);
  return () => clearInterval(interval);
}, []);
```

This creates a deceptive live-activity signal. Users and potential investors who see these numbers assume they reflect real network activity.

## How to Fix

**Option A (preferred): Add "Demo Network" label**

This is the lowest-effort fix with immediate trust improvement:

1. Add a `(Demo Network)` or `[DEMO]` suffix to both metric labels in the hero UI:
   - Change `NETWORK_VAL` label to `NETWORK_VAL (demo)`
   - Change `ACTIVE_NODES` label to `ACTIVE_NODES (demo)`
2. Keep the animation as-is — it shows what the product will look like with real data
3. Optionally add a tooltip: "Live metrics will reflect real federation activity after launch"

**Option B: Wire to /api/bce-metrics (if data is available)**

If the BCE metrics API returns meaningful data:
1. Add a `useEffect` that calls `fetch('/api/bce-metrics')` on mount
2. If the response has `totalVolumeSats` and `activeMerchants`, use those instead of random values
3. Fall back to labeled demo values if the API returns zeros or fails

For the pilot, Option A is sufficient and safe. Option B is preferred for public launch.

## Acceptance Criteria

- [ ] Both metric counters are clearly labeled as demo/example data, OR
- [ ] Both metric counters are wired to real data from `/api/bce-metrics`
- [ ] No first-time visitor is misled into thinking these are live federation metrics
- [ ] `npm run build` passes with no errors

## Notes

_Generated from feature_audit finding: "Landing page live network metrics" (low severity, low effort). Conductor confirmed this as actionable (round 22)._
