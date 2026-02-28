---
id: 154
title: "Add 'demo' disclaimer to agent compute and data endpoints"
priority: P1
severity: high
status: pending
source: feature_audit
file: app/api/agent/route.ts
line: 272
created: "2026-02-28T25:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Only touches app/api/agent/route.ts — independent of all other tasks"
---

# Add 'demo' disclaimer to agent compute and data endpoints

**Priority:** P1 (high)
**Source:** feature_audit (merged findings: "Agent compute service" + "Agent data marketplace service")
**Location:** app/api/agent/route.ts:272, app/api/agent/route.ts:286, app/api/agent/route.ts:315-324

## Problem

The agent API's `compute` service (500 sats) and `data` service (100 sats) both return **hardcoded fake responses** while accepting real satoshis via the L402 paywall. An AI agent that pays these endpoints receives:

- **compute**: `"output": "Compute task executed successfully"` — a static string, no actual computation
- **data**: Two hardcoded dataset descriptions (`btc-mempool-stats`, `ln-channel-capacity`) — static stubs, no actual data delivery

Neither endpoint performs any real work. This is misleading because:
1. The agent pricing table (`/api/agent` default handler) lists both services at real sats prices without any demo/placeholder notice
2. Agents may integrate these endpoints into automated pipelines and pay real sats expecting real outputs

**Code with issue:**
```typescript
// app/api/agent/route.ts — compute case
case "compute":
  return NextResponse.json({
    service: "compute",
    paymentMethod,
    result: {
      jobId: `job_${Date.now().toString(36)}`,
      status: "completed",
      output: "Compute task executed successfully",   // FAKE
      compute_units: 1,
      cost_sats: 500,
    },
  });

// app/api/agent/route.ts — data case
case "data":
  return NextResponse.json({
    service: "data-marketplace",
    paymentMethod,
    datasets: [
      { id: "btc-mempool-stats", ... },               // STATIC STUB
      { id: "ln-channel-capacity", ... },             // STATIC STUB
    ],
  });

// app/api/agent/route.ts — capability list (lines 315-324)
services: ["privacy-audit", "cycle-signals", "compute", "data"],
pricing: {
  "privacy-audit": "200 sats",
  "cycle-signals": "50 sats",
  compute: "500 sats/job",    // No demo notice
  data: "50-100 sats/dataset",  // No demo notice
},
```

## How to Fix

**1. Add `demo: true` and `disclaimer` field to compute response:**
```typescript
case "compute":
  return NextResponse.json({
    service: "compute",
    demo: true,
    disclaimer: "Demo endpoint — returns placeholder output. Real compute dispatch is on the roadmap.",
    paymentMethod,
    result: {
      jobId: `job_${Date.now().toString(36)}`,
      status: "completed",
      output: "Compute task executed successfully (demo placeholder)",
      compute_units: 1,
      cost_sats: 500,
    },
  });
```

**2. Add `demo: true` and `disclaimer` field to data response:**
```typescript
case "data":
  return NextResponse.json({
    service: "data-marketplace",
    demo: true,
    disclaimer: "Demo endpoint — returns placeholder dataset catalog. Real data delivery (mempool.space, Amboss) is on the roadmap.",
    paymentMethod,
    datasets: [
      { id: "btc-mempool-stats", name: "BTC Mempool Stats (demo)", ... },
      { id: "ln-channel-capacity", name: "Lightning Capacity (demo)", ... },
    ],
  });
```

**3. Mark compute and data as demo in the capability listing** (default handler, around line 315):
```typescript
services: ["privacy-audit", "cycle-signals", "compute", "data"],
pricing: {
  "privacy-audit": "200 sats",
  "cycle-signals": "50 sats",
  compute: "500 sats/job (demo — placeholder output)",
  data: "50-100 sats/dataset (demo — static catalog)",
},
demo_services: ["compute", "data"],
demo_notice: "compute and data endpoints are demo placeholders. privacy-audit and cycle-signals use real computations.",
```

## Acceptance Criteria

- [ ] `GET /api/agent?service=compute` response includes `demo: true` and a `disclaimer` string
- [ ] `GET /api/agent?service=data` response includes `demo: true` and a `disclaimer` string
- [ ] Default capability listing marks compute and data as demo in pricing or adds `demo_services` array
- [ ] `npm run build` passes with no errors
- [ ] No TypeScript errors

## Notes

_Generated from feature_audit findings: "Agent compute service" (high severity) and "Agent data marketplace service" (medium severity) — MERGED because both touch the same case block in app/api/agent/route.ts._
_Do NOT implement real compute dispatch or real data APIs — this is a disclaimer-only change._
_privacy-audit (task 116) and cycle-signals already use real computation; only compute and data need disclaimers._
