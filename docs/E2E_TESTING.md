# ArxMint — End-to-End Testing Strategy

**Version:** 1.0 — February 28, 2026
**Status:** Strategy document. Overnight agents implement the test files.
**Test runner:** Node.js built-in `node:test` with `--experimental-strip-types` (same as existing tests)
**Docker stacks:** `docker compose up -d` (full stack), `npm run setup:cashu` (cashu-only)
**Depends on:** `OVERNIGHT_TASKS.md` P0 tasks (database, vault, auth) landing first

---

## What This Document Covers

ArxMint is a production Bitcoin system where bugs lose money. Unit tests verify individual functions. E2E tests verify that the full system works — prompt to deploy, login to payment, crash to recovery.

This document defines every E2E verification flow, organized by the system layers they cross. Each test section includes:
- What it proves
- Prerequisites (services, state)
- The test flow (step by step)
- Pass/fail criteria

---

## Test Environment Tiers

| Tier | Stack | Money | Use Case |
|------|-------|-------|----------|
| **Regtest** | LND (regtest) + Cashu Nutshell + 3x Fedimint | Fake sats, instant blocks | All E2E tests, CI pipeline |
| **Testnet** | Same stack, `--bitcoin.testnet` | Testnet sats | Pre-deploy validation, manual QA |
| **Mainnet** | Production VPS | Real sats | Pilot launch, smoke tests only |

All automated E2E tests run against **regtest** — no real money, instant block generation, fully deterministic.

### Regtest Docker Stack

The E2E test stack extends the root `docker-compose.yml` with a regtest Bitcoin node so LND can generate blocks and fund channels on demand:

```yaml
# docker/docker-compose.regtest.yml (override for E2E testing)
services:
  bitcoind:
    image: lncm/bitcoind:v27.0
    container_name: sf-bitcoind
    command:
      - -regtest
      - -server
      - -rpcuser=test
      - -rpcpassword=test
      - -rpcallowip=0.0.0.0/0
      - -rpcbind=0.0.0.0
      - -fallbackfee=0.0001
    ports:
      - "18443:18443"
    networks:
      - sovereign

  lnd:
    command: >
      lnd
      --bitcoin.active
      --bitcoin.regtest
      --bitcoin.node=bitcoind
      --bitcoind.rpchost=bitcoind:18443
      --bitcoind.rpcuser=test
      --bitcoind.rpcpass=test
      --bitcoind.zmqpubrawblock=tcp://bitcoind:28332
      --bitcoind.zmqpubrawtx=tcp://bitcoind:28333
      --rpclisten=0.0.0.0:10009
      --restlisten=0.0.0.0:8080
      --tlsextradomain=lnd
      --accept-keysend
      --noseedbackup
    depends_on:
      - bitcoind
```

**Start E2E stack:**
```bash
docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d
```

**Generate blocks (fund LND):**
```bash
docker exec sf-bitcoind bitcoin-cli -regtest -rpcuser=test -rpcpassword=test generatetoaddress 101 $(docker exec sf-lnd lncli --network=regtest newaddress p2wkh | jq -r .address)
```

---

## Layer 1: Core Product Flow

### Test 1.1 — Prompt to Config Generation

**What it proves:** The primary product — user types a prompt, system generates a valid deployable config.

**Prerequisites:** None (pure function, no Docker needed)

**Flow:**
1. Call `parsePrompt("Create 'Longmont Market' for 30 merchants, maximum privacy, agent marketplace")`
2. Assert: `communityName === "Longmont Market"`, `memberCount === 30`, `privacyLevel === "maximum"`, `agentsEnabled === true`
3. Call `generateCommunityConfig(parsed)` → assert ID starts with `sf_`, features include `merchant-directory` and `agent-marketplace`
4. Call `generateDockerCompose(config)` → assert YAML string contains: `services:`, `lnd`, `cashu` or `nutshell`, `fedimint` (because >50 members triggers fedimint), `networks:`, `sovereign`
5. Parse the generated YAML — assert it's valid YAML (no syntax errors)
6. Call `generateDeployment(prompt)` → assert returns `community`, `dockerCompose`, `instructions[]`, `l402Endpoints[]`

