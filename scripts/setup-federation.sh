#!/usr/bin/env bash
# ============================================================
# ArxMint — Federation Setup Script
# Sets up a local Fedimint federation for development/testing
# ============================================================

set -euo pipefail

echo "========================================"
echo " ArxMint — Federation Setup"
echo " Financial privacy as a human right."
echo "========================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Install Docker first."
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "ERROR: Docker Compose v2 not found."
    exit 1
fi

# Default config
NETWORK="${BITCOIN_NETWORK:-testnet}"
GUARDIAN_COUNT="${GUARDIAN_COUNT:-3}"
MODE="${1:-full}"  # "full" or "cashu"

echo "Network:    $NETWORK"
echo "Guardians:  $GUARDIAN_COUNT"
echo "Mode:       $MODE"
echo ""

if [ "$MODE" = "cashu" ]; then
    echo "Starting lightweight Cashu-only stack..."
    docker compose -f docker/docker-compose.cashu.yml up -d
    echo ""
    echo "Cashu mint starting up..."
    echo "Wait ~60s for LND to sync (neutrino light client)"
    echo ""
    echo "Mint URL: http://localhost:3338"
    echo "LND REST: https://localhost:8080"
    echo "LND gRPC: localhost:10009"
else
    echo "Starting full stack (LND + Cashu + Fedimint + Aperture)..."
    docker compose up -d
    echo ""
    echo "Full stack starting up..."
    echo "Wait ~60s for LND to sync"
    echo ""
    echo "Services:"
    echo "  Cashu Mint:     http://localhost:3338"
    echo "  LND REST:       https://localhost:8080"
    echo "  LND gRPC:       localhost:10009"
    echo "  Guardian 0 API: ws://localhost:18174"
    echo "  Guardian 1 API: ws://localhost:18176"
    echo "  Guardian 2 API: ws://localhost:18178"
    echo "  Aperture L402:  http://localhost:8081"
    echo "  Web App:        http://localhost:3000"
fi

echo ""
echo "========================================"
echo " Next steps:"
echo "  1. Wait for LND to sync (~60s)"
echo "  2. Fund your node (testnet faucet)"
echo "  3. Open http://localhost:3000"
echo "  4. Create your sovereign community"
echo "========================================"
echo ""
echo "Monitor logs: docker compose logs -f"
echo "Stop:         docker compose down"
