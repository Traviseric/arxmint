#!/usr/bin/env bash
# ArxMint — Postgres backup script
# Dumps the arxmint database and compresses it, keeping 7 days of backups.
#
# Usage:
#   ./scripts/backup_postgres.sh [backup-destination-path]
#
# Crontab (daily at 2am):
#   0 2 * * * /app/scripts/backup_postgres.sh /backups/postgres >> /var/log/arxmint-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${1:-/backups/postgres}"
CONTAINER="${POSTGRES_CONTAINER:-sf-postgres}"
DB_NAME="${POSTGRES_DB:-arxmint}"
DB_USER="${POSTGRES_USER:-arxmint}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/arxmint_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting Postgres dump: $(date)"

# Dump and compress in a single pipeline
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[backup] Dump complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Remove backups older than RETENTION_DAYS
PRUNED=$(find "$BACKUP_DIR" -name "arxmint_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
echo "[backup] Pruned ${PRUNED} backup(s) older than ${RETENTION_DAYS} days"

# Optional: sync to remote storage (configure and uncomment)
# rsync -az "$BACKUP_DIR/" user@backup-host:/remote/backups/arxmint/
# rclone copy "$BACKUP_DIR" remote:arxmint-backups --min-age "${RETENTION_DAYS}d"

echo "[backup] Done: $(date)"