**Pass criteria:** Valid YAML output with correct service selection based on prompt parameters.

**File:** `tests/e2e/core-generation.test.ts`

### Test 1.2 — Config Persistence Round-Trip

**What it proves:** Generated configs survive database persistence — create, save, reload, verify identical.

**Prerequisites:** Postgres running (P0 task ID 1)

**Flow:**
1. Generate a community config from prompt
2. Save to Postgres via Prisma (`prisma.community.create()`)
3. Clear any in-memory state
4. Load from Postgres (`prisma.community.findUnique()`)
5. Assert: loaded config matches original (name, backend, features, member count, docker compose)
6. Load on dashboard page — assert community appears in list

**Pass criteria:** Data survives Postgres round-trip with zero drift.

**File:** `tests/e2e/config-persistence.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 1, ID 3

### Test 1.3 — Merchant Onboarding Persistence

**What it proves:** Merchant data from onboarding form persists and appears in community directory.

**Prerequisites:** Postgres running, at least one community saved

**Flow:**
1. Create a community and save to DB
2. Submit merchant onboarding: `{ name: "Bob's Coffee", category: "food", communityId: community.id }`
3. Save via Prisma
4. Query merchants for community → assert Bob's Coffee is listed
5. Assert merchant has payment config (QR code data, accepted methods)

**Pass criteria:** Merchant appears in community directory after onboarding.

**File:** `tests/e2e/merchant-onboarding.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 1, ID 4

---

## Layer 2: Authentication Flows

### Test 2.1 — Nostr NIP-98 Login → Session → Protected Route

**What it proves:** Nostr authentication works end-to-end with Auth.js session management.

**Prerequisites:** Auth.js configured (P0 task ID 6), Next.js API running

**Flow:**
1. Generate a Nostr keypair (test key, not real)
2. Create a NIP-98 signed event for the auth endpoint
3. POST to `/api/auth/callback/nostr-credentials` with signed event
4. Assert: response sets `next-auth.session-token` cookie (HttpOnly, Secure, SameSite=Strict)
5. Use session cookie to GET `/api/auth/session` → assert returns user with Nostr pubkey
6. Use session cookie to access `/wallet` → assert 200 (not redirect to login)
7. Access `/wallet` WITHOUT session cookie → assert redirect to login

**Pass criteria:** Valid Nostr signature → session cookie → protected route access.

**File:** `tests/e2e/auth-nostr.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 1, ID 6

### Test 2.2 — Email Magic Link Login

**What it proves:** Merchant fallback auth works for users without Nostr extensions.

**Prerequisites:** Auth.js configured with email provider

**Flow:**
1. POST to `/api/auth/signin/email` with `email: "merchant@test.local"`
2. Assert: verification token created in DB (`prisma.verificationToken.findFirst()`)
3. Extract token from DB (simulates clicking magic link)
4. GET `/api/auth/callback/email?token=...&email=...`
5. Assert: session created, redirect to dashboard
6. Access protected route → assert 200

**Pass criteria:** Email token → session → access. No password required.

**File:** `tests/e2e/auth-email.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 1, ID 6

### Test 2.3 — Step-Up Reauth for Wallet Operations

**What it proves:** Spending operations require recent re-authentication (5-min TTL).

**Prerequisites:** Auth.js with step-up reauth configured

**Flow:**
1. Login via Nostr (Test 2.1 flow)
2. Access `/wallet` → assert 200 (read-only OK with basic session)
3. POST to `/api/wallet/spend` → assert 200 (within 5-min window)
4. Simulate time passage > 5 minutes (mock or fast-forward session TTL)
5. POST to `/api/wallet/spend` → assert 403 with `reauth_required` flag
6. Re-authenticate (sign fresh NIP-98 event)
7. POST to `/api/wallet/spend` → assert 200

**Pass criteria:** Wallet spend requires recent auth. Stale session gets 403, not silent failure.

