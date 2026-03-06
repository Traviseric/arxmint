# ArxMint Disaster Recovery — Restore Runbook

## When to Use This

| Scenario | Use |
|----------|-----|
| Bad update caused a regression | `scripts/rollback.sh` |
| Hardware failure / full data loss | `scripts/restore.sh` ← **this guide** |
| Single service crashed | `docker compose restart <service>` |

## Prerequisites

Before starting a restore, verify you have:

- [ ] Docker installed and running on the new/repaired host
- [ ] Your 24-word LND aezeed seed phrase (written down, not digital)
- [ ] Access to the `./backup/` directory (from local backup, external drive, or S3)
- [ ] `.env.local` or `.env.example` to re-create your configuration

## One-Click Restore (Recommended)

```bash
git clone https://github.com/arxmint/arxmint .
cd arxmint
cp .env.example .env.local
# Edit .env.local — fill in secrets (CASHU_PRIVATE_KEY, NEXTAUTH_SECRET, etc.)
./scripts/restore.sh --backup-dir /path/to/your/backup
```

The script will interactively guide you through each step.

## Manual Steps (If Script Fails)

### Step 1 — Environment Setup

```bash
# Install dependencies
npm install

# Copy and fill in secrets
cp .env.example .env.local
nano .env.local   # fill in CASHU_PRIVATE_KEY, NEXTAUTH_SECRET, etc.
```

### Step 2 — Start the Stack

```bash
docker compose -f docker/docker-compose.cashu.yml up -d
```

Wait ~30 seconds for services to initialize.

### Step 3 — Restore LND Wallet

```bash
docker exec -it sf-lnd-lite lncli create --recovery-window=2500
```

When prompted:
1. Choose "Restore an existing wallet"
2. Enter your 24-word aezeed seed phrase (one word per prompt)
3. Set a new wallet password
4. Wait for chain sync and channel recovery (can take 10–60 minutes on testnet)

Verify recovery:
```bash
docker exec sf-lnd-lite lncli walletbalance
docker exec sf-lnd-lite lncli listchannels
```

### Step 4 — Restore Cashu Proofs

```bash
# Find latest backup
ls -lt backup/cashu-proofs-*.json | head -1

# Import proofs
docker cp backup/cashu-proofs-YYYYMMDD.json sf-cashu-lite:/tmp/cashu-restore.json
docker exec sf-cashu-lite cashu-client import /tmp/cashu-restore.json
```

### Step 5 — Restore Postgres Database

```bash
# Find latest backup
ls -lt backup/postgres-*.sql.gz | head -1

# Restore
gunzip -c backup/postgres-YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i sf-postgres psql -U arxmint arxmint
```

### Step 6 — Verify Health

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok",...}
```

If unhealthy:
```bash
docker compose -f docker/docker-compose.cashu.yml logs --tail=50
```

## Verifying a Successful Restore

1. **Lightning balance:** `docker exec sf-lnd-lite lncli walletbalance` — should show your on-chain balance
2. **Channels:** `docker exec sf-lnd-lite lncli listchannels` — channels recover via SCB within ~10 minutes
3. **Cashu mint:** Open http://localhost:3338 — mint should respond
4. **Test payment:** Send a small test payment end-to-end via the ArxMint UI

## Backup File Reference

| File | Created By | What It Recovers |
|------|-----------|-----------------|
| `backup/channel.backup.latest` | `watch_channel_backup.sh` / `backup.sh` | Lightning channels (SCB) |
| `backup/cashu-proofs-YYYYMMDD.json` | `backup.sh` | Cashu ecash balances |
| `backup/postgres-YYYYMMDD_HHMMSS.sql.gz` | `backup_postgres.sh` / `backup.sh` | All ArxMint DB data |
| `backup/.env.local.backup` | `backup.sh` | Service configuration |

## Related Docs

- `docs/DR_DRILL.md` — quarterly drill checklist
- `scripts/backup.sh` — how backups are created
- `scripts/rollback.sh` — for bad update rollback (not hardware failure)
