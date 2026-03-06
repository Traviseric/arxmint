#!/usr/bin/env bash
# ============================================================
# ArxMint CLI — thin wrapper around the ArxMint API
#
# Usage:
#   ./scripts/arxmint.sh keys rotate --merchant-id <id> --scope <live|pub|test>
#   ./scripts/arxmint.sh keys list   --merchant-id <id>
#   ./scripts/arxmint.sh keys revoke --merchant-id <id> --key <key_prefix>
#
# Auth:
#   Set ARXMINT_SESSION to your session token (copy from the arxmint_session
#   browser cookie after logging in at arxmint.com/merchants).
#   Set ARXMINT_URL to override the default base URL (default: http://localhost:3000).
#
# Examples:
#   ARXMINT_SESSION="<token>" ./scripts/arxmint.sh keys list --merchant-id glacier
#   ARXMINT_SESSION="<token>" ./scripts/arxmint.sh keys rotate --merchant-id glacier --scope live
#   ARXMINT_SESSION="<token>" ./scripts/arxmint.sh keys revoke --merchant-id glacier --key arx_live_abc123
# ============================================================

set -euo pipefail

ARXMINT_URL="${ARXMINT_URL:-http://localhost:3000}"
ARXMINT_SESSION="${ARXMINT_SESSION:-}"

# ── Preflight checks ─────────────────────────────────────────

if ! command -v curl &>/dev/null; then
  echo "ERROR: curl is required but not installed." >&2
  exit 1
fi

if [ -z "$ARXMINT_SESSION" ]; then
  echo "ERROR: ARXMINT_SESSION is not set." >&2
  echo "" >&2
  echo "  1. Log in at ${ARXMINT_URL}/merchants" >&2
  echo "  2. Open browser DevTools → Application → Cookies" >&2
  echo "  3. Copy the value of the 'arxmint_session' cookie" >&2
  echo "  4. Export it: export ARXMINT_SESSION=\"<value>\"" >&2
  exit 1
fi

# ── Argument parsing helpers ─────────────────────────────────

MERCHANT_ID=""
SCOPE="live"
KEY=""

parse_flags() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --merchant-id)
        MERCHANT_ID="$2"; shift 2 ;;
      --scope)
        SCOPE="$2"; shift 2 ;;
      --key)
        KEY="$2"; shift 2 ;;
      *)
        echo "Unknown flag: $1" >&2
        exit 1 ;;
    esac
  done
}

auth_cookie() {
  echo "arxmint_session=${ARXMINT_SESSION}"
}

# ── Commands ─────────────────────────────────────────────────

cmd_keys_list() {
  parse_flags "$@"
  if [ -z "$MERCHANT_ID" ]; then
    echo "ERROR: --merchant-id is required" >&2; exit 1
  fi

  curl -sf \
    -b "$(auth_cookie)" \
    "${ARXMINT_URL}/api/merchant-keys?merchantId=${MERCHANT_ID}" \
    | command -v jq &>/dev/null && jq . || cat
}

cmd_keys_rotate() {
  parse_flags "$@"
  if [ -z "$MERCHANT_ID" ]; then
    echo "ERROR: --merchant-id is required" >&2; exit 1
  fi

  local valid_scopes="live pub test"
  if [[ ! " $valid_scopes " =~ " $SCOPE " ]]; then
    echo "ERROR: --scope must be one of: live, pub, test" >&2; exit 1
  fi

  echo "Issuing new ${SCOPE} key for merchant '${MERCHANT_ID}'..."
  local response
  response=$(curl -sf \
    -X POST \
    -b "$(auth_cookie)" \
    -H "Content-Type: application/json" \
    -d "{\"merchantId\": \"${MERCHANT_ID}\", \"scope\": \"${SCOPE}\"}" \
    "${ARXMINT_URL}/api/merchant-keys")

  echo "$response" | { command -v jq &>/dev/null && jq . || cat; }
  echo "" >&2
  echo "IMPORTANT: Store the returned key securely — it is shown only once." >&2
}

cmd_keys_revoke() {
  parse_flags "$@"
  if [ -z "$MERCHANT_ID" ] || [ -z "$KEY" ]; then
    echo "ERROR: --merchant-id and --key are required" >&2; exit 1
  fi

  echo "Revoking key '${KEY}' for merchant '${MERCHANT_ID}'..."
  curl -sf \
    -X DELETE \
    -b "$(auth_cookie)" \
    "${ARXMINT_URL}/api/merchant-keys?key=${KEY}&merchantId=${MERCHANT_ID}" \
    | { command -v jq &>/dev/null && jq . || cat; }
}

usage() {
  cat >&2 <<EOF
ArxMint CLI

Usage:
  arxmint.sh keys list   --merchant-id <id>
  arxmint.sh keys rotate --merchant-id <id> [--scope live|pub|test]
  arxmint.sh keys revoke --merchant-id <id> --key <key>

Environment:
  ARXMINT_SESSION   Session token (from arxmint_session browser cookie) [required]
  ARXMINT_URL       Base URL (default: http://localhost:3000)
EOF
  exit 1
}

# ── Dispatch ─────────────────────────────────────────────────

COMMAND="${1:-}" ; shift || true
SUBCOMMAND="${1:-}" ; shift || true

case "${COMMAND} ${SUBCOMMAND}" in
  "keys list")   cmd_keys_list "$@" ;;
  "keys rotate") cmd_keys_rotate "$@" ;;
  "keys revoke") cmd_keys_revoke "$@" ;;
  *)             usage ;;
esac
