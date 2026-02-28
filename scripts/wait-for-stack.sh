#!/usr/bin/env bash
# ============================================================
# ArxMint — Wait for Regtest Stack to be Ready
# Polls all services until they respond or timeout.
# ============================================================
set -euo pipefail

TIMEOUT="${STACK_TIMEOUT:-120}"
ELAPSED=0
INTERVAL=3

echo "========================================"
echo " ArxMint — Waiting for regtest stack"
echo "========================================"

# Wait for bitcoind
echo "Waiting for bitcoind (regtest)..."
until docker exec sf-bitcoind bitcoin-cli -regtest -rpcuser=test -rpcpassword=test getblockchaininfo &>/dev/null; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "TIMEOUT: bitcoind did not become ready within ${TIMEOUT}s"
    exit 1
  fi
  echo "  bitcoind not ready yet (${ELAPSED}s)..."
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo "  bitcoind ready!"

# Wait for LND
echo "Waiting for LND (regtest)..."
ELAPSED=0
until docker exec sf-lnd lncli --network=regtest getinfo &>/dev/null; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "TIMEOUT: LND did not become ready within ${TIMEOUT}s"
    exit 1
  fi
  echo "  LND not ready yet (${ELAPSED}s)..."
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo "  LND ready!"

# Wait for Cashu mint
echo "Waiting for Cashu mint..."
ELAPSED=0
until curl -sf http://localhost:3338/v1/info &>/dev/null; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "TIMEOUT: Cashu mint did not become ready within ${TIMEOUT}s"
    exit 1
  fi
  echo "  Cashu mint not ready yet (${ELAPSED}s)..."
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done
echo "  Cashu mint ready!"

echo ""
echo "========================================"
echo " Stack is ready!"
echo "========================================"
echo " bitcoind regtest RPC: localhost:18443"
echo " LND gRPC:             localhost:10009"
echo " LND REST:             localhost:8080"
echo " Cashu mint:           localhost:3338"
echo "========================================"
