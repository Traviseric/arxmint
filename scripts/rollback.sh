#!/usr/bin/env bash
# ArxMint Stack Rollback Script
# Restores the previous Docker image digests and brings the stack back up.
# Called automatically by update.sh on health check failure, or run manually.
# Usage: ./scripts/rollback.sh [--compose-file path] [--backup-dir path]
#
# T20 / Roadmap 5.11a

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.cashu.yml}"
BACKUP_DIR="${BACKUP_DIR:-.backup}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-file) COMPOSE_FILE="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

log() { echo "[rollback] $(date -u +%H:%M:%SZ) $*"; }

log "Starting ArxMint stack rollback..."

IMAGES_JSON="$BACKUP_DIR/last-good-images.json"
IMAGES_TXT="$BACKUP_DIR/last-good-images.txt"

if [ ! -f "$IMAGES_JSON" ] && [ ! -f "$IMAGES_TXT" ]; then
  log "ERROR: No backup image file found in $BACKUP_DIR — cannot rollback automatically."
  log "Manual recovery: restore from git tag and run: docker compose -f $COMPOSE_FILE up -d"
  exit 1
fi

# 1. Stop current (broken) containers
log "Stopping current containers..."
docker compose -f "$COMPOSE_FILE" down

# 2. Re-pull previous images by digest (if JSON backup available)
if [ -f "$IMAGES_JSON" ]; then
  log "Restoring previous images from saved digests ($IMAGES_JSON)..."
  # Parse digests and re-pull by sha256 digest
  while IFS= read -r line; do
    REPO=$(echo "$line" | grep -oP '"Repository":\s*"\K[^"]+' || true)
    DIGEST=$(echo "$line" | grep -oP '"ID":\s*"\K[^"]+' || true)
    if [ -n "$REPO" ] && [ -n "$DIGEST" ]; then
      log "Pulling $REPO@sha256:$DIGEST"
      docker pull "$REPO@$DIGEST" 2>/dev/null || log "WARNING: Could not pull $REPO@$DIGEST — image may not be in registry"
    fi
  done < "$IMAGES_JSON"
fi

# 3. Bring the previous stack back up
log "Starting previous stack..."
docker compose -f "$COMPOSE_FILE" up -d

# 4. Verify health
log "Verifying health after rollback..."
MAX_RETRIES=8
RETRY=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    log "ERROR: Stack unhealthy even after rollback. Manual intervention required."
    log "Check: docker compose -f $COMPOSE_FILE logs"
    exit 1
  fi
  log "Health check attempt $RETRY/$MAX_RETRIES — retrying in 5s..."
  sleep 5
done

log "Rollback successful. Stack is healthy on previous version."
