#!/usr/bin/env bash
# ArxMint - LND channel.backup watcher
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
