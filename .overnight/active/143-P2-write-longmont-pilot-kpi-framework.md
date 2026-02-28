---
id: 143
title: "Write Longmont pilot KPI framework (docs/PILOT_KPIS.md)"
priority: P2
severity: medium
status: completed
source: human_tasks_md
file: docs/PILOT_KPIS.md
created: "2026-02-28T14:00:00Z"
execution_hint: parallel
context_group: documentation
group_reason: "Docs writing task, independent of tasks 141, 142, 144 but same category"
---

# Write Longmont pilot KPI framework (docs/PILOT_KPIS.md)

**Priority:** P2 (medium)
**Source:** human_tasks.md — "Define Longmont pilot KPIs"
**Location:** docs/PILOT_KPIS.md (new file)

## Problem

Grant applications to OpenSats, HRF, and Spiral require quantitative KPI frameworks with quarterly milestone definitions and measurement methodology. Without a documented KPI framework, grant reviewers cannot assess the project's credibility or track progress across reporting periods.

The KPI data already exists in `lib/pilot-deployment.ts` (`PilotKPITargets`) and `lib/bce-metrics.ts` (`computeBCEMetrics`) but lives in code, not in a human-readable strategic document. Additionally, the human_tasks.md note "Lock target metrics (30 merchants, 300 MAU, repeat-spend %) to quarterly milestones for grant credibility" confirms this is a blocking prerequisite for grant submissions.

## How to Fix

Create `docs/PILOT_KPIS.md` with the following sections:

1. **Target Metrics** — Extract from `lib/pilot-deployment.ts` `PilotKPITargets`. Include:
   - Merchant onboarding target (30 merchants)
   - Monthly active users target (300 MAU)
   - Repeat-spend percentage target
   - Transaction volume targets in sats
   - BCE (Bitcoin Circular Economy) velocity metric targets from `lib/bce-metrics.ts`
   - Success rate threshold for payments

2. **Quarterly Milestone Definitions** — Align to grant reporting periods (Q1/Q2/Q3/Q4 from pilot launch date):
   - Q1: Infrastructure live, first 5 merchants onboarded, first transactions
   - Q2: 15 merchants, 100 MAU, first circular economy transactions (merchant-to-merchant spend)
   - Q3: 30 merchants, 300 MAU, repeat-spend % target met
   - Q4: Full KPI achievement, mainnet migration gate evaluation
   - Generate from `generatePilotTimeline()` in `lib/pilot-deployment.ts`

3. **Measurement Methodology** — For each KPI, document the data source:
   - Merchant count: `Merchant` table in Postgres (via Prisma)
   - MAU: `Transaction` table + `Session` table — distinct users with transactions in rolling 30 days
   - Repeat spend: `Transaction` table grouped by userId, count users with >1 transaction in period
   - Transaction volume: `Transaction.amount` sum per period
   - BCE metrics: `computeBCEMetrics()` from `lib/bce-metrics.ts` wired to real DB data (task 10)
   - Payment success rate: completed vs failed `Transaction` records

4. **Success/Failure Thresholds** — Define what constitutes success vs failure for each KPI:
   - Green: ≥90% of target
   - Yellow: 50-89% of target
   - Red: <50% of target
   - Include minimum viable success threshold for grant continuation

5. **Escalation Criteria** — When to pause pilot vs proceed to mainnet:
   - Pause triggers: payment success rate below threshold, security incident, LND channel failure
   - Proceed-to-mainnet gate: all Q3 KPIs met + TRUST_STATEMENT guardian distribution plan executed
   - Hard stop: any confirmed fund loss, even if within value caps

6. **Grant Reporting Schedule** — How these KPIs map to grant reporting:
   - Monthly progress updates to OpenSats (per their requirement)
   - Quarterly public writeups
   - KPI dashboard link (Grafana from `docker/grafana/dashboards/`)

Draw from: `lib/pilot-deployment.ts`, `lib/bce-metrics.ts`, `lib/grant-templates.ts`, `docs/roadmap.md`.

## Acceptance Criteria

- [ ] `docs/PILOT_KPIS.md` created with all 6 sections
- [ ] All metric targets accurately reflect `lib/pilot-deployment.ts` PilotKPITargets values
- [ ] 4 quarterly milestones defined with specific measurable targets
- [ ] Every KPI has a documented data source (specific table/column in Prisma schema or function in bce-metrics.ts)
- [ ] Success/failure thresholds defined for all primary KPIs
- [ ] Escalation criteria include both pause and proceed-to-mainnet conditions
- [ ] No placeholder values — use actual numbers from lib/pilot-deployment.ts

## Notes

_Generated from human_tasks.md: "Define Longmont pilot KPIs — Lock target metrics (30 merchants, 300 MAU, repeat-spend %) to quarterly milestones for grant credibility." Conductor identified this as agent-automatable. All KPI data exists in lib/pilot-deployment.ts and lib/bce-metrics.ts — agent can extract and format into a readable strategic document._