**File:** `tests/e2e/auth-step-up.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 6

---

## Layer 3: Payment Flows (Real Money Path)

### Test 3.1 — L402: 402 Challenge → Pay Invoice → Access Granted

**What it proves:** The L402 flow works end-to-end with real LND invoices.

**Prerequisites:** Regtest stack running, LND funded

**Flow:**
1. GET `/api/l402/protected-resource` without auth header
2. Assert: 402 response with `WWW-Authenticate: L402 macaroon="...", invoice="lntb..."`
3. Parse the invoice from the challenge
4. Pay the invoice via LND CLI: `lncli --network=regtest payinvoice --force <invoice>`
5. Extract preimage from payment result
6. Retry GET with `Authorization: L402 <macaroon>:<preimage>`
7. Assert: 200 response with protected content
8. Retry with WRONG preimage → assert 401

**Pass criteria:** Unpaid → 402. Paid → 200. Wrong preimage → 401.

**File:** `tests/e2e/l402-payment.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 7

### Test 3.2 — NUT-24: Cashu Token Payment → Access Granted

**What it proves:** Cashu ecash payments work as L402 alternative.

**Prerequisites:** Regtest stack, Cashu mint funded (mint some test proofs)

**Flow:**
1. Mint test proofs: fund LND → create mint quote → pay invoice → mint proofs
2. GET `/api/agent/query` without auth header
3. Assert: 402 response with `WWW-Authenticate: Cashu mint="...", amount="...", unit="sat"`
4. Build Cashu token from proofs matching the challenge amount
5. Retry GET with `Authorization: Cashu <token>`
6. Assert: 200 response with agent query result
7. Retry with SAME token (already spent) → assert 401 (double-spend rejected)
8. Retry with invalid/garbage token → assert 401

**Pass criteria:** Valid unspent token → 200. Spent token → 401. Invalid token → 401.

**File:** `tests/e2e/nut24-payment.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 8

### Test 3.3 — Spend Router Path Selection

**What it proves:** The spend router picks the correct payment backend based on amount and privacy.

**Prerequisites:** Regtest stack, balances in both Cashu and Lightning

**Flow:**
1. Fund both Cashu (mint proofs) and Lightning (LND balance)
2. Route 5,000 sats with default privacy → assert selects `ecash` (< 10K threshold)
3. Route 50,000 sats with default privacy → assert selects `lightning` (< 100K threshold)
4. Route 5,000 sats with `maximum` privacy → assert selects `ecash` (privacy-preferred)
5. Route with 0 Cashu balance, 50K Lightning → assert selects `lightning` (only available path)
6. Route with 0 balance everywhere → assert returns error (no available path)

**Pass criteria:** Router selects optimal path per amount/privacy/availability.

**File:** `tests/e2e/spend-router.test.ts`
**Depends on:** Existing `lib/spend-router.ts` (already implemented)

### Test 3.4 — Transaction Ledger Records Payment Metadata

**What it proves:** Every payment creates a transaction record in the DB (metadata only, not proofs).

**Prerequisites:** Regtest stack, Postgres, auth session

**Flow:**
1. Login and get session
2. Make a Cashu payment (Test 3.2 flow)
3. Query `prisma.transaction.findMany({ where: { userId } })`
4. Assert: transaction record exists with `type: "send"`, `amount: <correct>`, `backend: "cashu"`, `status: "completed"`
5. Assert: transaction record does NOT contain raw proof data (`secret`, `C` fields absent)
6. GET `/api/transactions` with session → assert returns transaction list
7. Make a Lightning payment → assert new transaction with `backend: "lightning"`

**Pass criteria:** Payments create metadata records. No raw proofs leak into DB.

**File:** `tests/e2e/transaction-ledger.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 1, ID 5

---

## Layer 4: Wallet Vault (Client-Side)

### Test 4.1 — Vault Create → Lock → Unlock → Read Proofs

**What it proves:** The encrypted vault lifecycle works — proofs survive lock/unlock with correct passphrase.

**Prerequisites:** P0 vault task complete (ID 2). Uses mock IndexedDB in Node.js (e.g., `fake-indexeddb`).

