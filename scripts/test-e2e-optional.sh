#!/usr/bin/env bash
set -euo pipefail

node --experimental-strip-types --test \
  tests/e2e/vault-lifecycle.test.ts \
  tests/e2e/vault-seed-restore.test.ts \
  tests/e2e/vault-crash-recovery.test.ts
