#!/usr/bin/env bash
# ============================================================
# ArxMint — Smoke Test: Full Merchant Checkout Loop
# Proves: create session -> pay invoice -> status=paid on regtest
# Usage: npm run test:smoke:checkout
# ============================================================

set -euo pipefail

# --------------- colours & helpers ---------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
STEPS=()

step_pass() {
  local label="$1"
  echo -e "  ${GREEN}✓${NC} ${label}"
  STEPS+=("PASS|${label}")
  ((PASS++))
}

step_fail() {
  local label="$1"
  local detail="${2:-}"
  echo -e "  ${RED}✗${NC} ${label}"
  [ -n "$detail" ] && echo -e "    ${RED}${detail}${NC}"
  STEPS+=("FAIL|${label}")
  ((FAIL++))
}

header() {
  echo ""
  echo -e "${CYAN}──── $1 ────${NC}"
}

BASE_URL="${ARXMINT_URL:-http://localhost:3000}"
LND_CONTAINER="${LND_CONTAINER:-sf-lnd}"
WEB_CONTAINER="${WEB_CONTAINER:-sf-web}"
POLL_INTERVAL=2
POLL_MAX=30

# ============================================================
# Step 1: Prerequisites
# ============================================================
header "Step 1 — Prerequisites"

# Docker running?
if ! docker info >/dev/null 2>&1; then
  step_fail "Docker daemon running" "Docker is not running. Start Docker Desktop and try again."
  echo ""
  echo -e "${RED}Cannot continue without Docker. Exiting.${NC}"
  exit 1
fi
step_pass "Docker daemon running"

# Web container healthy?
WEB_STATE=$(docker inspect -f '{{.State.Status}}' "$WEB_CONTAINER" 2>/dev/null || echo "missing")
if [ "$WEB_STATE" = "running" ]; then
  step_pass "$WEB_CONTAINER container running"
else
  step_fail "$WEB_CONTAINER container running" "State: ${WEB_STATE}. Run 'npm run setup:regtest' first."
  echo ""
  echo -e "${RED}Regtest stack not running. Start it with:${NC}"
  echo "  npm run setup:regtest"
  exit 1
fi

# LND accessible?
if docker exec "$LND_CONTAINER" lncli --network=regtest getinfo >/dev/null 2>&1; then
  step_pass "$LND_CONTAINER LND accessible (regtest)"
else
  step_fail "$LND_CONTAINER LND accessible" "Cannot reach lncli inside ${LND_CONTAINER}."
  echo ""
  echo -e "${RED}LND not responding. Check 'docker logs ${LND_CONTAINER}'.${NC}"
  exit 1
fi

# Web app responding?
HEALTH_PRE=$(curl -sf "${BASE_URL}/api/health" 2>/dev/null || echo "")
if [ -n "$HEALTH_PRE" ]; then
  step_pass "Web app responding at ${BASE_URL}"
else
  step_fail "Web app responding at ${BASE_URL}" "curl ${BASE_URL}/api/health returned nothing."
  echo ""
  echo -e "${RED}Web app not reachable. Is Next.js running?${NC}"
  exit 1
fi

# ============================================================
# Step 2: Create checkout session
# ============================================================
header "Step 2 — Create checkout session"

CREATE_RESP=$(curl -sf -X POST "${BASE_URL}/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{"merchantId":"seed-glacier","amountSats":100,"memo":"Smoke test"}' 2>/dev/null || echo "")

if [ -z "$CREATE_RESP" ]; then
  step_fail "POST /api/checkout" "Empty or error response."
  echo -e "${RED}Cannot continue without a session. Exiting.${NC}"
  exit 1
fi

SESSION_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sessionId',''))" 2>/dev/null || echo "")
INVOICE=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('invoice',''))" 2>/dev/null || echo "")
DEMO_MODE=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('demoMode',False))" 2>/dev/null || echo "")

