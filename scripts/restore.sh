#!/usr/bin/env bash
# ArxMint One-Click Restore
# Restores a full ArxMint stack from: LND seed phrase + backup files.
# Idempotent — safe to run multiple times without data corruption.
#
# Usage: ./scripts/restore.sh [--backup-dir /path/to/backup] [--compose-file path]
#
# T22 / Roadmap 5.11c

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backup}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.cashu.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
LND_CONTAINER="${LND_CONTAINER:-sf-lnd-lite}"
CASHU_CONTAINER="${CASHU_CONTAINER:-sf-cashu-lite}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sf-postgres}"
POSTGRES_DB="${POSTGRES_DB:-arxmint}"
POSTGRES_USER="${POSTGRES_USER:-arxmint}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --compose-file) COMPOSE_FILE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

log() { echo "[restore] $(date -u +%H:%M:%SZ) $*"; }
warn() { echo "[restore] WARNING: $*"; }

log "=== ArxMint One-Click Restore ==="
log "Backup dir: $BACKUP_DIR"
log "Compose file: $COMPOSE_FILE"
echo ""

# ── Step 1: Environment check ─────────────────────────────────────────────────
log "Step 1: Environment check"

if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed or not in PATH. Install Docker first."
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "ERROR: Docker daemon is not running. Start Docker and retry."
  exit 1
fi

if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
  warn ".env.local not found — copying from .env.example"
  cp .env.example .env.local
  echo ""
  echo "  ⚠️  Edit .env.local and fill in your secrets before continuing."
  echo "  Then re-run this script."
  echo ""
  exit 1
fi

if [ ! -f ".env.local" ]; then
  echo "ERROR: .env.local not found. Create it from .env.example and fill in secrets."
  exit 1
fi

log "Environment check passed."

# ── Step 2: Start the stack (needed before wallet restore) ────────────────────
log "Step 2: Starting Docker stack..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for LND to be ready
log "Waiting for LND to start (up to 30s)..."
for i in $(seq 1 30); do
  if docker exec "$LND_CONTAINER" lncli getinfo &>/dev/null 2>&1; then
    log "LND is ready."
    break
  fi
  sleep 1
done

# ── Step 3: LND wallet restore ────────────────────────────────────────────────
log "Step 3: LND wallet restore"
log "You will need your 24-word aezeed seed phrase."
log ""
log "If you already have a wallet (lncli getinfo returns data), skip this step."
echo ""
read -rp "  Restore LND wallet from seed? [y/N] " RESTORE_WALLET

if [[ "$RESTORE_WALLET" =~ ^[Yy]$ ]]; then
  log "Starting LND wallet recovery (recovery-window=2500)..."
  log "You will be prompted for your seed phrase and wallet password."
  docker exec -it "$LND_CONTAINER" lncli create --recovery-window=2500 || {
    warn "lncli create failed or was skipped. Continue manually if needed."
  }
  log "Waiting for LND to sync and recover channels (this can take minutes)..."
fi

# ── Step 4: Cashu proof restore ───────────────────────────────────────────────
log "Step 4: Cashu proof restore"
CASHU_BACKUP=$(ls -t "$BACKUP_DIR"/cashu-proofs-*.json 2>/dev/null | head -1 || true)

if [ -n "$CASHU_BACKUP" ]; then
  log "Found Cashu backup: $CASHU_BACKUP"
  read -rp "  Import Cashu proofs from $CASHU_BACKUP? [y/N] " RESTORE_CASHU
  if [[ "$RESTORE_CASHU" =~ ^[Yy]$ ]]; then
    docker cp "$CASHU_BACKUP" "${CASHU_CONTAINER}:/tmp/cashu-proofs-restore.json"
    docker exec "$CASHU_CONTAINER" cashu-client import /tmp/cashu-proofs-restore.json 2>/dev/null || {
      warn "cashu-client import failed. Proofs may need to be imported manually."
    }
    log "Cashu proofs imported."
  fi
else
  warn "No Cashu backup found in $BACKUP_DIR — skipping."
fi

# ── Step 5: Database restore ──────────────────────────────────────────────────
log "Step 5: Postgres database restore"
PG_BACKUP=$(ls -t "$BACKUP_DIR"/postgres-*.sql.gz 2>/dev/null | head -1 || true)

if [ -n "$PG_BACKUP" ]; then
  log "Found Postgres backup: $PG_BACKUP"
  read -rp "  Restore database from $PG_BACKUP? [y/N] " RESTORE_PG
  if [[ "$RESTORE_PG" =~ ^[Yy]$ ]]; then
    log "Restoring Postgres from $PG_BACKUP..."
    gunzip -c "$PG_BACKUP" | docker exec -i "$POSTGRES_CONTAINER" \
      psql -U "$POSTGRES_USER" "$POSTGRES_DB" || {
      warn "Postgres restore failed. Check container logs."
    }
    log "Postgres restored."
  fi
else
  warn "No Postgres backup found in $BACKUP_DIR — skipping."
fi

# ── Step 6: Health verify ─────────────────────────────────────────────────────
log "Step 6: Verifying stack health..."
MAX_RETRIES=12
RETRY=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    warn "Stack not responding at $HEALTH_URL after ${MAX_RETRIES} attempts."
    warn "Check logs: docker compose -f $COMPOSE_FILE logs"
    exit 1
  fi
  log "Waiting for stack to be healthy ($RETRY/$MAX_RETRIES)..."
  sleep 5
done

log ""
log "=== Restore complete! Stack is healthy. ==="
log ""
log "Next steps:"
log "  1. Verify your Lightning balance: docker exec $LND_CONTAINER lncli walletbalance"
log "  2. Test a payment via the ArxMint web UI"
log "  3. Check channel status: docker exec $LND_CONTAINER lncli listchannels"
log ""
log "See docs/RESTORE.md for manual steps if anything looks wrong."
