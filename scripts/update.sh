#!/usr/bin/env bash
# ArxMint Stack Update Script
# Pulls latest images, runs health check, auto-rolls back on failure.
# Usage: ./scripts/update.sh [--channel stable|beta] [--compose-file path]
#
# T20 / Roadmap 5.11a

set -euo pipefail

CHANNEL="${ARXMINT_UPDATE_CHANNEL:-stable}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.cashu.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-.backup}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel) CHANNEL="$2"; shift 2 ;;
    --compose-file) COMPOSE_FILE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

log() { echo "[update] $(date -u +%H:%M:%SZ) $*"; }

log "Starting ArxMint stack update (channel: $CHANNEL)"

# 1. Check containers are running
log "Checking running containers..."
docker compose -f "$COMPOSE_FILE" ps

# 2. Save current image digests for rollback
log "Saving current image digests for rollback..."
mkdir -p "$BACKUP_DIR"
docker compose -f "$COMPOSE_FILE" images --format json > "$BACKUP_DIR/last-good-images.json" 2>/dev/null || \
  docker compose -f "$COMPOSE_FILE" images > "$BACKUP_DIR/last-good-images.txt"
log "Image digests saved to $BACKUP_DIR/"

# 3. Pull latest code
log "Fetching latest code..."
git fetch --quiet
git pull origin main --ff-only || {
  log "WARNING: git pull failed — using current code, pulling images only"
}

# 4. Pull latest Docker images
log "Pulling latest Docker images..."
docker compose -f "$COMPOSE_FILE" pull

# 5. Bring up updated stack
log "Starting updated stack..."
docker compose -f "$COMPOSE_FILE" up -d

# 6. Health check — rollback if unhealthy
log "Running health check at $HEALTH_URL ..."
MAX_RETRIES=10
RETRY=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    log "ERROR: Health check failed after ${MAX_RETRIES} attempts — triggering rollback"
    bash "$(dirname "$0")/rollback.sh" --compose-file "$COMPOSE_FILE" --backup-dir "$BACKUP_DIR"
    exit 1
  fi
  log "Health check attempt $RETRY/$MAX_RETRIES failed — retrying in 5s..."
  sleep 5
done

log "Update successful! Stack is healthy."
