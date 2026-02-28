---
id: 146
title: "Write docs/DR_DRILL.md (disaster recovery drill checklist for testnet)"
priority: P1
severity: high
status: completed
source: human_tasks_switch_blocked
file: docs/DR_DRILL.md
created: "2026-02-28T16:00:00Z"
execution_hint: parallel
context_group: deploy_prep
group_reason: "Infrastructure preparation tasks alongside 145 and 147"
---

# Write docs/DR_DRILL.md (disaster recovery drill checklist for testnet)

**Priority:** P1 (high)
**Source:** human_tasks.md — "Disaster recovery drill on testnet" (Pilot Operations section)
**Location:** docs/DR_DRILL.md (new file)

## Problem

Human task: "Spin new VPS, restore volumes + env, verify LND + Fedimint transact. Do this BEFORE mainnet."

ArxMint already has `docs/INCIDENT_RESPONSE.md` — that document handles operational incidents on a running production system (LND down, mint responding slowly, etc.).

The DR drill is different: it's a full-stack restore test from zero, simulating the worst case (total VPS loss). There is currently no step-by-step DR drill checklist. Without it, Travis cannot confidently perform the drill before mainnet launch.

The backup automation scripts already exist (`scripts/backup_postgres.sh`, `scripts/watch_channel_backup.sh`). The DR drill checklist tells Travis how to USE those backups to restore a fresh system, then verify it actually works.

## How to Fix

Create `docs/DR_DRILL.md` with the following content:

### Document structure:

1. **Overview** — Purpose of the drill (validate backup integrity + restore procedure before accepting real funds), recommended frequency (quarterly or before any major upgrade), and expected duration (~2 hours on testnet).

2. **Prerequisites** — What must be in place before running the drill:
   - A secondary VPS or local Docker environment (NOT the production machine)
   - `.env` backup available (offline USB or encrypted cloud)
   - LND `channel.backup` (from automated backup script)
   - Postgres dump from most recent `backup_postgres.sh` run
   - Fedimint guardian key backups (`fedimint-data-{0,1,2}` volume exports)

3. **Phase 1: Backup Verification (no downtime, 30 min)**
   - Verify `channel.backup` file is recent (< 24h) and non-zero bytes
   - Verify Postgres dump file exists and is valid (`pg_restore --list` dry run)
   - Verify Fedimint volume exports are complete

4. **Phase 2: Restore on Fresh VPS (1 hour)**
   - Provision fresh VPS (testnet — can use local Docker Compose instead)
   - Copy `.env` and backup files to new machine
   - Start stack: `docker compose up -d postgres caddy`
   - Restore Postgres: `pg_restore` into new database
   - Import Fedimint guardian volumes
   - Start remaining services: `docker compose up -d lnd fedimintd-0 fedimintd-1 fedimintd-2 cashu-mint web`
   - LND static channel recovery: `docker exec sf-lnd lncli restorechanbackup --multi_file /root/.lnd/data/chain/bitcoin/testnet/channel.backup`

5. **Phase 3: Verification Tests (30 min)**
   - `/api/health` returns 200 with all services healthy
   - LND channel list shows restored channels (`lncli listchannels`)
   - Fedimint quorum achieves consensus (check logs for "threshold reached")
   - Send a test Lightning payment (testnet sats)
   - Mint a test Cashu ecash token
   - Verify Postgres data: community count, merchant count match pre-drill snapshot

6. **Pass/Fail Criteria** — Drill passes if all Phase 3 tests succeed. Document actual timestamps vs expected.

7. **Drill Log Template** — A table to fill in: Date, Operator, Duration, Backup age at drill time, All Phase 3 tests pass (Y/N), Issues found, Follow-up actions.

Reference the following existing ArxMint artifacts:
- `scripts/backup_postgres.sh` — backup invocation
- `scripts/watch_channel_backup.sh` — LND backup watcher
- `docs/INCIDENT_RESPONSE.md` — operational context
- `docs/MIGRATION_PLAN.md` — guardian migration context (so drill includes Fedimint restore)
- `docker/docker-compose.yml` — service names and volumes

## Acceptance Criteria

- [ ] `docs/DR_DRILL.md` created with all 7 sections
- [ ] Document clearly distinguishes DR drill from incident response (different purposes)
- [ ] Phase 2 restore commands are accurate for ArxMint Docker Compose stack
- [ ] LND static channel backup recovery command is correct
- [ ] Phase 3 verification tests are actionable (specific commands, not vague)
- [ ] Drill log template included for record-keeping
- [ ] Duration estimates are realistic (flag if testnet differs from mainnet)

## Notes

_Generated from human_tasks.md switch-blocked items. The DR drill cannot be automated end-to-end (requires a real VPS provisioned by human), but this document gives Travis a step-by-step checklist so the drill is structured and reproducible. Completing the drill is required before accepting real mainnet funds (per human_tasks.md)._