**Flow:**
1. Initialize vault with passphrase "test-passphrase-123"
2. Store 3 proofs via `ProofRepo.saveProofs([...])`
3. Lock vault (clears master key from memory)
4. Attempt to read proofs while locked → assert throws `VaultLockedError`
5. Unlock with WRONG passphrase → assert throws `DecryptionError`
6. Unlock with CORRECT passphrase → assert succeeds
7. Read proofs → assert 3 proofs with correct amounts
8. Verify underlying IndexedDB has encrypted data (not plaintext secrets)

**Pass criteria:** Correct passphrase decrypts. Wrong passphrase fails. Locked vault blocks reads. Data encrypted at rest.

**File:** `tests/e2e/vault-lifecycle.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 2

### Test 4.2 — Seed Phrase Backup → Restore from Mint

**What it proves:** NUT-13 seed phrase recovery actually recovers proofs from the mint.

**Prerequisites:** Regtest stack, Cashu mint running, vault configured

**Flow:**
1. Create vault with seed phrase (12-word BIP39 mnemonic)
2. Mint 1,000 sats of proofs (deterministic secrets derived from seed per NUT-13)
3. Record the proof amounts and total balance
4. Destroy the vault completely (delete IndexedDB data)
5. Create new vault from same 12-word seed phrase
6. Run restore: call mint's NUT-09 `/v1/restore` in batches of 100
7. Assert: restored balance matches original (1,000 sats)
8. Assert: proof count matches
9. Attempt to spend restored proofs → assert they're valid (not rejected as unknown)

**Pass criteria:** Seed phrase alone recovers all proofs from the mint.

**File:** `tests/e2e/vault-seed-restore.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 2, ID 26

### Test 4.3 — Crash Recovery (Saga Pattern)

**What it proves:** If the app crashes mid-payment, proofs aren't lost or double-spent on restart.

**Prerequisites:** Regtest stack, vault configured

**Flow:**
1. Start a Cashu send operation
2. Proofs marked as `pending` in vault (saga log written)
3. Simulate crash: kill the process mid-operation (before completing swap)
4. Restart / re-initialize vault
5. Vault checks pending operations log
6. For each pending proof: query mint's NUT-07 `/v1/checkstate`
7. If proof is spent → remove from wallet (transfer succeeded)
8. If proof is unspent → restore to available balance (transfer failed, money safe)
9. Assert: no proofs in limbo state after recovery
10. Assert: balance is correct (either original amount or reduced by sent amount, never zero)

**Pass criteria:** After crash recovery, every proof is accounted for. No money lost, no double-spend possible.

**File:** `tests/e2e/vault-crash-recovery.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 2

### Test 4.4 — Multi-Mint Keyset Safety

**What it proves:** Keyset collision attacks are detected and blocked.

**Prerequisites:** Two Cashu mints running (one honest, one adversarial mock)

**Flow:**
1. Connect to honest mint, register its keysets
2. Compute keyset IDs locally per NUT-02 (don't trust mint-provided IDs)
3. Assert: computed IDs match mint-provided IDs
4. Mock adversarial mint: returns keyset with same ID as honest mint but different pubkeys
5. Attempt to register adversarial keysets → assert rejected with `keyset collision` error
6. Attempt to receive tokens from adversarial mint → assert blocked
7. Assert: wallet panel shows warning for unknown mints

**Pass criteria:** Collision detected. Adversarial keyset rejected. Honest mint unaffected.

**File:** `tests/e2e/keyset-safety.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 25

---

## Layer 5: Docker Infrastructure

### Test 5.1 — Full Stack Health Check

**What it proves:** All services start and are reachable on the sovereign network.

**Prerequisites:** Docker installed, `.env` configured

**Flow:**
1. `docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d`
2. Wait for LND healthcheck to pass (up to 120s)
3. Assert: `curl http://localhost:3338/v1/info` → 200 (Cashu mint)
4. Assert: `curl http://localhost:18174` → WebSocket upgrade (Fedimint guardian 0)
5. Assert: `docker exec sf-lnd lncli --network=regtest getinfo` → returns `identity_pubkey`
6. Assert: `curl http://localhost:9090/-/ready` → 200 (Prometheus)
7. Assert: `curl http://localhost:3001/api/health` → 200 (Grafana)
8. Assert: `curl http://localhost:8081` → response from Aperture
9. Assert: `curl http://localhost:3000` → 200 (Web app)
10. `docker compose down`

