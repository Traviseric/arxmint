#!/bin/bash
# ArxMint Droplet Health Check
# Usage: ./scripts/check-droplet-health.sh
# Exits 0 if all checks pass, 1 if any fail.

set -euo pipefail

PASS=0
FAIL=0
ERRORS=()

check() {
    local label="$1"
    local url="$2"
    if curl -sf --max-time 10 "$url" > /dev/null 2>&1; then
        echo "  OK    $label"
        ((PASS++)) || true
    else
        echo "  FAIL  $label ($url)"
        ERRORS+=("$label")
        ((FAIL++)) || true
    fi
}

echo "=== ArxMint Health Check ==="
echo ""

echo "--- Application ---"
check "Next.js app (health)"      "https://arxmint.com/api/health-check"
check "Metrics endpoint"          "https://arxmint.com/api/metrics"

echo ""
echo "--- Payment Infrastructure ---"
check "LNbits (via Caddy)"        "https://arxmint.com/lnbits/health"
check "Checkout page (seed)"      "https://arxmint.com/pay/seed-black-bear"

echo ""
echo "--- Summary ---"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo "FAILED checks:"
    for err in "${ERRORS[@]}"; do
        echo "  - $err"
    done
    exit 1
fi

echo ""
echo "All checks passed."
exit 0
