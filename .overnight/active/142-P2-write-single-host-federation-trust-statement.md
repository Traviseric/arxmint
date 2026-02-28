---
id: 142
title: "Write single-host federation trust statement (docs/TRUST_STATEMENT.md)"
priority: P2
severity: medium
status: completed
source: human_tasks_md
file: docs/TRUST_STATEMENT.md
created: "2026-02-28T14:00:00Z"
execution_hint: parallel
context_group: documentation
group_reason: "Docs writing task, independent of tasks 141, 143, 144 but same category"
---

# Write single-host federation trust statement (docs/TRUST_STATEMENT.md)

**Priority:** P2 (medium)
**Source:** human_tasks.md — "Single-host federation trust statement"
**Location:** docs/TRUST_STATEMENT.md (new file)

## Problem

The Longmont pilot runs 3 Fedimint guardians on a single VPS. This is a deliberate engineering choice (per Research #2 in human_tasks.md) that trades trust-distribution for operational simplicity during the pilot phase. However, Fedimint's trust model depends on geographic and organizational separation of guardians — running all 3 on one machine means a single server compromise gives control of all guardian keys.

Without a clear public trust disclosure, users might assume they're getting full Fedimint trust guarantees. ArxMint's brand voice (`docs/brand.md`) is "honest, direct, protective" — obscuring this limitation would violate that voice and create legal/ethical liability.

## How to Fix

Create `docs/TRUST_STATEMENT.md` with the following content:

1. **What This Is** — Plain-language explanation of what the Longmont pilot is: an engineering pilot to prove the circular economy works end-to-end, running Fedimint guardians on a single VPS for operational simplicity.

2. **What This Is NOT** — Explicit statement: 3 guardians on 1 machine is NOT a trust-distributed federation. A server compromise could affect all guardian keys simultaneously. This pilot is effectively custodial at the infrastructure level.

3. **Value Caps in Effect During Pilot** — Reference `lib/pilot-deployment.ts` PilotKPITargets for the specific caps. These caps limit financial exposure during the engineering phase. Include the env-configurable limits from `lib/value-caps.ts`:
   - Maximum wallet balance per user (default: 50,000 sats)
   - Maximum single transaction (default: 10,000 sats)
   - Maximum daily volume per user (default: 100,000 sats)

4. **What Users Should Use This For** — Small-value, community-scale transactions. Trying the circular economy experience. Learning how Fedimint + Cashu works. NOT for significant savings or value storage during pilot phase.

5. **What Users Should NOT Use This For** — Large value storage, critical financial operations, anything where server compromise would be catastrophic. Refer users to a fully-distributed federation for high-value custody.

6. **Guardian Distribution Timeline** — When and how ArxMint will migrate from single-host to independent operator guardians before accepting mainnet funds:
   - Milestone: Pilot KPI targets met (reference docs/PILOT_KPIS.md)
   - Process: Key ceremony to distribute guardian keys to independent operators
   - Acceptance criteria for mainnet: Geographic + organizational separation of all guardians

7. **Responsible Disclosure Contact** — How to report security issues during the pilot.

Use the brand voice from `docs/brand.md`: confident, direct, honest. No legal hedging — plain language that a community member can understand.

## Acceptance Criteria

- [ ] `docs/TRUST_STATEMENT.md` created with all 7 sections
- [ ] Clearly states "3 guardians on 1 VPS = custodial pilot" in plain language
- [ ] Value caps are accurately cited from `lib/value-caps.ts` defaults
- [ ] Guardian distribution timeline is concrete (tied to KPI milestones)
- [ ] Tone matches `docs/brand.md` voice guidelines (honest, direct, not legalistic)
- [ ] No false reassurances about trust-distribution during pilot phase

## Notes

_Generated from human_tasks.md: "Single-host federation trust statement — Write public statement: 3 guardians on 1 VPS = custodial pilot, not distributed federation. Set value caps. Plan guardian distribution timeline." Conductor identified this as agent-automatable. Agent can write accurate disclosure from existing codebase data (lib/value-caps.ts, lib/pilot-deployment.ts) without requiring live infrastructure._
