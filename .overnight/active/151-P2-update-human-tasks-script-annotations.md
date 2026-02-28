---
id: 151
title: "Update human_tasks.md with script and doc annotations"
priority: P2
severity: medium
status: completed
source: root-human-tasks
file: human_tasks.md
created: "2026-02-28T18:00:00"
execution_hint: sequential
context_group: human_tasks_update
group_reason: "Single file edit, sequential to avoid conflicts"
---

# Update human_tasks.md with Script and Doc Annotations

**Priority:** P2 (medium)
**Source:** root-human-tasks
**Location:** human_tasks.md (root-level file)

## Problem

`human_tasks.md` has 18 unchecked items that are blocking the Python switch gate. Several of these items now have agent-provided scripts or docs that make them easier or partially complete, but the file doesn't reflect this. A human reading the file doesn't know which items have tooling support.

**Items that need annotation:**

1. **"Generate Cashu mint private key"** — `scripts/generate-secrets.sh` now generates this automatically (writes `CASHU_PRIVATE_KEY` to `.env`)
2. **"Generate NEXTAUTH_SECRET"** — `scripts/generate-secrets.sh` generates this too
3. **"Generate MACAROON_ROOT_KEY"** — `scripts/generate-secrets.sh` generates this too
4. **"Set GRAFANA_PASSWORD"** — `scripts/generate-secrets.sh` generates this too
5. **"Configure off-host backup destination"** — `scripts/backup_postgres.sh` and `scripts/watch_channel_backup.sh` now exist (from task 089). Human still needs to configure destination, but scripts are ready.
6. **"Disaster recovery drill on testnet"** — `docs/DR_DRILL.md` now exists (from task 146). Drill checklist is ready, human just needs to run it.
7. **"Provision Vultr VPS"** — `docs/VPS_SETUP.md` now exists (from task 147). Step-by-step provisioning checklist ready.

## How to Fix

Edit `human_tasks.md` to add inline notes to the affected unchecked items:

For items 1-4 (secret generation), consolidate and annotate:
```markdown
- [ ] **Generate Cashu mint private key, NEXTAUTH_SECRET, MACAROON_ROOT_KEY, and GRAFANA_PASSWORD** — Run `scripts/generate-secrets.sh` to generate all four secrets at once. Script writes them to `.env`, prompts before overwriting, shows masked output. (Script added by task 145.)
```
Or keep them separate but add `(Script: run \`scripts/generate-secrets.sh\`)` to each.

For item 5 (backup):
```markdown
- [ ] **Configure off-host backup destination** — Backup scripts ready: `scripts/backup_postgres.sh` (daily pg_dump + 7-day retention) and `scripts/watch_channel_backup.sh` (channel.backup sync on change). Human action needed: set destination path/SSH key in scripts. (Scripts added by task 089.)
```

For item 6 (DR drill):
```markdown
- [ ] **Disaster recovery drill on testnet** — Drill checklist ready in `docs/DR_DRILL.md`. Human action needed: spin new VPS + run the checklist. Do this BEFORE mainnet.
```

For item 7 (VPS):
```markdown
- [ ] **Provision Vultr VPS** — Step-by-step provisioning checklist in `docs/VPS_SETUP.md`. Covers SSH hardening, UFW rules, Docker install.
```

Also verify that the following `[x]` items in the file are accurately marked (they should already be done based on previous agent work):
- `[x] Prepare shared grant dossier` → docs/GRANT_DOSSIER.md ✓
- `[x] Define Longmont pilot KPIs` → docs/PILOT_KPIS.md ✓
- `[x] Single-host federation trust statement` → docs/TRUST_STATEMENT.md ✓
- `[x] Mainnet migration plan` → docs/MIGRATION_PLAN.md ✓

## Acceptance Criteria

- [ ] human_tasks.md items 1-4 (secret generation) annotated with reference to scripts/generate-secrets.sh
- [ ] Item 5 (backup) annotated with scripts/backup_postgres.sh and scripts/watch_channel_backup.sh
- [ ] Item 6 (DR drill) annotated with docs/DR_DRILL.md
- [ ] Item 7 (VPS provisioning) annotated with docs/VPS_SETUP.md
- [ ] All existing `[x]` items verified still accurate
- [ ] File structure preserved (no items removed, no accidental changes)

## Notes

_Generated from root-human-tasks synthesis. Python switch gate blocked by 18 unchecked items._
_This task adds context so Travis knows scripts/docs are ready — items remain unchecked because human action still required._
_Run `npm run build` after editing to ensure no import side effects (human_tasks.md is markdown-only, no build impact)._
