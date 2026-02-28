---
id: 89
title: "Add backup automation scripts (Postgres dump + LND channel.backup watcher)"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_24
file: scripts/backup_postgres.sh
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: parallel
context_group: infrastructure
group_reason: "Infrastructure task. Independent of 087 and 088 — can run in parallel."
---

# Add backup automation scripts (Postgres dump + LND channel.backup watcher)

**Priority:** P1 (medium)
**Source:** OVERNIGHT_TASKS.md ID 24
**Location:** scripts/backup_postgres.sh (new), scripts/watch_channel_backup.sh (new)

## Problem

The ArxMint stack has no backup automation. Research #2 defines the state safety hierarchy:
**channel.backup > wallet seed > guardian keys > Postgres > monitoring**

LND's `channel.backup` file changes every time channels are updated — failure to back it up means loss of all Lightning channels. Postgres contains community configs, merchant listings, and transaction history — loss means operational data loss.

## How to Fix

### Create `scripts/backup_postgres.sh`

```bash
#!/usr/bin/env bash
# ArxMint — Postgres backup script
# Usage: ./scripts/backup_postgres.sh [backup-destination-path]
# Designed for crontab: 0 2 * * * /app/scripts/backup_postgres.sh /backups

set -euo pipefail

BACKUP_DIR="${1:-/backups/postgres}"
CONTAINER="sf-postgres"
DB_NAME="arxmint"
DB_USER="arxmint"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/arxmint_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump and compress
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[backup] Postgres dump: $BACKUP_FILE"

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "arxmint_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[backup] Pruned backups older than ${RETENTION_DAYS} days"

# Optional: sync to remote (uncomment and configure)
# rsync -az "$BACKUP_DIR/" user@backup-host:/remote/backups/
```

### Create `scripts/watch_channel_backup.sh`

```bash
#!/usr/bin/env bash
# ArxMint — LND channel.backup watcher
# Copies channel.backup to backup destination whenever it changes
# Usage: ./scripts/watch_channel_backup.sh [backup-destination-path]

set -euo pipefail

LND_DATA_DIR="${LND_DATA_DIR:-./lnd-data}"
CHANNEL_BACKUP="${LND_DATA_DIR}/chain/bitcoin/mainnet/channel.backup"
BACKUP_DEST="${1:-/backups/lnd}"

mkdir -p "$BACKUP_DEST"

echo "[channel-backup] Watching: $CHANNEL_BACKUP"

copy_backup() {
  local ts
  ts=$(date +%Y%m%d_%H%M%S)
  cp "$CHANNEL_BACKUP" "${BACKUP_DEST}/channel.backup.${ts}"
  cp "$CHANNEL_BACKUP" "${BACKUP_DEST}/channel.backup.latest"
  echo "[channel-backup] Saved at ${ts}"
}

# Initial copy
copy_backup

# Watch for changes (inotify if available, else polling)
if command -v inotifywait &>/dev/null; then
  while inotifywait -e close_write "$CHANNEL_BACKUP" 2>/dev/null; do
    copy_backup
  done
else
  # Fallback: poll every 60 seconds
  LAST_MOD=""
  while true; do
    CURRENT_MOD=$(stat -c %Y "$CHANNEL_BACKUP" 2>/dev/null || echo "0")
    if [ "$CURRENT_MOD" != "$LAST_MOD" ]; then
      copy_backup
      LAST_MOD="$CURRENT_MOD"
    fi
    sleep 60
  done
fi
```

Make both scripts executable and add crontab documentation to `DEPLOY.md`:
```
# Add to crontab: daily Postgres backup at 2am
0 2 * * * /app/scripts/backup_postgres.sh /backups/postgres

# Run channel backup watcher as a service (or background process)
nohup /app/scripts/watch_channel_backup.sh /backups/lnd &
```

## Acceptance Criteria

- [ ] `scripts/backup_postgres.sh` created and executable (`chmod +x`)
- [ ] `scripts/watch_channel_backup.sh` created and executable
- [ ] Postgres backup uses `pg_dump | gzip` and 7-day retention
- [ ] Channel backup watcher handles both inotify and polling fallback
- [ ] Crontab setup documented in `DEPLOY.md` (add to existing file)
- [ ] `npm run build` passes (shell scripts don't affect build)

## Notes

_Generated from OVERNIGHT_TASKS.md ID 24. Shell scripts only — no TypeScript changes. Can run in parallel with other P1 tasks._
