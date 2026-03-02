#!/usr/bin/env bash
# ArxMint - Postgres PITR base backup script
# Usage: ./scripts/backup_postgres_pitr_base.sh [backup-destination-path]
# Creates a physical base backup (tar.gz) suitable for point-in-time recovery.

set -euo pipefail

BACKUP_DIR="${1:-/backups/postgres-pitr/base}"
CONTAINER="${POSTGRES_CONTAINER:-sf-postgres}"
DB_USER="${POSTGRES_USER:-arxmint}"
RETENTION_DAYS="${PITR_BASE_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/base_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

# Stream compressed tar base backup to host.
docker exec "$CONTAINER" \
  pg_basebackup \
    -U "$DB_USER" \
    -D - \
    -Ft \
    -X stream \
    -z \
    -c fast > "$BACKUP_FILE"

echo "[pitr] Base backup created: $BACKUP_FILE"

find "$BACKUP_DIR" -name "base_*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[pitr] Pruned base backups older than ${RETENTION_DAYS} days"
