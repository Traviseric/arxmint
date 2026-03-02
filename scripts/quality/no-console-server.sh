#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

paths=(
  "app/api"
  "middleware.ts"
  "instrumentation.ts"
  "lib/auth-middleware.ts"
  "lib/env-check.ts"
  "lib/db.ts"
  "lib/payment-sdk.ts"
  "lib/rate-limit.ts"
  "lib/logger.ts"
)

pattern='console\.(log|warn|error)\('

matches="$(rg -n "$pattern" "${paths[@]}" || true)"

if [[ -n "$matches" ]]; then
  # logger.ts intentionally writes JSON via console.log
  filtered="$(printf '%s\n' "$matches" | rg -v '^lib/logger\.ts:' || true)"
  if [[ -n "$filtered" ]]; then
    echo "[no-console-server] Found unstructured server logging calls:"
    printf '%s\n' "$filtered"
    exit 1
  fi
fi

echo "[no-console-server] OK"
