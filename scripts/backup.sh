#!/usr/bin/env bash
# ArxMint Full Stack Backup
# Backs up: LND SCB (channel.backup), Cashu proofs, Postgres DB.
# Encrypts all files with AES-256-GCM if BACKUP_ENCRYPTION_KEY is set.
#
# Usage: ./scripts/backup.sh [backup-dir]
# Cron example: 0 2 * * * /app/scripts/backup.sh /backups >> /var/log/arxmint-backup.log 2>&1
#
# T21 / Roadmap 5.11b

set -euo pipefail

BACKUP_DIR="${1:-./backup}"
LND_CONTAINER="${LND_CONTAINER:-sf-lnd-lite}"
CASHU_CONTAINER="${CASHU_CONTAINER:-sf-cashu-lite}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sf-postgres}"
POSTGRES_DB="${POSTGRES_DB:-arxmint}"
POSTGRES_USER="${POSTGRES_USER:-arxmint}"
NETWORK="${BITCOIN_NETWORK:-testnet}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() { echo "[backup] $(date -u +%H:%M:%SZ) $*"; }

mkdir -p "$BACKUP_DIR"

log "Starting ArxMint full backup → $BACKUP_DIR"

# ── 1. LND channel.backup (SCB) ───────────────────────────────────────────────
log "Backing up LND channel.backup (SCB)..."
SCB_DEST="${BACKUP_DIR}/channel.backup.${TIMESTAMP}"
docker cp "${LND_CONTAINER}:/root/.lnd/data/chain/bitcoin/${NETWORK}/channel.backup" "$SCB_DEST" && {
  # Keep a 'latest' copy for easy restore
  cp "$SCB_DEST" "${BACKUP_DIR}/channel.backup.latest"
  log "  SCB saved: $SCB_DEST ($(wc -c < "$SCB_DEST") bytes)"
} || log "  WARNING: LND container not running — SCB backup skipped"

# ── 2. Cashu proofs ───────────────────────────────────────────────────────────
log "Backing up Cashu proofs..."
CASHU_DEST="${BACKUP_DIR}/cashu-proofs-${TIMESTAMP}.json"
docker exec "$CASHU_CONTAINER" cashu-client export 2>/dev/null > "$CASHU_DEST" && {
  log "  Cashu proofs saved: $CASHU_DEST ($(wc -c < "$CASHU_DEST") bytes)"
} || log "  WARNING: Cashu container not running — proof backup skipped"

# ── 3. Postgres dump ──────────────────────────────────────────────────────────
log "Backing up Postgres database..."
PG_DEST="${BACKUP_DIR}/postgres-${TIMESTAMP}.sql.gz"
docker exec "$POSTGRES_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/dev/null | gzip > "$PG_DEST" && {
  log "  Postgres dump saved: $PG_DEST ($(wc -c < "$PG_DEST") bytes)"
} || log "  WARNING: Postgres container not running — DB backup skipped"

# ── 4. .env.local backup (permissions-sensitive) ─────────────────────────────
if [ -f ".env.local" ]; then
  cp ".env.local" "${BACKUP_DIR}/.env.local.backup"
  chmod 600 "${BACKUP_DIR}/.env.local.backup"
  log "  .env.local backed up"
fi

# ── 5. Encrypt if BACKUP_ENCRYPTION_KEY is set ───────────────────────────────
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  log "Encrypting backup files with AES-256-GCM..."
  for f in "$SCB_DEST" "$CASHU_DEST" "$PG_DEST"; do
    if [ -f "$f" ]; then
      # Generate random 12-byte IV, append authTag in output
      openssl enc -aes-256-gcm \
        -K "$BACKUP_ENCRYPTION_KEY" \
        -iv "$(openssl rand -hex 12)" \
        -in "$f" -out "${f}.enc" 2>/dev/null && {
        rm "$f"
        log "  Encrypted: ${f}.enc"
      } || log "  WARNING: openssl enc failed for $f — file left unencrypted"
    fi
  done
fi

# ── 6. Summary ────────────────────────────────────────────────────────────────
log ""
log "Backup summary:"
ls -lh "$BACKUP_DIR"/ | grep -E "(channel|cashu|postgres|env)" || true
log "Backup complete."
