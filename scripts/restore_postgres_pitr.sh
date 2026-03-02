#!/usr/bin/env bash
# ArxMint - Postgres PITR restore helper
# Usage: ./scripts/restore_postgres_pitr.sh /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz [recovery-target-time]
#
# recovery-target-time format examples:
#   2026-03-02 18:30:00+00
#   2026-03-02T18:30:00Z

set -euo pipefail

BASE_BACKUP_FILE="${1:-}"
RECOVERY_TARGET_TIME="${2:-}"

if [[ -z "$BASE_BACKUP_FILE" ]]; then
  echo "Usage: $0 <base-backup-tar.gz> [recovery-target-time]" >&2
  exit 2
fi

if [[ ! -f "$BASE_BACKUP_FILE" ]]; then
  echo "[pitr-restore] base backup not found: $BASE_BACKUP_FILE" >&2
  exit 2
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DATA_VOLUME="${POSTGRES_DATA_VOLUME:-arxmint_postgres-data}"
BACKUP_DIR="$(cd "$(dirname "$BASE_BACKUP_FILE")" && pwd)"
BACKUP_NAME="$(basename "$BASE_BACKUP_FILE")"

echo "[pitr-restore] stopping postgres service"
docker compose -f "$COMPOSE_FILE" stop postgres

echo "[pitr-restore] restoring base backup into volume: $DATA_VOLUME"
docker run --rm \
  -v "${DATA_VOLUME}:/var/lib/postgresql/data" \
  -v "${BACKUP_DIR}:/backup:ro" \
  postgres:15-alpine \
  sh -c "
    rm -rf /var/lib/postgresql/data/* \
    && tar xzf /backup/${BACKUP_NAME} -C /var/lib/postgresql/data
  "

echo "[pitr-restore] writing recovery config"
RECOVERY_TARGET_LINE=""
if [[ -n "$RECOVERY_TARGET_TIME" ]]; then
  RECOVERY_TARGET_LINE="echo \"recovery_target_time = '${RECOVERY_TARGET_TIME}'\" >> /var/lib/postgresql/data/postgresql.auto.conf;"
fi

docker run --rm \
  -u root \
  -v "${DATA_VOLUME}:/var/lib/postgresql/data" \
  postgres:15-alpine \
  sh -c "
    echo \"restore_command = 'cp /var/lib/postgresql/wal-archive/%f %p'\" >> /var/lib/postgresql/data/postgresql.auto.conf;
    echo \"recovery_target_action = 'promote'\" >> /var/lib/postgresql/data/postgresql.auto.conf;
    ${RECOVERY_TARGET_LINE}
    touch /var/lib/postgresql/data/recovery.signal;
    chown -R 70:70 /var/lib/postgresql/data
  "

echo "[pitr-restore] starting postgres service"
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "[pitr-restore] complete"
