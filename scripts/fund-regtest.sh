#!/usr/bin/env bash
# ============================================================
# ArxMint — Fund Regtest Environment
# Generates 101 blocks to a new LND address, making coinbase
# spendable and giving LND a funded on-chain wallet.
# ============================================================
set -euo pipefail

echo "========================================"
echo " ArxMint — Funding regtest environment"
echo "========================================"

# Get a new address from LND
echo "Getting LND regtest address..."
LND_ADDR=$(docker exec sf-lnd lncli --network=regtest newaddress p2wkh | python3 -c "import sys,json; print(json.load(sys.stdin)['address'])" 2>/dev/null \
  || docker exec sf-lnd lncli --network=regtest newaddress p2wkh | grep -o '"address": "[^"]*"' | cut -d'"' -f4)

if [ -z "$LND_ADDR" ]; then
  echo "ERROR: Could not get LND address. Is LND running?"
  exit 1
fi

echo "LND address: $LND_ADDR"

# Generate 101 blocks (100 for coinbase maturity + 1 extra)
echo "Generating 101 blocks to LND address..."
docker exec sf-bitcoind bitcoin-cli \
  -regtest \
  -rpcuser=test \
  -rpcpassword=test \
  generatetoaddress 101 "$LND_ADDR"

echo ""
echo "Waiting for LND to see the balance (10s)..."
sleep 10

# Show balance
echo "LND on-chain balance:"
docker exec sf-lnd lncli --network=regtest walletbalance 2>/dev/null || true

echo ""
echo "========================================"
echo " Regtest funding complete!"
echo " LND has ~5,000,000,000 regtest sats"
echo "========================================"
echo ""
echo "To generate more blocks:"
echo "  docker exec sf-bitcoind bitcoin-cli -regtest -rpcuser=test -rpcpassword=test generatetoaddress 10 \$ADDR"
