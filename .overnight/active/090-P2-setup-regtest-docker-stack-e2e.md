---
id: 90
title: "Set up regtest Docker stack for E2E testing"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_12
file: docker/docker-compose.regtest.yml
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: e2e_testing
group_reason: "Foundation for E2E test tasks 091, 092, 093. All depend on this regtest stack."
---

# Set up regtest Docker stack for E2E testing

**Priority:** P2 (medium)
**Source:** OVERNIGHT_TASKS.md ID 12
**Location:** docker/docker-compose.regtest.yml (new), scripts/ (new scripts)

## Problem

ArxMint has no E2E test infrastructure. Tests in `tests/` are unit-level with mocks. Real E2E tests need a full Bitcoin regtest stack (bitcoind + LND + Cashu mint) that can be started/stopped programmatically. See `docs/E2E_TESTING.md` for full spec.

## How to Fix

1. **Create `docker/docker-compose.regtest.yml`** (override file):

```yaml
# docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d
version: '3.8'
services:
  bitcoind:
    image: ruimarinho/bitcoin-core:latest
    command:
      - bitcoind
      - -regtest
      - -rpcuser=arxmint
      - -rpcpassword=regtest
      - -rpcbind=0.0.0.0
      - -rpcallowip=0.0.0.0/0
      - -zmqpubrawblock=tcp://0.0.0.0:28332
      - -zmqpubrawtx=tcp://0.0.0.0:28333
    ports:
      - "18443:18443"  # regtest RPC
    networks:
      - sovereign

  lnd:
    command: >
      lnd
      --bitcoin.active
      --bitcoin.regtest
      --bitcoin.node=bitcoind
      --bitcoind.rpchost=bitcoind:18443
      --bitcoind.rpcuser=arxmint
      --bitcoind.rpcpass=regtest
      --bitcoind.zmqpubrawblock=tcp://bitcoind:28332
      --bitcoind.zmqpubrawtx=tcp://bitcoind:28333
    depends_on:
      - bitcoind
```

2. **Create `scripts/wait-for-stack.sh`**: Health check loop that waits for all services:
```bash
#!/usr/bin/env bash
# Wait for regtest stack to be fully ready
until docker exec sf-lnd lncli --network=regtest getinfo &>/dev/null; do
  echo "Waiting for LND..."
  sleep 2
done
echo "Stack ready!"
```

3. **Create `scripts/fund-regtest.sh`**: Generate blocks and fund LND wallet:
```bash
#!/usr/bin/env bash
# Fund regtest environment
bitcoin-cli -regtest -rpcuser=arxmint -rpcpassword=regtest generatetoaddress 101 $(lncli --network=regtest newaddress p2wkh | jq -r '.address')
```

4. **Update `package.json`**:
```json
"scripts": {
  "setup:regtest": "docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d && ./scripts/wait-for-stack.sh && ./scripts/fund-regtest.sh"
}
```

## Acceptance Criteria

- [ ] `docker/docker-compose.regtest.yml` created with bitcoind regtest + LND override
- [ ] `scripts/wait-for-stack.sh` created and executable
- [ ] `scripts/fund-regtest.sh` created and executable
- [ ] `npm run setup:regtest` starts full testable stack
- [ ] LND wallet funded with regtest coins after setup
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 12. See `docs/E2E_TESTING.md` for full E2E spec. This is the foundation for tasks 091-093._
