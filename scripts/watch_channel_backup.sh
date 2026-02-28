#!/usr/bin/env bash
# ArxMint — LND channel.backup watcher
#
# Copies channel.backup to a backup destination whenever it changes.
# CRITICAL: channel.backup must be backed up after every channel update.
# Losing it means losing all Lightning channels (funds may be unrecoverable).
#
# Usage:
#   ./scripts/watch_channel_backup.sh [backup-destination-path]
#
# Run as a background service:
#   nohup ./scripts/watch_channel_backup.sh /backups/lnd >> /var/log/arxmint-channel-backup.log 2>&1 &
#
# Or run with systemd/supervisor for auto-restart on crash.

set -euo pipefail

LND_DATA_DIR="${LND_DATA_DIR:-./lnd-data}"
NETWORK="${BITCOIN_NETWORK:-mainnet}"
CHANNEL_BACKUP="${LND_DATA_DIR}/chain/bitcoin/${NETWORK}/channel.backup"
BACKUP_DEST="${1:-/backups/lnd}"

mkdir -p "$BACKUP_DEST"

if [ ! -f "$CHANNEL_BACKUP" ]; then
  echo "[channel-backup] WARNING: channel.backup not found at $CHANNEL_BACKUP"
  echo "[channel-backup] Waiting for LND to create it..."
fi

copy_backup() {
  if [ ! -f "$CHANNEL_BACKUP" ]; then
    echo "[channel-backup] channel.backup still missing, skipping"
    return
  fi
  local ts
  ts=$(date +%Y%m%d_%H%M%S)
  cp "$CHANNEL_BACKUP" "${BACKUP_DEST}/channel.backup.${ts}"
  # Always keep a 'latest' copy for easy restore
  cp "$CHANNEL_BACKUP" "${BACKUP_DEST}/channel.backup.latest"
  local size
  size=$(du -sh "$CHANNEL_BACKUP" | cut -f1)
  echo "[channel-backup] Saved at ${ts} (${size})"
}

echo "[channel-backup] Watching: $CHANNEL_BACKUP -> $BACKUP_DEST"

# Initial copy on startup
copy_backup

# Use inotifywait if available (Linux); fall back to polling (macOS / any OS)
if command -v inotifywait &>/dev/null; then
  echo "[channel-backup] Using inotify for efficient file watching"
  while inotifywait -e close_write,moved_to "$CHANNEL_BACKUP" 2>/dev/null; do
    copy_backup
  done
else
  echo "[channel-backup] inotifywait not found — using 60s polling fallback"
  LAST_MOD=""
  while true; do
    CURRENT_MOD=$(stat -c %Y "$CHANNEL_BACKUP" 2>/dev/null || echo "0")
    if [ "$CURRENT_MOD" != "$LAST_MOD" ] && [ "$CURRENT_MOD" != "0" ]; then
      copy_backup
      LAST_MOD="$CURRENT_MOD"
    fi
    sleep 60
  done
fi
