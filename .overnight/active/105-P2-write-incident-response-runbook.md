---
id: 105
title: "Write incident response runbook"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_35
file: docs/INCIDENT_RESPONSE.md
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: parallel
context_group: infra
group_reason: "Infrastructure/docs: independent from code tasks, only touches docs/"
---

# Write incident response runbook

**Priority:** P2
**Source:** OVERNIGHT_TASKS.md ID 35
**Location:** new `docs/INCIDENT_RESPONSE.md`

## Problem

ArxMint has no documented procedure for handling production incidents. When the Longmont pilot runs with real money and something goes wrong (LND goes down, mint stops responding, federation loses quorum), operators have no playbook to follow.

Without a runbook:
- Recovery takes longer (figuring out steps under pressure)
- Mistakes happen (wrong rollback procedure)
- There's no clear escalation path
- The emergency mint freeze procedure isn't documented

## How to Fix

Create `docs/INCIDENT_RESPONSE.md` covering these scenarios (from OVERNIGHT_TASKS.md ID 35):

### Required sections:

**1. LND Goes Down**
- Check Docker container status: `docker compose ps lnd`
- View logs: `docker compose logs --tail=100 lnd`
- Restart: `docker compose restart lnd`
- Wait for channel sync before accepting payments
- If unresponsive: `docker compose stop lnd && docker compose start lnd`
- Check channel backup was not corrupted

**2. Mint Stops Responding**
- Check Nutshell/CDK container: `docker compose ps nutshell`
- View logs: `docker compose logs --tail=100 nutshell`
- Check Postgres connection from mint container
- Restart mint: `docker compose restart nutshell`
- If DB issue: check `docker compose ps postgres` and Postgres logs

**3. Federation Loses Quorum**
- For single-host federation: federation requires all guardians present
- Check Fedimint container: `docker compose ps fedimintd`
- Single-host: restart `docker compose restart fedimintd`
- Multi-host: requires coordination (out of scope for pilot — add note)

**4. Backup Fails**
- Check `scripts/backup_postgres.sh` logs (cron output or systemd journal)
- Manual backup: `docker exec arxmint-postgres pg_dump -U postgres arxmint | gzip > backup_manual_$(date +%s).sql.gz`
- Check disk space: `df -h`

**5. Disk Fills Up**
- Check: `df -h` and `docker system df`
- Clean old Docker images: `docker image prune -a`
- Clean old backups (> 7 days)
- Check Grafana dashboard for disk usage trend

**6. Payment Success Rate Drops**
- Check Grafana dashboard: LN channel balance, mint balance
- Check rate limiter isn't blocking legitimate traffic
- Review structured logs for error patterns
- If LND routing issue: try `lncli updatechanpolicy` to adjust fees

**7. Emergency: Freeze the Mint**
- Stop accepting new deposits: `docker compose stop nutshell`
- Existing proofs remain valid (verifiable via `/v1/checkstate`)
- Post notice to users
- Investigate root cause before restarting

**8. Alert Routing**
- Grafana alerts configured for: disk >70%, memory/swap, container restarts, LND health
- Alert notifications: configure Grafana email notification channel with pilot contact list

**9. Rollback Procedure**
```bash
docker compose down
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d image_tag=v1.2.3
```

**10. Contact list**
- Primary operator: [fill in before pilot]
- Backup contact: [fill in before pilot]

Also include:
- Testnet vs mainnet config differences
- How to verify a payment succeeded when user reports issue (check transaction log + Postgres)
- How to issue a manual refund if payment succeeded but access denied

## Acceptance Criteria

- [ ] `docs/INCIDENT_RESPONSE.md` created
- [ ] Covers all 7 scenarios from OVERNIGHT_TASKS.md: LND down, mint down, federation quorum, backup failure, disk full, payment success rate drop, emergency mint freeze
- [ ] Rollback procedure documented with actual Docker Compose commands
- [ ] Alert routing section referencing Grafana
- [ ] Contact list template (with placeholders for pilot operators)
- [ ] Recovery steps are copy-pasteable shell commands, not vague prose

## Notes

_Generated from OVERNIGHT_TASKS.md ID 35. This is a docs-only task — no code changes. Read `docs/roadmap.md` and `DEPLOY.md` for context on the production setup. The Docker service names should match `docker-compose.yml` service names._
