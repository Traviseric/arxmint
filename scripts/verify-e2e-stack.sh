#!/usr/bin/env bash
set -euo pipefail

TEST_SERVER_URL="${TEST_SERVER_URL:-http://localhost:3000}"
TEST_LND_REST_URL="${TEST_LND_REST_URL:-http://localhost:8080}"
TEST_CASHU_MINT_URL="${TEST_CASHU_MINT_URL:-http://localhost:3338}"

check_http_code() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" "$url" || echo "000"
}

echo "[e2e-preflight] server: $TEST_SERVER_URL"
echo "[e2e-preflight] lnd:    $TEST_LND_REST_URL"
echo "[e2e-preflight] cashu:  $TEST_CASHU_MINT_URL"

health_code="$(check_http_code "$TEST_SERVER_URL/api/health")"
if [[ "$health_code" != "200" && "$health_code" != "503" ]]; then
  echo "[e2e-preflight] expected /api/health to return 200/503, got: $health_code" >&2
  exit 1
fi

l402_code="$(check_http_code "$TEST_SERVER_URL/api/l402")"
if [[ "$l402_code" != "402" && "$l402_code" != "401" && "$l402_code" != "403" ]]; then
  echo "[e2e-preflight] expected /api/l402 to return 402/401/403, got: $l402_code" >&2
  exit 1
fi

lnd_code="$(check_http_code "$TEST_LND_REST_URL/v1/getinfo")"
if [[ "$lnd_code" == "000" || "$lnd_code" -ge 500 ]]; then
  echo "[e2e-preflight] expected LND /v1/getinfo to be reachable (<500), got: $lnd_code" >&2
  exit 1
fi

cashu_code="$(check_http_code "$TEST_CASHU_MINT_URL/v1/info")"
if [[ "$cashu_code" == "000" || "$cashu_code" -ge 400 ]]; then
  echo "[e2e-preflight] expected Cashu /v1/info to be reachable (<400), got: $cashu_code" >&2
  exit 1
fi

echo "[e2e-preflight] required endpoints reachable."