**Pass criteria:** All 9 services healthy and responding. Zero port conflicts.

**File:** `tests/e2e/docker-health.test.ts` (or shell script `scripts/e2e-health-check.sh`)

### Test 5.2 — Service Dependency Chain

**What it proves:** Services start in correct order and handle dependency failures.

**Flow:**
1. Start stack
2. Stop LND: `docker stop sf-lnd`
3. Assert: Cashu mint logs show connection error (but doesn't crash)
4. Assert: Web app still serves pages (degraded mode, not 500)
5. Restart LND: `docker start sf-lnd`
6. Assert: Cashu mint reconnects within 60s
7. Assert: LND healthcheck passes again

**Pass criteria:** Dependent services degrade gracefully, don't crash. Recovery is automatic.

**File:** `tests/e2e/docker-resilience.test.ts`

### Test 5.3 — Network Isolation Verification

**What it proves:** Internal services are not accessible from outside the Docker network.

**Prerequisites:** Full stack with internal network hardening (OVERNIGHT_TASKS ID 23)

**Flow:**
1. Start stack with network hardening applied
2. From host machine: `curl http://localhost:5432` → assert connection refused (Postgres not exposed)
3. From host: assert Fedimint guardian ports are internal-only
4. From host: `curl http://localhost:9735` → assert LND p2p IS accessible (must be public)
5. From host: `curl https://localhost:443` → assert Caddy IS accessible
6. From within Docker network: `docker exec sf-web curl http://postgres:5432` → assert reachable (internal OK)

**Pass criteria:** Only Caddy (80/443) and LND p2p (9735) exposed. Everything else internal.

**File:** `tests/e2e/network-isolation.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 22, ID 23

---

## Layer 6: Monitoring & Backup

### Test 6.1 — Prometheus Scrapes All Targets

**What it proves:** Monitoring actually collects metrics from all services.

**Prerequisites:** Full stack with Prometheus config (OVERNIGHT_TASKS ID 9)

**Flow:**
1. Start full stack
2. Wait 60s for scrape cycle (30s interval + buffer)
3. Query Prometheus: `curl 'http://localhost:9090/api/v1/targets'`
4. Assert: all targets report `health: "up"` (LND, Cashu, Fedimint, web app)
5. Query a metric: `curl 'http://localhost:9090/api/v1/query?query=up'`
6. Assert: returns data points for all configured targets
7. Verify Grafana datasource: `curl http://localhost:3001/api/datasources` → assert Prometheus listed

**Pass criteria:** All scrape targets up. Grafana connected to Prometheus.

**File:** `tests/e2e/monitoring-scrape.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 9

### Test 6.2 — Backup and Restore Cycle

**What it proves:** Backups are created and can restore the system to a working state.

**Prerequisites:** Backup scripts (OVERNIGHT_TASKS ID 24), Postgres with data

**Flow:**
1. Start stack, create some data (community + merchants + transactions)
2. Run `scripts/backup_postgres.sh` → assert creates compressed dump file
3. Record current data state (counts, last transaction ID)
4. Drop and recreate database
5. Restore from backup: `pg_restore` or `psql < dump.sql`
6. Assert: data matches pre-backup state (community count, merchant count, transaction count)
7. Assert: LND `channel.backup` file exists and is recent
8. Assert: application starts normally with restored data

**Pass criteria:** Full data recovery from backup. Zero data loss.

**File:** `tests/e2e/backup-restore.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 24

---

## Layer 7: Cross-System Integration (ArxMint + Teneo Marketplace)

### Test 7.1 — Payment SDK: Create Challenge → Verify Payment

**What it proves:** The extracted payment SDK works as a standalone module for Teneo Marketplace.

**Prerequisites:** Payment SDK extracted (OVERNIGHT_TASKS ID 18)

**Flow:**
1. Import `{ createL402Challenge, verifyL402Token, routePayment }` from `lib/payment-sdk.ts`
2. Call `createL402Challenge({ amount: 500, resource: "ebook-123" })` → assert returns challenge with invoice
3. Call `routePayment({ amount: 500, privacy: "standard" })` → assert returns route selection
4. Mock a payment completion with valid preimage
5. Call `verifyL402Token(macaroon, preimage)` → assert returns `{ valid: true }`
6. Call `verifyL402Token(macaroon, wrongPreimage)` → assert returns `{ valid: false }`

**Pass criteria:** SDK functions work independently of Next.js app context.

**File:** `tests/e2e/payment-sdk.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 18

### Test 7.2 — HTTP Payment API (Express.js Compatible)

**What it proves:** REST endpoints work for Express.js marketplace integration.

**Prerequisites:** HTTP API endpoints (OVERNIGHT_TASKS ID 19), Next.js running

**Flow:**
1. POST `/api/payment/create-challenge` with `{ amount: 1000, resource: "course-456" }`
2. Assert: 200 with `{ challenge_type: "l402" | "cashu", challenge: "...", payment_id: "..." }`
3. Simulate payment (pay the returned invoice or provide Cashu token)
4. POST `/api/payment/verify` with `{ payment_id, proof: "<macaroon:preimage>" }`
5. Assert: 200 with `{ verified: true, resource: "course-456" }`
6. GET `/api/payment/status/<payment_id>` → assert `{ status: "completed" }`
7. Test CORS: OPTIONS request with `Origin: https://teneo-marketplace.com` → assert CORS headers present

**Pass criteria:** Full request-response cycle works. CORS allows marketplace origin.

**File:** `tests/e2e/payment-api.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 19

### Test 7.3 — Shared Nostr Auth Across Apps

**What it proves:** A Nostr session from one app is recognized by the other.

**Prerequisites:** Shared auth (OVERNIGHT_TASKS ID 21)

**Flow:**
1. Login to ArxMint with Nostr NIP-98 (get session)
2. Use same Nostr pubkey to call ArxMint payment endpoints
3. Assert: session is recognized, no re-authentication required
4. Assert: Auth.js session contains Nostr pubkey that both apps can verify
5. Assert: session cookie settings (domain, path) allow cross-app use or document token-exchange pattern

**Pass criteria:** Single Nostr identity works across both apps.

**File:** `tests/e2e/shared-auth.test.ts`
**Depends on:** OVERNIGHT_TASKS ID 21

---

## Layer 8: Failure Modes

### Test 8.1 — Double-Spend Prevention

**What it proves:** The same Cashu token cannot be used twice.

**Prerequisites:** Regtest stack, minted proofs

**Flow:**
1. Mint 100 sats of proofs
2. Send proofs to `/api/agent/query` with `Authorization: Cashu <token>` → assert 200
3. Send SAME proofs again → assert 401 (mint reports proofs as spent)
4. Check balance → assert 0 (proofs consumed)

**Pass criteria:** Second use of same token is rejected. No free access.

### Test 8.2 — Expired Macaroon Rejection

**Prerequisites:** L402 endpoint with macaroon TTL

**Flow:**
1. Get L402 challenge, pay invoice, access with valid macaroon → 200
2. Wait for macaroon to expire (or mock time)
3. Retry with expired macaroon → assert 401
4. Assert: error message indicates expiration, not generic auth failure

**Pass criteria:** Expired credentials don't grant access.

### Test 8.3 — Invalid Keyset ID Rejection

**Flow:**
1. Construct a Cashu token with a fabricated keyset ID
2. Send to payment endpoint → assert 401
3. Assert: error indicates keyset validation failure

**Pass criteria:** Tokens with unrecognized keysets are rejected.

### Test 8.4 — Concurrent Vault Access

**What it proves:** Two tabs/processes can't corrupt the vault by writing simultaneously.

**Flow:**
1. Open vault in two simulated tabs
2. Tab A: start saving proofs
3. Tab B: start saving different proofs concurrently
4. Assert: no data corruption (both sets of proofs present OR one write wins cleanly)
5. Assert: counter values are consistent (no gaps, no duplicates)

**Pass criteria:** Concurrent access doesn't corrupt data or cause secret reuse.

---

## Running Tests

### Unit Tests (no Docker required)
```bash
npm test
```

### E2E Tests Against Live Stack
```bash
# Start regtest stack
docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d

# Wait for LND to be ready
until docker exec sf-lnd lncli --network=regtest getinfo 2>/dev/null; do sleep 2; done

# Fund LND
LND_ADDR=$(docker exec sf-lnd lncli --network=regtest newaddress p2wkh | jq -r .address)
docker exec sf-bitcoind bitcoin-cli -regtest -rpcuser=test -rpcpassword=test generatetoaddress 101 $LND_ADDR

# Run E2E tests
node --experimental-strip-types --test "tests/e2e/**/*.test.ts"

# Tear down
docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml down -v
```

### CI Pipeline (future)
```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test  # Unit tests first (fast gate)
      - run: docker compose -f docker-compose.yml -f docker/docker-compose.regtest.yml up -d
      - run: scripts/wait-for-stack.sh  # Health check loop
      - run: scripts/fund-regtest.sh    # Generate blocks + fund LND
      - run: node --experimental-strip-types --test "tests/e2e/**/*.test.ts"
      - run: docker compose down -v
```

---

## Test Organization

```
tests/
  ├── *.test.ts                    # Existing unit tests (13 files)
  └── e2e/
      ├── core-generation.test.ts  # Layer 1: Prompt → config
      ├── config-persistence.test.ts
      ├── merchant-onboarding.test.ts
      ├── auth-nostr.test.ts       # Layer 2: Auth flows
      ├── auth-email.test.ts
      ├── auth-step-up.test.ts
      ├── l402-payment.test.ts     # Layer 3: Payment flows
      ├── nut24-payment.test.ts
      ├── spend-router.test.ts
      ├── transaction-ledger.test.ts
      ├── vault-lifecycle.test.ts  # Layer 4: Wallet vault
      ├── vault-seed-restore.test.ts
      ├── vault-crash-recovery.test.ts
      ├── keyset-safety.test.ts
      ├── docker-health.test.ts    # Layer 5: Infrastructure
      ├── docker-resilience.test.ts
      ├── network-isolation.test.ts
      ├── monitoring-scrape.test.ts # Layer 6: Monitoring
      ├── backup-restore.test.ts
      ├── payment-sdk.test.ts      # Layer 7: Cross-system
      ├── payment-api.test.ts
      └── shared-auth.test.ts
```

---

## Implementation Priority

Tests should be implemented in dependency order — foundation first, then flows that build on it:

| Priority | Tests | Why First |
|----------|-------|-----------|
| **1st** | 1.1 (generation), 5.1 (docker health) | Validates the stack boots and core product works |
| **2nd** | 4.1 (vault lifecycle), 1.2 (persistence) | Validates the P0 foundation (database + vault) |
| **3rd** | 2.1 (nostr auth), 2.2 (email auth) | Validates auth before testing authenticated flows |
| **4th** | 3.1 (L402), 3.2 (NUT-24), 3.4 (ledger) | Validates real payment flows |
| **5th** | 4.2 (seed restore), 4.3 (crash recovery) | Validates money safety |
| **6th** | 8.1-8.4 (failure modes) | Validates attack resistance |
| **7th** | 7.1-7.3 (cross-system), 5.2-5.3, 6.1-6.2 | Validates integrations and ops |

---

## Verification Checklist (Graduation Criteria)

Before declaring ArxMint "production ready" for the Longmont pilot:

- [ ] All Layer 1 tests pass (core product flow)
- [ ] All Layer 2 tests pass (auth works for both Nostr and email users)
- [ ] All Layer 3 tests pass (real money moves correctly)
- [ ] All Layer 4 tests pass (vault encrypts, recovers, handles crashes)
- [ ] Layer 5.1 passes (full stack boots clean)
- [ ] Layer 6.2 passes (backup/restore verified)
- [ ] All Layer 8 tests pass (failure modes handled)
- [ ] Tests run in CI on every push
- [ ] Test suite completes in under 10 minutes
- [ ] Zero flaky tests (deterministic regtest, no timing races)
