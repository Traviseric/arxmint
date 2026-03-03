#!/usr/bin/env bash
# ArxMint - Prune archived PostgreSQL WAL segments
# Usage: ./scripts/prune_postgres_wal_archive.sh [wal-archive-path]

set -euo pipefail

WAL_ARCHIVE_DIR="${1:-/var/lib/docker/volumes/arxmint_postgres-wal-archive/_data}"
RETENTION_DAYS="${PITR_WAL_RETENTION_DAYS:-7}"

if [[ ! -d "$WAL_ARCHIVE_DIR" ]]; then
  echo "[pitr] WAL archive dir not found: $WAL_ARCHIVE_DIR" >&2
  exit 2
fi

find "$WAL_ARCHIVE_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete
echo "[pitr] Pruned WAL files older than ${RETENTION_DAYS} days in ${WAL_ARCHIVE_DIR}"
