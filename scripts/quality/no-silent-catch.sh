#!/usr/bin/env bash
set -euo pipefail

TARGETS=(
  app
  lib
  middleware.ts
  instrumentation.ts
)

EMPTY_CATCH_PATTERN='catch\s*\([^)]*\)\s*\{\s*\}'
SILENT_PROMISE_CATCH_PATTERN='\.catch\(\s*\([^)]*\)\s*=>\s*(undefined|null|false)\s*\)'

empty_catch_hits="$(rg -n -U --glob '*.ts' --glob '*.tsx' "${EMPTY_CATCH_PATTERN}" "${TARGETS[@]}" || true)"
silent_promise_hits="$(rg -n --glob '*.ts' --glob '*.tsx' "${SILENT_PROMISE_CATCH_PATTERN}" "${TARGETS[@]}" || true)"

if [[ -z "${empty_catch_hits}" && -z "${silent_promise_hits}" ]]; then
  echo "[no-silent-catch] OK"
  exit 0
fi

echo "[no-silent-catch] Found disallowed silent catch patterns."

if [[ -n "${empty_catch_hits}" ]]; then
  echo
  echo "Empty catch blocks:"
  printf '%s\n' "${empty_catch_hits}"
fi

if [[ -n "${silent_promise_hits}" ]]; then
  echo
  echo "Silent promise catches:"
  printf '%s\n' "${silent_promise_hits}"
fi

echo
echo "Add structured logging and explicit degraded behavior instead of swallowing errors."
exit 1