if [ -z "$SESSION_ID" ] || [ -z "$INVOICE" ]; then
  step_fail "POST /api/checkout" "Missing sessionId or invoice in response: ${CREATE_RESP}"
  exit 1
fi

step_pass "POST /api/checkout  sessionId=${SESSION_ID:0:12}..."
echo -e "    invoice: ${INVOICE:0:40}..."
echo -e "    demoMode: ${DEMO_MODE}"

# ============================================================
# Step 3: Check initial status (should be pending)
# ============================================================
header "Step 3 — Verify initial status is 'pending'"

STATUS_RESP=$(curl -sf "${BASE_URL}/api/checkout/status/${SESSION_ID}" 2>/dev/null || echo "")
INITIAL_STATUS=$(echo "$STATUS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")

if [ "$INITIAL_STATUS" = "pending" ]; then
  step_pass "Status is 'pending'"
else
  step_fail "Status is 'pending'" "Got '${INITIAL_STATUS}' — response: ${STATUS_RESP}"
fi

# ============================================================
# Step 4: Pay invoice via LND (regtest)
# ============================================================
header "Step 4 — Pay invoice via LND"

if [ "$DEMO_MODE" = "True" ] || [ "$DEMO_MODE" = "true" ]; then
  echo -e "  ${YELLOW}Demo mode detected — skipping lncli payinvoice (auto-pay will settle it)${NC}"
  step_pass "Invoice payment (demo mode — auto-settles)"
else
  PAY_OUTPUT=$(docker exec "$LND_CONTAINER" lncli --network=regtest payinvoice --force "$INVOICE" 2>&1 || echo "PAY_ERROR")
  if echo "$PAY_OUTPUT" | grep -qi "PAY_ERROR\|failure\|unable\|error"; then
    step_fail "lncli payinvoice" "$PAY_OUTPUT"
  else
    step_pass "lncli payinvoice succeeded"
  fi
fi

# ============================================================
# Step 5 & 6: Poll for 'paid' status (max 30s)
# ============================================================
header "Step 5 — Wait for payment to propagate"

ELAPSED=0
FINAL_STATUS=""

while [ "$ELAPSED" -lt "$POLL_MAX" ]; do
  POLL_RESP=$(curl -sf "${BASE_URL}/api/checkout/status/${SESSION_ID}" 2>/dev/null || echo "")
  POLL_STATUS=$(echo "$POLL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")

  if [ "$POLL_STATUS" = "paid" ]; then
    FINAL_STATUS="paid"
    break
  fi

  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  echo -e "    polling... ${ELAPSED}s (status: ${POLL_STATUS})"
done

if [ "$FINAL_STATUS" = "paid" ]; then
  step_pass "Session status is 'paid' (after ${ELAPSED}s)"
else
  step_fail "Session status is 'paid'" "Still '${POLL_STATUS}' after ${POLL_MAX}s"
fi

# ============================================================
# Step 7: Health endpoint
# ============================================================
header "Step 7 — Health endpoint"

HEALTH_RESP=$(curl -sf "${BASE_URL}/api/health" 2>/dev/null || echo "")
if [ -n "$HEALTH_RESP" ]; then
  step_pass "GET /api/health responded"
else
  step_fail "GET /api/health responded" "No response from health endpoint."
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}  Smoke Test Summary${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"

for entry in "${STEPS[@]}"; do
  result="${entry%%|*}"
  label="${entry#*|}"
  if [ "$result" = "PASS" ]; then
    echo -e "  ${GREEN}✓${NC} ${label}"
  else
    echo -e "  ${RED}✗${NC} ${label}"
  fi
done

echo ""
echo -e "  Passed: ${GREEN}${PASS}${NC}  Failed: ${RED}${FAIL}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}RESULT: FAIL${NC}"
  exit 1
else
  echo -e "${GREEN}RESULT: PASS${NC}"
  exit 0
fi
