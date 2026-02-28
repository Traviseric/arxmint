---
id: 141
title: "Write shared grant dossier template (docs/GRANT_DOSSIER.md)"
priority: P2
severity: medium
status: completed
source: human_tasks_md
file: docs/GRANT_DOSSIER.md
created: "2026-02-28T14:00:00Z"
execution_hint: parallel
context_group: documentation
group_reason: "Docs writing task, independent of tasks 142-144 but same category"
---

# Write shared grant dossier template (docs/GRANT_DOSSIER.md)

**Priority:** P2 (medium)
**Source:** human_tasks.md — "Prepare shared grant dossier"
**Location:** docs/GRANT_DOSSIER.md (new file)

## Problem

ArxMint needs to apply for OpenSats General Grant, HRF Bitcoin Development Fund, and Spiral grants (all listed in human_tasks.md). Each application requires overlapping content: executive summary, technical scope, budget, team bios, and a threat model. Without a shared dossier document, Travis would have to rewrite this content three times with risk of inconsistency.

The reusable dossier serves as the authoritative source that gets adapted per-application. It must draw from existing project artifacts: `lib/grant-templates.ts`, `lib/pilot-deployment.ts`, `docs/spec.md`, `docs/roadmap.md`.

## How to Fix

Create `docs/GRANT_DOSSIER.md` with the following sections:

1. **Executive Summary (1-page)** — ArxMint mission, the problem (creator deplatforming, custodial Bitcoin wallets, agent commerce barrier), the solution (AI-sovereign circular economy builder), and the unique value proposition. Use brand voice from `docs/brand.md`. Reference the Longmont pilot as proof-of-work.

2. **Technical Scope** — Architecture overview (Next.js 15, Fedimint, Cashu/NUT-24, L402, Docker), all roadmap phases from `docs/roadmap.md` (Fortify → Keystone → Spire → Aether → Citadel), current implementation status (phases 0-4 complete), and what the grant funds.

3. **Budget Template** — Personnel placeholder (Travis + contributor hours), infrastructure costs (Vultr 16GB/6-core $80/mo from human_tasks.md, backup storage, domain), milestone-based spend breakdown aligned to quarterly grant reporting periods. Include both $75K (minimum) and $200K (full) scenarios matching the OpenSats ask range.

4. **Team Bios Template** — Placeholder sections for Travis and contributors. Include: Bitcoin/Lightning background, relevant open-source contributions, pilot community ties (Longmont).

5. **Open-Source Licensing Statement** — MIT license, Bitcoin ethos statement, non-custodial commitment, no VC/investor capture. Reference the open-source components used (Fedimint, cashu-ts, LNC-Web).

6. **Threat Model Overview** — Privacy-first architecture (non-custodial, IndexedDB proofs, no user data on server), pilot value caps (from `lib/pilot-deployment.ts` PilotKPITargets), single-host pilot honest disclosure (3 guardians on 1 VPS = engineering pilot), guardian distribution timeline before mainnet.

Draw directly from:
- `lib/grant-templates.ts` — `generateOpenSatsApplication()`, `generateFBCEApplication()` for existing content
- `lib/pilot-deployment.ts` — `PilotKPITargets`, `generatePilotTimeline()`, `MultiCityNetwork`
- `docs/spec.md` — canonical product spec and acceptance criteria
- `docs/roadmap.md` — phase descriptions and milestones
- `docs/brand.md` — voice and tone guidelines

## Acceptance Criteria

- [ ] `docs/GRANT_DOSSIER.md` created with all 6 sections
- [ ] Executive summary is 1-page equivalent (under 400 words)
- [ ] Budget template includes both $75K and $200K scenarios
- [ ] Technical scope references all 5 roadmap phases by name
- [ ] Threat model accurately describes non-custodial architecture and pilot limitations
- [ ] Content is consistent with `lib/grant-templates.ts` existing narratives
- [ ] No placeholder [TODO] left unfilled — use actual project data where available

## Notes

_Generated from human_tasks.md: "Prepare shared grant dossier — Executive summary, technical scope, budget, team bios, open-source licensing statement, threat model. Reusable across OpenSats/HRF/Spiral applications." Conductor identified this as agent-automatable documentation writing. Agent can populate all sections from existing codebase artifacts without requiring live pilot data._
