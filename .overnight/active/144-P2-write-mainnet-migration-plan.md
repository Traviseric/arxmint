---
id: 144
title: "Write mainnet migration plan (docs/MIGRATION_PLAN.md)"
priority: P2
severity: medium
status: completed
source: human_tasks_md
file: docs/MIGRATION_PLAN.md
created: "2026-02-28T14:00:00Z"
execution_hint: parallel
context_group: documentation
group_reason: "Docs writing task, independent of tasks 141-143 but same category"
---

# Write mainnet migration plan (docs/MIGRATION_PLAN.md)

**Priority:** P2 (medium)
**Source:** human_tasks.md — "Mainnet migration plan"
**Location:** docs/MIGRATION_PLAN.md (new file)

## Problem

ArxMint's current pilot runs on a single-host Fedimint federation with testnet funds and value caps. Before accepting real mainnet Bitcoin, three major migrations must be planned and documented:

1. **Fedimint guardian distribution** — moving from 3 guardians on 1 VPS to independent operators
2. **Nutshell to CDK mint migration** — per Research #3, CDK replaces Nutshell when it drops "ALPHA" warning
3. **LND channel migration** — if guardians move to new machines, channel state must transfer cleanly

Without a documented migration plan, these complex multi-step operations would be done ad-hoc under pressure when they actually need to happen, risking funds. The human_tasks.md item "Don't accept real mainnet funds until this is documented" makes this a blocking safety gate.

## How to Fix

Create `docs/MIGRATION_PLAN.md` with the following sections:

1. **Pre-Mainnet Acceptance Criteria** — Hard gates that must be satisfied before accepting mainnet funds:
   - All Longmont pilot KPI thresholds met (reference `docs/PILOT_KPIS.md`)
   - Security audit pass (at minimum a self-audit against the security checklist)
   - Guardian distribution complete (independent operators, not single VPS)
   - Disaster recovery drill completed on testnet (per human_tasks.md)
   - Value caps configured for mainnet risk profile (different from testnet pilot)

2. **Guardian Distribution Process** — Step-by-step procedure for splitting from single-host to 3 independent operator nodes:
   - Pre-migration: snapshot guardian key material, verify backup integrity
   - Key ceremony: each new operator generates their key share on their own hardware
   - Federation reconfiguration: DKG ceremony with new operators
   - Transition: run old and new federation in parallel during handoff period
   - Verification: test all 3 operators can sign threshold transactions
   - Decommission: shut down old single-host federation after verification period
   - Operator requirements: independent VPS, hardware security, geographic diversity

3. **Nutshell to CDK Migration** — Two-mint Lightning swap procedure (per Research #3):
   - Trigger: CDK drops "ALPHA" warning in their repository
   - Step 1: Deploy CDK mint alongside Nutshell (use `docker-compose.cdk.yml` from task 017)
   - Step 2: Configure ArxMint to route NEW deposits to CDK, OLD proofs still redeemable at Nutshell
   - Step 3: Wait for Nutshell balance to drain to zero (existing holders redeem or swap)
   - Step 4: Announce Nutshell EOL date (30-day notice minimum)
   - Step 5: Decommission Nutshell after all outstanding proofs are redeemed
   - Risk: users who don't redeem lose funds — communication plan required

4. **LND Channel Migration** — If guardians move to new machines:
   - Preferred path: cooperative channel close and reopen on new node
   - Avoid: force close (creates timelock delays, potential fund loss)
   - Channel backup procedure: `scripts/watch_channel_backup.sh` + manual verification
   - Peer coordination: notify channel peers before migration

5. **User Communication Timeline** — How to communicate migration phases to the Longmont community:
   - 30-day advance notice for any value cap changes
   - 14-day notice for mint migration with upgrade instructions
   - 7-day notice for federation changes with wallet backup reminder
   - Communication channels: in-app notification, Nostr DM to registered users

6. **Rollback Criteria and Emergency Procedure** — When to abort migration:
   - Rollback trigger: any guardian key compromise, unexpected fund movement, LND channel failure
   - Emergency freeze: how to stop accepting new deposits without affecting existing users
   - Recovery: `docker compose down && docker compose -f [previous-version] up -d`
   - Escalation: contact list for guardian operators

Reference: `DEPLOY.md`, `docker/` configs (Caddyfile, docker-compose.yml, docker-compose.cdk.yml), `lib/replication-playbook.ts` (`generateReplicationPlaybook()`, `exportPlaybookMarkdown()`), `lib/pilot-deployment.ts`, `docs/roadmap.md`.

## Acceptance Criteria

- [ ] `docs/MIGRATION_PLAN.md` created with all 6 sections
- [ ] Pre-mainnet gate criteria are specific and testable (not vague)
- [ ] Guardian distribution procedure is step-by-step with rollback points
- [ ] Nutshell to CDK migration uses the two-mint Lightning swap approach from Research #3
- [ ] LND channel migration prioritizes cooperative close (not force close)
- [ ] User communication timelines are concrete (30/14/7 day notice periods specified)
- [ ] Emergency procedures reference actual docker compose commands from the codebase
- [ ] Content is consistent with DEPLOY.md and docker/ configs

## Notes

_Generated from human_tasks.md: "Mainnet migration plan — Define when guardians split to independent operators. Don't accept real mainnet funds until this is documented." Conductor identified this as agent-automatable. Agent can write migration procedures from existing codebase artifacts (docker configs, lib/replication-playbook.ts, Research #3 notes) without requiring live infrastructure access._
