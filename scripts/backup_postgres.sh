#!/usr/bin/env bash
# ArxMint - Postgres backup script
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
