#!/usr/bin/env bash
set -euo pipefail

bash scripts/verify-e2e-stack.sh

report_file="$(mktemp)"
trap 'rm -f "$report_file"' EXIT

node --experimental-strip-types --test --test-reporter=tap \
  tests/e2e/auth-nostr.test.ts \
  tests/e2e/auth-step-up.test.ts \
  tests/e2e/keyset-safety.test.ts \
  tests/e2e/l402-payment.test.ts \
  tests/e2e/nut24-payment.test.ts \
  tests/e2e/protected-routes.test.ts \
  tests/e2e/spend-router.test.ts \
  tests/e2e/transaction-ledger.test.ts \
  | tee "$report_file"

if grep -q "# SKIP" "$report_file"; then
  echo "[e2e-required] skipped tests detected in required suite; failing." >&2
  grep "# SKIP" "$report_file" >&2 || true
  exit 1
fi

echo "[e2e-required] completed with no skipped tests."
