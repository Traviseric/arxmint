# ArxMint — Incident Response Runbook

**Version:** 1.0 | **Environment:** Production (Longmont pilot)
**Docker stack:** `docker-compose.yml` — services: `lnd`, `cashu-mint`, `fedimintd-{0,1,2}`, `postgres`, `web`, `caddy`

---

## Quick Reference

| Symptom | Scenario | Jump to |
|---------|----------|---------|
| Payments failing, no LND logs | LND down | [§1](#1-lnd-goes-down) |
| Mint 502 / ecash not minting | Mint down | [§2](#2-mint-stops-responding) |
| Fedimint wallet disconnected | Federation quorum | [§3](#3-federation-loses-quorum) |
| Backup emails stopped | Backup failure | [§4](#4-backup-fails) |
| Container logs stop / OOM | Disk/memory full | [§5](#5-disk-fills-up) |
| Payment success rate drops | Payment routing | [§6](#6-payment-success-rate-drops) |
| Suspected exploit / mint compromise | Emergency freeze | [§7](#7-emergency-freeze-the-mint) |
| Secret or credential exposed | Secret compromise | [§12](#12-secret-compromise-credential-rotation) |

---

## 1. LND Goes Down

**Symptoms:** Lightning payments fail, `/api/health` reports LND unhealthy, Grafana LND panel red.

```bash
# 1. Check container status
docker compose ps lnd

# 2. View recent logs
docker compose logs --tail=100 lnd

# 3. Soft restart (preserves wallet unlock)
docker compose restart lnd

# 4. Wait for neutrino sync before accepting payments (~2-5 min on testnet)
docker exec sf-lnd lncli --network=testnet getinfo | grep synced_to_chain

# 5. If container won't restart cleanly
docker compose stop lnd
docker compose start lnd

# 6. Verify channel backup integrity after restart
docker exec sf-lnd lncli --network=testnet listchannels | grep active
```

**Channel backup check:**
```bash
# Confirm channel.backup watcher is running (scripts/watch_channel_backup.sh)
ps aux | grep watch_channel_backup

# Manual backup if watcher died
docker exec sf-lnd lncli --network=testnet exportchanbackup --all \
  > /backups/channel_$(date +%s).backup
```

**If LND wallet is locked after restart:**
```bash
docker exec -it sf-lnd lncli --network=testnet unlock
# Enter wallet password when prompted
```

---

## 2. Mint Stops Responding

**Symptoms:** `/api/health` mint check fails, HTTP 502 on `/v1/info`, ecash minting/melting errors.

```bash
# 1. Check Nutshell container
docker compose ps cashu-mint

# 2. View logs
docker compose logs --tail=100 cashu-mint

# 3. Restart mint
docker compose restart cashu-mint

# 4. Check Postgres connection from mint container
docker exec sf-cashu wget -qO- http://localhost:3338/v1/info

# 5. If Postgres is the issue, check DB first (see §DB below)
docker compose ps postgres
docker compose logs --tail=50 postgres
```

**Verify mint is healthy after restart:**
```bash
curl -s http://localhost:3338/v1/info | jq '.name'
# Should return mint name string, not connection error
```

**Existing proofs remain valid** even when the mint is down — users' ecash tokens are still verifiable via `/v1/checkstate` once the mint is back up.

---

## 3. Federation Loses Quorum

**Symptoms:** Fedimint wallet shows "disconnected", federation API unreachable.

**Single-host pilot (all guardians on one machine):**
```bash
# 1. Check all guardian containers
docker compose ps fedimintd-0 fedimintd-1 fedimintd-2

# 2. View logs for the failing guardian
docker compose logs --tail=100 fedimintd-0
docker compose logs --tail=100 fedimintd-1
docker compose logs --tail=100 fedimintd-2

# 3. Restart all guardians (single-host: safe to restart all together)
docker compose restart fedimintd-0 fedimintd-1 fedimintd-2

# 4. Monitor reconnection
docker compose logs -f fedimintd-0
# Look for: "consensus started" or "Connected to guardian"
```

**Multi-host federation:** Requires coordination with all guardian operators. Quorum = 3/4 guardians online. Contact all operators before attempting recovery. Out of scope for single-host pilot — escalate to primary operator immediately.

**Note:** Guardian data is in named Docker volumes (`guardian-{0,1,2}-data`). Never delete these volumes — federation state is unrecoverable.

---

## 4. Backup Fails

**Symptoms:** No backup files in `/backups/` directory, cron job silent, Grafana backup age alert.

```bash
# 1. Check cron output
grep backup /var/log/syslog | tail -20
# or if using systemd timer:
journalctl -u arxmint-backup --since "24 hours ago"

# 2. Manual Postgres backup
docker exec sf-postgres pg_dump -U arxmint arxmint \
  | gzip > /backups/backup_manual_$(date +%s).sql.gz

# 3. Verify backup file is readable
gunzip -c /backups/backup_manual_*.sql.gz | head -5

# 4. Check disk space (may be the root cause)
df -h /backups

# 5. Verify backup script permissions
ls -la scripts/backup_postgres.sh
# Should be executable: -rwxr-xr-x
chmod +x scripts/backup_postgres.sh

# 6. Run backup script manually to see errors
bash -x scripts/backup_postgres.sh
```

**Restore from backup:**
```bash
gunzip -c /backups/backup_TIMESTAMP.sql.gz \
  | docker exec -i sf-postgres psql -U arxmint arxmint
```

**PITR restore (base backup + WAL replay):**
```bash
# Restore to latest available WAL state
./scripts/restore_postgres_pitr.sh \
  /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz

# Restore to a specific timestamp
./scripts/restore_postgres_pitr.sh \
  /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz \
  "2026-03-02 18:30:00+00"
```

See `docs/PITR_RUNBOOK.md` for full procedure and validation.

---

## 5. Disk Fills Up

**Symptoms:** Container restarts loop, logs stop, Grafana disk alert (>70% threshold), `df -h` shows full volume.

```bash
# 1. Check disk usage
df -h
docker system df

# 2. Clean unused Docker images (safe — only removes untagged/unreferenced)
docker image prune -a

# 3. Clean stopped containers
docker container prune

# 4. Remove old backups (keep last 7 days — matches backup script policy)
find /backups -name "*.sql.gz" -mtime +7 -delete

# 5. Check for large log files
du -sh /var/lib/docker/containers/*/*.log | sort -rh | head -10

# 6. Truncate a specific container log if bloated (safe)
truncate -s 0 $(docker inspect --format='{{.LogPath}}' sf-lnd)
```

**After clearing space:** Restart any containers that crashed due to disk pressure.

```bash
docker compose up -d
```

---

## 6. Payment Success Rate Drops

**Symptoms:** Grafana shows payment success rate < 95%, users report payment failures, error rate up in structured logs.

```bash
# 1. Check Grafana dashboard
# - LN channel balance (low balance = routing failures)
# - Mint balance
# - Rate limiter deny rate (api_rate_limit_exceeded errors)
# - Container restart count

# 2. Check structured logs for error patterns
docker compose logs --tail=200 web | grep '"level":"error"'

# 3. Check LND channel health
docker exec sf-lnd lncli --network=testnet listchannels \
  | jq '[.channels[] | {active, capacity, local_balance, remote_balance}]'

# 4. Check if rate limiter is blocking legitimate traffic
docker compose logs --tail=100 web | grep "rate limit"

# 5. If LND routing issue — adjust channel policy
docker exec sf-lnd lncli --network=testnet updatechanpolicy \
  --base_fee_msat 1000 --fee_rate 0.000001 --time_lock_delta 40

# 6. Verify /api/health endpoint
curl -s http://localhost:3000/api/health | jq .
```

**Common causes:**
- LND channel balance depleted: rebalance channel or open new channel
- Cashu mint keyset rotation: clients need to re-sync
- Database connection pool exhausted: restart `web` container
- Rate limiter misconfigured: check `RATE_LIMIT_*` env vars

---

## 7. Emergency: Freeze the Mint

**Use when:** Suspected exploit, double-spend attack, or mint compromise requiring immediate halt.

```bash
# STEP 1: Stop accepting new deposits immediately
docker compose stop cashu-mint

# STEP 2: Preserve evidence — snapshot DB before any changes
docker exec sf-postgres pg_dump -U arxmint arxmint \
  | gzip > /backups/incident_$(date +%s).sql.gz

# STEP 3: Take down web service to halt all payment flows
docker compose stop web

# STEP 4: Verify existing proofs are preserved in DB
docker exec sf-postgres psql -U arxmint -d arxmint \
  -c "SELECT COUNT(*) FROM \"Transaction\" WHERE type='receive';"

# STEP 5: Notify users
# Post to pilot communication channel / contact list (see §10)

# STEP 6: Investigate logs before restarting
docker compose logs cashu-mint > /tmp/mint_incident_$(date +%s).log
docker compose logs web > /tmp/web_incident_$(date +%s).log
```

**Note:** Existing ecash proofs in users' wallets remain cryptographically valid. When the mint restarts, users can verify proof states via `/v1/checkstate`. Do NOT delete the Postgres volume — proof state is in the database.

**Restart procedure after investigation:**
```bash
docker compose start web
docker compose start cashu-mint
# Verify health
curl -s http://localhost:3000/api/health | jq .
```

---

## 8. Alert Routing (Grafana)

**Configure Grafana notification channel before pilot launch:**

1. Open Grafana at `https://grafana.YOUR_DOMAIN`
2. Navigate to **Alerting → Contact points → New contact point**
3. Select **Email** — add pilot operator email addresses
4. Navigate to **Alerting → Notification policies** — set default contact point

**Pre-configured alerts to enable:**
| Alert | Threshold | Action |
|-------|-----------|--------|
| Disk usage | > 70% | Check §5 |
| Container restart | > 3 in 5 min | Check service logs |
| LND sync | `synced_to_chain: false` > 5 min | Check §1 |
| Web health | `/api/health` returns unhealthy | Check §2 or §6 |
| Memory usage | > 85% | Check §5 |

**Alert rules as code:** `docker/prometheus-alerts.yml`
- Validate changes with `promtool check rules docker/prometheus-alerts.yml`
- CI also validates this file in the build pipeline.

---

## 9. Rollback Procedure

**Roll back to a previous image tag:**
```bash
# 1. Stop current stack
docker compose down

# 2. Pull specific image tag
docker pull ghcr.io/arxmint/arxmint:v1.2.3  # replace with target version

# 3. Update docker-compose.yml image tag (or use override file)
# Edit web service: image: ghcr.io/arxmint/arxmint:v1.2.3

# 4. Start with previous version
docker compose up -d

# 5. Run DB migrations for the target version
docker exec sf-web npx prisma migrate deploy

# 6. Verify health
curl -s http://localhost:3000/api/health | jq .
```

**Roll back database schema:**
```bash
# Restore from pre-migration backup
gunzip -c /backups/backup_PRE_MIGRATION.sql.gz \
  | docker exec -i sf-postgres psql -U arxmint arxmint
```

**Testnet vs mainnet differences:**
- Testnet: `--bitcoin.testnet`, macaroon at `/root/.lnd/data/chain/bitcoin/testnet/admin.macaroon`
- Mainnet: `--bitcoin.mainnet`, macaroon at `/root/.lnd/data/chain/bitcoin/mainnet/admin.macaroon`
- Mainnet requires real funds in LND wallet — do NOT restart carelessly

---

## 10. Verifying Payments & Manual Refunds

**Verify a payment succeeded:**
```bash
# Check transaction log
docker exec sf-postgres psql -U arxmint -d arxmint \
  -c "SELECT id, type, amount, status, \"createdAt\" FROM \"Transaction\" WHERE id = 'TX_ID_HERE';"

# Check LND invoice status
docker exec sf-lnd lncli --network=testnet lookupinvoice PAYMENT_HASH_HEX
```

**Issue a manual refund (payment succeeded but access denied):**
```bash
# 1. Confirm payment in DB
docker exec sf-postgres psql -U arxmint -d arxmint \
  -c "SELECT * FROM \"Transaction\" WHERE id = 'TX_ID_HERE';"

# 2. Generate a new Cashu token for the refund amount
# (Use the admin interface or create via API with SKIP_PAYMENT_VERIFY=true temporarily)
# Contact primary operator to issue refund token manually

# 3. Log refund transaction
docker exec sf-postgres psql -U arxmint -d arxmint \
  -c "INSERT INTO \"Transaction\" (id, type, amount, status, notes) VALUES (gen_random_uuid(), 'refund', REFUND_AMOUNT, 'completed', 'Manual refund for TX_ID_HERE');"
```

---

## 11. Contact List

**Fill in before Longmont pilot launch:**

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Primary operator | [fill in] | [fill in] | [fill in] |
| Backup operator | [fill in] | [fill in] | [fill in] |
| Lightning support | [fill in] | [fill in] | [fill in] |
| Escalation (Fedimint) | Fedimint community | Discord: fedimint.org/chat | async |

---

## 12. Secret Compromise: Credential Rotation

**Target response time:** Start containment within 15 minutes. Complete credential rotation within 60 minutes for internet-facing secrets.

Use this when any of these are leaked or suspected leaked:
- `NEXTAUTH_SECRET`
- `AUTH_SHARED_SECRET`
- `MARKETPLACE_SHARED_SECRET`
- `MACAROON_ROOT_KEY`
- `CASHU_PRIVATE_KEY`
- `LND_MACAROON_HEX`

```bash
# 1. Freeze external access if needed (high-confidence compromise)
docker compose stop web

# 2. Generate replacement secrets
bash scripts/generate-secrets.sh --force

# 3. Manually rotate shared integration secrets in .env
# AUTH_SHARED_SECRET, MARKETPLACE_SHARED_SECRET, APERTURE_SHARED_SECRET,
# LND_MACAROON_HEX (re-bake in LND), any third-party API keys

# 4. Restart services with new credentials
docker compose up -d

# 5. Verify health
curl -s http://localhost:3000/api/health | jq .

# 6. Invalidate old sessions by restarting web with new NEXTAUTH_SECRET
# Existing sessions become invalid automatically after secret rotation
```

**Post-incident actions (same day):**
1. Revoke compromised credentials at the source system (LND macaroon, third-party API keys, etc.).
2. Confirm old credentials no longer authenticate.
3. Review logs for unauthorized use between exposure and rotation.
4. Record timeline, blast radius, and root cause in incident notes.

---

*Last updated: 2026-03-02 | Source: OVERNIGHT_TASKS.md ID 35*
