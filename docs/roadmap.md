# ArxMint — Implementation Roadmap

**Version:** 4.0 — March 2, 2026
**Informed by:** 7 research documents cross-referenced in `docs/research-crossref.md` + 6 deep research studies in `docs/research/`
**Canonical spec:** `docs/spec.md` (all `Spec §X` references point here)
**Overnight tasks:** `OVERNIGHT_TASKS.md` (concrete implementation tasks derived from this roadmap)
**E2E testing:** `docs/E2E_TESTING.md` (8 layers, 22 test flows)
**Security rollout:** `docs/security/HARDENING_ROLLOUT_PLAN.md` (observe-first hardening with canary enforce)
**Codename convention:** Phase names follow the brand versioning from positioning doc (Keystone → Spire → Aether)
**Production gate:** This roadmap defines a clear Production Readiness Gate between Phase E and Phase 4. No real money until the gate passes.

---

## Roadmap Overview

**Production path** (what must complete before real money):
```
Phase A: Foundation    (DB + vault + auth)              ✅ CODE COMPLETE
Phase B: Payments      (L402 + NUT-24 + SDK)            ✅ CODE COMPLETE
Phase C: Infrastructure (Caddy + monitoring + backup)   ✅ CODE COMPLETE
Phase D: E2E Testing   (regtest stack + 22 test flows)  ✅ CODE COMPLETE
Phase E: Hardening     (rate limit, health, caps, CI)   ✅ CODE COMPLETE
═══════════════════════════════════════════════════════
PRODUCTION READINESS GATE → testnet VPS deployment pending (human)
═══════════════════════════════════════════════════════
Phase 4: Citadel       (Longmont pilot + grants)        🟡 IN PROGRESS
Phase 5: Bazaar       (Merchant platform — decentralized Stripe)  📋 PLANNED
```

**Feature path** (parallel, not blocking production):
```
Phase 0: Fortify     (Security hardening)            ✅ COMPLETE
Phase 1: Keystone    (Core architecture upgrades)    ✅ COMPLETE
Phase 2: Spire       (Full privacy + commerce stack) ✅ COMPLETE
Phase 3: Aether      (Advanced features + scale)     🟠 POST-PILOT
```

---

## Implementation Snapshot (Current Codebase)

Status key:
- `Complete` = implemented and wired into current UX/runtime
- `Partial` = implemented but not fully enforced/integrated/tested end-to-end
- `Prototype` = scaffolding or stub behavior for design/prototyping
- `Planned` = roadmap target, not yet implemented

| Item | Status | Evidence |
|---|---|---|
| 0.1 Cashu keyset hardening | Complete | `lib/cashu-sdk.ts`, `tests/cashu-security.test.ts` |
| 0.2 Honest SP backend status + scoring | Complete | `lib/privacy-defaults.ts`, `components/privacy-dashboard.tsx`, `tests/privacy-defaults.test.ts` |
| 0.3 Lightning security tiers | Complete | `lib/types.ts`, `lib/lightning-agent.ts`, `components/wallet-panel.tsx`, `tests/lightning-security.test.ts` |
| 0.4 Remote signer isolation | Partial | Config + validation shipped; signer flow not yet fully isolated transport integration (`lib/lightning-agent.ts`) |
| 1.1 NUT-24 dual paywall | Complete | `lib/cashu-paywall.ts`, `app/api/agent/route.ts` — token validation wired; requires live mint for end-to-end verification |
| 1.2 Spend router | Complete | `lib/spend-router.ts`, route UX in `components/wallet-panel.tsx` |
| 1.3 BCE metrics dashboard + export | Complete | `lib/bce-metrics.ts`, `app/dashboard/page.tsx` |
| 1.4 Merchant onboarding flow | Complete | `components/merchant-onboard.tsx`, `app/community/[id]/page.tsx` |
| 1.5 Macaroon bakery | Complete | `bakeMacaroon()` in `lib/lightning-agent.ts` |
| 1.6 Ephemeral agent wallets | Complete | `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts` |
| 1.7 G-Bot fallback integration | Complete | `setupFederationWithGbot()` path in `lib/community-generator.ts` |
| 2.1 Fedimint v0.10 path | Complete | Root `docker-compose.yml` updated to `fedimintd:v0.10.0` with Iroh transport + ConnectorRegistry |
| 2.2 Ark integration | Prototype | `lib/ark-sdk.ts` explicitly stub-mode today |
| 2.3 CDK production mint | Partial | CDK compose generation exists; default local compose still Nutshell |
| 2.4 Multi-mint (Coco path) | Partial | Manager + swap scaffolding in `lib/cashu-sdk.ts` |
| 2.5 NUT-26 QR flow | Complete | URI/QR generation + wallet UI flow in `lib/cashu-sdk.ts`, `components/wallet-panel.tsx` |
| 2.6 Silent Payments infra | Prototype | Scanner/parser + Docker generator present; several placeholder derivations remain in `lib/silent-payments.ts` |
| 2.7 Monitoring stack | Complete | Prometheus scrape config at `docker/prometheus.yml`; Grafana datasource + dashboards at `docker/grafana/`; services in `docker-compose.yml` |
| 2.8 Fedimint gateway bridge | Prototype | Bridge implemented with placeholder preimage behavior in `lib/fedimint-sdk.ts` |
| 3.x advanced features | Prototype | Initial scaffolding in `lib/cashu-sdk.ts`, `lib/silent-payments.ts`, `lib/community-generator.ts` |
| 4.x production/grant rollout | Partial | Grant applications in `C:\code\te-btc\internal\docs\arxmint\grants\`, KPI framework at `docs/PILOT_KPIS.md`, VPS setup + DR drill docs in `docs/`; pilot deployment pending human action |
| 5.x merchant platform (Bazaar) | Planned | Decentralized Stripe alternative — API keys, webhooks, hosted checkout, client SDK, merchant dashboard, LNURL-pay, settlement automation |

---

## Known Gaps (Code Written ≠ Verified Working)

Every roadmap item above has code in the repo. But **code written is not code verified**.
To honestly mark something "done" requires real-world verification:
connect to a real mint, make a real payment, see real metrics.

### ~~Critical Gaps~~ → Resolved (Phase A Complete)

All five previously-critical persistence and auth gaps are now code-complete. Live verification still requires a testnet VPS deployment.

| ~~Gap~~ | Resolution | Files |
|---------|------------|-------|
| ~~No database~~ | ✅ Prisma + PostgreSQL 15 in Docker Compose. `Community`, `Merchant`, `Transaction`, Auth.js tables. Internal network, no public port. | `prisma/schema.prisma`, `docker-compose.yml` |
| ~~No user auth~~ | ✅ Nostr NIP-98 login + HMAC-SHA256 session tokens. Route protection via `middleware.ts`. L402 for agents. | `lib/auth-middleware.ts`, `middleware.ts`, `app/login/page.tsx`, `app/api/auth/route.ts` |
| ~~No wallet recovery~~ | ✅ IndexedDB encrypted vault (AES-256-GCM + PBKDF2-SHA256, 600K iterations, OWASP 2023). NUT-13 seed phrase backup + NUT-09 restore UI. | `lib/cashu-vault.ts`, `lib/crypto.ts`, `lib/proof-repo.ts` |
| ~~No merchant backend~~ | ✅ Merchant onboarding persists to `Merchant` DB table via Prisma. Error handling for DB failures. | `components/merchant-onboard.tsx`, `app/api/merchants/route.ts` |
| ~~No transaction history~~ | ✅ Transaction metadata (type, amount, backend, timestamp — no raw proofs) persisted to `Transaction` table. | `app/api/transactions/route.ts`, `lib/store.ts` |

### Integration Gaps — Status Update

| Item | Status | Notes |
|------|--------|-------|
| **L402 invoice generation** | ✅ Wired | `app/api/l402/route.ts` generates real BOLT-11 via LND gRPC; HMAC macaroon validation; challenges persisted to DB |
| **NUT-24 paywall** | ✅ Wired | `app/api/agent/route.ts` validates Cashu tokens against mint; double-spend rejection; skip-verify guard removed |
| **Remote signer transport** | ✅ Complete | `litd` remote signer integration complete in `lib/lightning-agent.ts` |
| **CDK vs Nutshell** | Intentional: Nutshell | Nutshell for pilot (stable). CDK when it drops "ALPHA" — two-mint Lightning swap migration, not in-place |
| **Monitoring config** | ✅ Complete | `docker/prometheus.yml` + `docker/grafana/datasources/` + `docker/grafana/dashboards/` created |
| **Gateway bridge** | ✅ Complete | Real LND payment + preimage extraction wired in `lib/fedimint-sdk.ts` |
| **BCE metrics** | ✅ Wired | Dashboard connected to real transaction DB records via `app/api/bce-metrics/route.ts` |
| **Reverse proxy** | ✅ Complete | Caddy service in `docker/docker-compose.caddy.yml`; automatic HTTPS; internal network routing |
| **Backup automation** | ✅ Complete | `scripts/backup.sh` (Postgres dump, 7-day retention) + `scripts/lnd-backup.sh` (channel.backup watch) |
| **Keyset collision safety** | ✅ Complete | NUT-02 ID computation, collision detection, V2 ID preference in `lib/cashu-sdk.ts` |
| **Ark SDK** | 🚫 BLOCKED | `lib/ark-sdk.ts` is stub. Waiting on `@arkade-os/sdk` upstream release. UI correctly shows "coming soon." |
| **CoinJoin / PayJoin** | 🚫 NOT IMPLEMENTED | UI correctly shows "coming soon" via `supportedBy: "not-yet-implemented"`. No protocol integration. |
| **Silent Payments scanning** | 🚫 BLOCKED | Address generation works (Cashu); receiving requires federation module (not upstream) |
| **Agent compute / data** | ⚠️ DEMO | Stubs return placeholder responses. Marked `demo: true` in API. Real dispatch on roadmap. |
| **Grant applications** | ✅ Drafted | OpenSats, HRF, Spiral, FBCE drafts at `C:\code\te-btc\internal\docs\arxmint\grants\`. Need real pilot data to submit. |
| **Programmable eCash (3.2)** | 🚫 BLOCKED | Depends on upstream Cashu NUT-XX adoption |
| **ZK reissuance (3.3)** | 🚫 BLOCKED | Depends on upstream Cashu ZK proof support |
| **HW wallet BIP392 (3.4)** | 🚫 BLOCKED | Requires physical hardware for testing |

### Verification Checklist (What "Done" Actually Means)

> **Note:** For the consolidated production-readiness checklist, see the **Production Readiness Gate** section below. This checklist covers individual feature verification.

To move any item from "code written" to "verified working":

- [ ] **0.1 Keyset validation**: Connect to a real Cashu mint. Intentionally feed a bad keyset ID. Confirm rejection.
- [ ] **0.3 Security tiers**: Connect LNC to a real Lightning Terminal. Confirm watch-only can't pay. Confirm pay-only routes through remote signer.
- [ ] **1.1 NUT-24 paywall**: Send a real Cashu token to `/api/agent`. Confirm access granted. Confirm invalid token rejected.
- [ ] **1.2 Spend router**: With real balances across Cashu + Lightning, confirm auto-routing picks correct path.
- [ ] **1.3 BCE metrics**: With real transaction data flowing, confirm dashboard shows accurate numbers.
- [ ] **1.4 Merchant onboarding**: Complete full onboarding flow. Generate QR. Make a real payment to a merchant.
- [ ] **2.1 Fedimint**: Join a real federation via invite code. Send and receive ecash.
- [ ] **2.5 NUT-26 QR**: Generate a QR, scan it with a Cashu wallet, complete payment.
- [ ] **2.7 Monitoring**: Run `docker compose up`. Confirm Prometheus scrapes all services. Confirm Grafana shows data.
- [ ] **4.1 Longmont pilot**: Real merchants. Real payments. Real KPIs tracked.

---

## Architecture Decisions (Locked by Research)

Six deep research studies in `docs/research/` resolved all previously open architecture questions. These decisions are final for the pilot phase:

| Decision | Answer | Research Source |
|----------|--------|----------------|
| **Application database** | Self-hosted PostgreSQL 15 in Docker Compose. Internal network only, no public port. Supabase is graduation target when >5K MAU. | `docs/research/1-Database & Persistence Strategy.md` |
| **Cashu proof custody** | **Non-custodial.** Proofs stored client-side only in encrypted IndexedDB vault (AES-256-GCM). Server DB stores transaction metadata, NEVER raw proofs. | `docs/research/1-Database & Persistence Strategy.md` |
| **Proof vault architecture** | Repository abstraction (ProofRepo, CounterRepo, OperationRepo) → IndexedDB adapter. Counter persistence must be atomic with proof writes. NUT-13 seed phrase as primary recovery. Saga pattern for crash recovery. Agent wallets: separate namespace, in-memory default. | `docs/research/5-Cashu Proof Persistence & Recovery.md` |
| **Encryption** | AES-256-GCM via Web Crypto API. Key derivation: PBKDF2-SHA256 (600K iterations, OWASP 2023) from user passphrase. Master key in-memory only while unlocked. Auto-lock on idle. | `docs/research/5-Cashu Proof Persistence & Recovery.md` |
| **Authentication** | Auth.js as session framework. Two providers: Nostr NIP-98 (primary) + Email magic link (merchant fallback). Prisma adapter for session persistence. Step-up reauth for wallet operations (5-min TTL). L402 for agents only — separate track from human auth. | `docs/research/4-Auth Strategy.md` |
| **VPS hosting** | Vultr 16GB/6-core ($80/mo). Alternative: DigitalOcean 8GB ($48/mo). Hetzner needs written ToS approval for node hosting. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Reverse proxy** | Caddy (automatic HTTPS via Let's Encrypt + ZeroSSL). Not nginx, not Traefik. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Network topology** | All services on internal Docker network. Only Caddy exposes ports 80/443. LND p2p (9735) stays public. Fedimint guardian ports internal (single-host pilot). | `docs/research/2-Pilot VPS & Deployment.md` |
| **Tor vs clearnet** | Hybrid (clearnet + Tor) for stable VPS IPv4. Tor-only if home server or dynamic IP. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Federation trust model** | 3 guardians on 1 machine is OK for engineering pilot. Must message as "single-operator, not trust-distributed." Cap fund values. Plan migration to independent guardians before mainnet. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Production mint** | Nutshell for pilot (reference implementation, battle-tested, already integrated). Migrate to cdk-mintd when it drops "ALPHA" warning (6–12 months). Migration is two-mint Lightning swap, not in-place upgrade. | `docs/research/3-CDK vs Nutshell.md` |
| **Grant strategy** | Apply NOW to OpenSats ($75K–$200K), HRF ($25K–$100K), Spiral ($50K–$200K). FBCE after pilot traction. | `docs/research/6-Grant Application Strategy.md` |

---

## Path to Working Product

What's needed to go from "beautiful prototype" to "production system that handles real money."
Research-informed — every decision below is locked. See `OVERNIGHT_TASKS.md` for the concrete task list (39 tasks).
**E2E verification:** `docs/E2E_TESTING.md` — 8 layers, 22 test flows ensuring the full system works end-to-end.

### Phase A: Foundation — Database + Vault + Auth

**Goal:** Users can refresh the page without losing everything.

1. **Postgres in Docker Compose** — Add `postgres:15-alpine` to compose, internal network only, no public port. Prisma ORM for schema. Tables: `Community`, `Merchant`, `Transaction`, `User`, `Account`, `Session`, `VerificationToken` (Auth.js standard). **No Cashu proof tables — proofs are client-side only.**
2. **Client-side encrypted vault** — IndexedDB + AES-256-GCM + PBKDF2-SHA256 (600K iterations, OWASP 2023). Repository abstraction layer (ProofRepo, CounterRepo, OperationRepo). Atomic counter persistence with proof writes. Passphrase setup UI. NUT-13 seed phrase backup + NUT-09 restore flow.
3. **Auth.js + Nostr NIP-98** — Auth.js config with Nostr Credentials provider (wraps existing `lib/nostr-auth.ts`) + Email magic link provider. Prisma adapter. HttpOnly/Secure/SameSite cookies. Middleware route gating for `/wallet`, `/merchant`, `/admin`. Risk-tier step-up reauth (5-min TTL for spend operations).
4. **Persist app data** — Community configs, merchant listings, transaction metadata (not proofs) saved to Postgres. Hydrate Zustand from DB on load.

### Phase B: Real Payments — L402 + NUT-24 + Payment SDK

**Goal:** Money actually moves. Demo endpoints become real.

1. **Wire L402 to LND** — Connect `app/api/l402/route.ts` to real LND via gRPC. Generate real invoices. Validate macaroons server-side.
2. **Wire NUT-24 paywall** — Verify Cashu tokens against connected mint in `app/api/agent/route.ts`. Reject invalid/spent tokens.
3. **Payment SDK for Teneo Marketplace** — Extract payment primitives into `lib/payment-sdk.ts` with clean API: `createL402Challenge()`, `verifyL402Token()`, `routePayment()`. Add REST endpoints (`/api/payment/*`) for Express.js marketplace integration.
4. **Federation settlement** — Mint Cashu ecash for marketplace referral fees, deposit into Fedimint.
5. **Shared Nostr auth** — Auth.js sessions recognized by both arxmint and teneo-marketplace.

### Phase C: Production Infrastructure — Deploy + Monitor + Backup

**Goal:** The stack runs on a real VPS with HTTPS, monitoring, and backups.

1. **Caddy reverse proxy** — Add to compose, automatic HTTPS, route to internal services.
2. **Network hardening** — Internal Docker network for all services. Only Caddy exposes 80/443. LND p2p (9735) public. Fedimint guardian ports internal.
3. **Prometheus scrape config + Grafana dashboards** — Scrape targets for LND, Cashu, Fedimint at 30s intervals. Alerts for disk >70%, container restarts, LND health, federation quorum.
4. **Backup automation** — Daily Postgres dump with 7-day retention. LND channel.backup watch + sync on change. Off-host encrypted storage.
5. **docs/DEPLOY.md** — Step-by-step: Vultr provisioning, SSH hardening, UFW rules, Docker install, env setup, `docker compose up`, Caddy HTTPS, monitoring access. Nutshell hardening checklist.
6. **BCE metrics pipeline** — Wire dashboard to real transaction data from DB.

### Phase D: E2E Testing + Hardening

**Goal:** Confidence that real money won't be lost. Full system verification.
**Strategy document:** `docs/E2E_TESTING.md` — 8 layers of verification from prompt generation to crash recovery.

1. **Regtest test stack** — `docker-compose.regtest.yml` with bitcoind regtest for deterministic, no-real-money testing. Scripts to boot, fund, and tear down.
2. **Payment flow tests** — L402 (402 → pay → preimage → access). NUT-24 (Cashu token → access, double-spend → rejection). Spend router path selection. Transaction ledger metadata (no proofs in DB).
3. **Vault lifecycle tests** — Create/lock/unlock, seed phrase backup + NUT-09 restore, crash recovery saga, concurrent access safety.
4. **Auth flow tests** — Nostr NIP-98 login → session → protected routes. Email magic link. Step-up reauth for spend operations.
5. **Failure mode tests** — Double-spend prevention, expired macaroons, invalid/collision keysets, keyset attacks.
6. **Infrastructure tests** — Docker stack health, service dependency resilience, network isolation verification, Prometheus scrape validation, backup/restore cycle.
7. **Multi-mint safety gates** — Keyset ID computation per NUT-02. Collision detection. Legacy ID warnings. Block auto-add from unknown mints.
8. **NUT-13 seed phrase UI** — Backup screen. Restore flow (enter words → per-mint restore in batches of 100).
9. **CDK migration prep** — `docker-compose.cdk.yml` override. Document two-mint swap procedure.
10. **Remote signer** — Complete `litd` integration so agent runtime never holds signing keys.

### Phase E: Production Hardening — Ship-Ready

**Goal:** The system is safe to run with real money and real users. No silent failures, no open attack surfaces.

1. **Health check endpoints** — `GET /api/health` returns service status (DB connected, mint reachable, LND synced). Used by Caddy health checks and monitoring alerts. Fail fast on startup if required env vars missing.
2. **Rate limiting** — Rate limit all API endpoints. Payment endpoints: 10 req/min per IP. Auth endpoints: 5 req/min (brute-force protection). Public endpoints: 60 req/min. Use `next-rate-limit` or middleware-based approach.
3. **Input validation + sanitization** — Validate all user inputs server-side (community names, merchant data, payment amounts). Reject malformed Cashu tokens before passing to SDK. Sanitize any user content rendered in HTML (XSS prevention).
4. **Error handling** — Custom error pages (404, 500). API endpoints return structured error JSON (`{ error: string, code: string }`), never stack traces. Unhandled promise rejections caught and logged.
5. **Structured logging** — JSON-formatted logs with timestamp, level, request ID, user ID. Log all payment operations (amount, backend, status — never proof secrets). Log auth events (login, logout, reauth, failure). Ship logs to stdout for Docker log aggregation.
6. **Security headers** — Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Caddy adds HSTS. Next.js middleware adds CSP.
7. **Dockerfile production audit** — Multi-stage build (deps → build → runtime). Run as non-root user. Pin base image versions. No dev dependencies in production image. Health check in Dockerfile.
8. **Database migrations** — Prisma migration strategy: `prisma migrate deploy` on startup (not `prisma db push`). Migration files committed to git. Rollback procedure documented.
9. **Pilot value caps** — Maximum wallet balance per user (configurable, default 50,000 sats for pilot). Maximum single transaction amount. Maximum daily transaction volume. Enforced server-side, not just UI. Clearly displayed to users.
10. **Testnet validation** — Full deployment on testnet VPS before mainnet. Run all E2E tests against testnet stack. Merchant onboarding dry run with test merchants. Minimum 7 days on testnet with no incidents before mainnet.
11. **CI/CD pipeline** — GitHub Actions: lint → build → unit tests → E2E tests (regtest Docker). Deploy to testnet on `main` push. Deploy to mainnet on tagged release only. Deployment requires passing all tests.
12. **Incident response** — Runbook: what to do when LND goes down, mint stops responding, federation loses quorum, backup fails, disk fills up. Alert routing: Grafana → email/SMS. Rollback: `docker compose down && docker compose up` with previous image tag.

### Blocked Items (Waiting on Upstream)

- **Ark SDK**: No production SDK available. `lib/ark-sdk.ts` is stub mode. Track `@arkade-os/sdk` release.
- **CDK maturity**: Monitor cdk-mintd for "ALPHA" warning removal. Triggers migration from Nutshell.
- **Programmable eCash (NUT-XX)**: Cashu protocol hasn't adopted spending conditions yet.
- **ZK reissuance**: Requires Cashu protocol support for ZK proofs in token reissuance.
- **CTV+CSFS for Ark**: Requires Bitcoin soft-fork. Track BIP proposals.

---

## Production Readiness Gate

**Everything below must be true before accepting real mainnet funds.** This is the exit criteria for Phases A–E. Phase 4 (Citadel) begins after this gate passes.
**Live status tracker:** `docs/PILOT_READINESS_STATUS.md` (current verification results + remaining blockers)

### Data Safety
- [x] Postgres persists communities, merchants, transactions, auth sessions
- [ ] Cashu proofs stored client-side only in encrypted IndexedDB vault (AES-256-GCM)
- [ ] NUT-13 seed phrase backup + NUT-09 restore verified working
- [ ] Crash recovery saga pattern tested — no proofs lost after simulated crash
- [ ] Daily Postgres backup running and restore verified
- [ ] LND channel.backup auto-sync running
- [ ] Off-host backup destination configured and tested

### Authentication & Authorization
- [ ] Auth.js with Nostr NIP-98 + email magic link working
- [x] Protected routes (`/wallet`, `/merchant`, `/admin`) require auth
- [ ] Step-up reauth for spend/export operations (5-min TTL)
- [x] L402 endpoints require valid paid macaroon
- [x] NUT-24 endpoints reject spent/invalid tokens
- [x] Rate limiting active on auth and payment endpoints

### Payment Correctness
- [ ] L402: 402 challenge → pay invoice → preimage → access (E2E verified on regtest)
- [ ] NUT-24: Cashu token → access; double-spend → rejection (E2E verified)
- [x] Spend router selects correct backend by amount/privacy/availability
- [x] Transaction ledger records metadata only (no raw proofs in DB)
- [x] Pilot value caps enforced (max balance, max transaction, max daily volume)

### Infrastructure
- [ ] All services on internal Docker network; only Caddy exposes 80/443
- [ ] Caddy serving HTTPS with auto-renewing certificates
- [ ] Prometheus scraping all services; Grafana dashboards showing data
- [ ] Alerts configured for: disk >70%, container restarts, LND unhealthy, federation quorum loss
- [x] Health check endpoint (`/api/health`) returns real service status
- [x] Structured JSON logging on all services
- [x] Security headers (CSP, HSTS, X-Frame-Options) in place

### Testing
- [x] All unit tests pass (`npm test`)
- [ ] All E2E tests pass against regtest (`docs/E2E_TESTING.md`)
- [x] E2E tests run in CI on every push
- [ ] 7+ days on testnet VPS with zero incidents
- [ ] Disaster recovery drill completed (new VPS, restore backups, verify transactions)

### Operations
- [ ] docs/DEPLOY.md written and followed for testnet deploy
- [x] Incident response runbook exists
- [ ] Rollback procedure documented and tested
- [x] Single-host federation trust statement published (see `docs/TRUST_STATEMENT.md`)
- [x] Mainnet migration plan documented (when to split guardians)

---

## Phase 0: Fortify — Security Hardening

**Goal:** Fix all P0 security issues identified by research. No new features until the foundation is safe.
**Research drivers:** Doc 2 (agent security), Doc 5 (SP misrepresentation), Doc 6 (NUT-13 vulnerability)
**Exit gate:** Every item must satisfy `docs/spec.md` §10 acceptance criteria and required verification.

### 0.1 — Cashu Keyset ID Validation (P0)
**Source:** Doc 6 — Jan 2026 Cashu vulnerability disclosure
**File:** `lib/cashu-sdk.ts`
**What:** Add keyset ID verification against mint pubkeys. Prevent NUT-13 deterministic secret collisions.
**Why:** Agent wallets that programmatically accept/swap tokens are especially vulnerable. An adversarial mint can exploit keyset ID collisions to steal proofs via `/restore` endpoint.
**Implementation:**
- Verify keyset IDs are correctly derived from mint pubkeys before accepting
- Add anti-collision detection (check for `keyset_id_int` namespace conflicts across known mints)
- Validate restore endpoint responses before trusting them
- Log and alert on any keyset ID anomalies

### 0.2 — Fix Silent Payments Status Display (P0)
**Source:** Doc 1, Doc 5
**File:** `lib/privacy-defaults.ts`
**What:** Show honest per-backend SP support status in privacy dashboard.
**Why:** SP for Fedimint peg-outs requires a federation wallet module (server-side), not a client toggle. Current dashboard implies SP works everywhere — it doesn't.
**Implementation:**
- Add `supportedBy` field to privacy layer config: `"all" | "cashu-only" | "on-chain-only" | "requires-federation-module"`
- Update privacy dashboard to show per-backend availability
- Update `computePrivacyScore()` to weight by what's actually usable
- Add tooltip: "Silent Payments for Fedimint requires federation-level support (not yet available)"

### 0.3 — Lightning Agent Security Tiers (P0)
**Source:** Doc 2 — 3-tier security model
**File:** `lib/lightning-agent.ts`
**What:** Implement tiered access control for agent Lightning connections.
**Why:** Agents currently get full LNC access including signing keys. Doc 2 explicitly warns: "Never give agents admin macaroons."
**Implementation:**
- Define three tiers:
  ```
  Tier 1: WATCH_ONLY  — getInfo, getBalance, listChannels (default for exploration)
  Tier 2: PAY_ONLY    — createInvoice, payInvoice via remote signer (for agent commerce)
  Tier 3: ADMIN       — full access, explicit opt-in with warning banner
  ```
- Add `SecurityTier` type to `lib/types.ts`
- Default all agent connections to `WATCH_ONLY`
- Require explicit user confirmation to upgrade to `PAY_ONLY`
- Show red warning if user selects `ADMIN` for an agent

### 0.4 — Remote Signer Integration (P0)
**Source:** Doc 2 — key isolation
**File:** `lib/lightning-agent.ts`
**What:** Add `litd` remote signer support so agent processes never hold signing keys.
**Why:** Key compromise in an agent process means loss of all channel funds.
**Implementation:**
- Add remote signer connection config to `.env.example`
- Agent payment requests route through remote signer
- Signing keys stay on a separate, hardened process
- Agent process only holds pay-only macaroon

---

## Phase 1: Keystone — Core Architecture Upgrades

**Goal:** Upgrade foundations informed by latest research. Agent commerce + merchant + spend routing.
**Research drivers:** Doc 2 (macaroon bakery), Doc 3 (NUT-24), Doc 4 (spend router), Doc 7 (BCE metrics, merchant onboarding)
**Exit gate:** Every item must satisfy `docs/spec.md` §10 acceptance criteria and required verification.

### 1.1 — NUT-24 Ecash Paywalls (P1)
**Source:** Doc 3 — Cashu native HTTP 402
**Files:** New `lib/cashu-paywall.ts`, update `app/api/agent/route.ts`
**What:** Accept Cashu ecash tokens as payment for agent services, alongside Lightning L402.
**Why:** Users who already hold ecash shouldn't have to melt to Lightning just to pay for an agent service. NUT-24 is Cashu's native HTTP 402 — it's the ecash equivalent of L402.
**Implementation:**
- New middleware: parse `Cashu` auth header (NUT-24 format)
- Verify ecash token against connected mint
- If valid, grant access (same as L402 preimage verification)
- Agent endpoint returns `WWW-Authenticate: Cashu` alongside `L402` challenge
- Client can pay with either method

### 1.2 — Spend Router (P1)
**Source:** Doc 4 — privacy-aware spend routing pseudocode
**Files:** New `lib/spend-router.ts`, update `components/wallet-panel.tsx`
**What:** Auto-select optimal payment path based on amount, privacy level, and available backends.
**Why:** Users currently manually choose backend. A privacy-aware router makes the best choice automatically.
**Implementation:**
- Route selection logic (from Doc 4 pseudocode):
  ```
  if amount < 10_000 sats AND ecash available → use ecash (best privacy, instant)
  if amount < 100_000 sats AND Lightning available → use Lightning (fast, good privacy)
  if amount < 1_000_000 sats AND Ark available → use Ark VTXOs (high privacy, off-chain)
  else → on-chain with Silent Payments (if supported) or standard Taproot
  ```
- Privacy score weighting: higher privacy paths preferred when multiple options available
- User override: can always manually select a path
- Display routing decision with privacy rating in wallet UI

### 1.3 — BCE Maturity Metrics Dashboard (P1)
**Source:** Doc 7 — FBCE maturity tiers, KPI frameworks
**Files:** New `lib/bce-metrics.ts`, update `app/dashboard/page.tsx`
**What:** Add community health metrics to dashboard: merchant count, active spenders, spend velocity, payment success rate, uptime.
**Why:** Grant applications need measurable outcomes. Community leaders need to know if their economy is healthy. Doc 7 shows these are the KPIs that win funding.
**Implementation:**
- New dashboard tab: "Community Health"
- Metrics tracked:
  - Merchants onboarded (count + active)
  - Monthly active spenders (MAU)
  - Spend velocity (transactions/user/month)
  - Payment success rate (%)
  - Federation/mint uptime (%)
  - Liquidity coverage ratio
- Data source: aggregate from Zustand store + API endpoints
- Export: JSON/CSV for grant reporting

### 1.4 — Merchant Onboarding Flow (P1)
**Source:** Doc 7 — merchant directory, BCE patterns
**Files:** Update `app/community/[id]/page.tsx`, new `components/merchant-onboard.tsx`
**What:** Replace placeholder "List Your Business" button with actual onboarding workflow.
**Why:** The merchant directory is the visible proof that a circular economy exists. Without real onboarding, it's just a concept.
**Implementation:**
- Multi-step form: business name, category, location, payment methods accepted
- Generate merchant QR code (Cashu NUT-26 or Lightning invoice)
- POS setup guidance (link to Numo for NFC, manual QR for simple)
- Merchant listed in community directory with status badge
- Payment acceptance tracking (feeds BCE metrics)

### 1.5 — Macaroon Bakery (P1)
**Source:** Doc 2 — scoped credentials for agents
**File:** `lib/lightning-agent.ts`
**What:** Expose `bakeMacaroon()` function that generates role-specific credentials.
**Implementation:**
- Roles: `pay-only`, `invoice-only`, `read-only`, `agent-commerce` (pay + invoice)
- Expiry: configurable TTL per macaroon
- Caveats: amount limits, endpoint restrictions
- Used by agent marketplace to scope each agent's access

### 1.6 — Agent Wallet Pattern (P1)
**Source:** Doc 1 (ecash as bearer value), Doc 6 (transaction independence)
**Files:** `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts`
**What:** Add ephemeral/scoped agent wallet mode.
**Why:** Agents shouldn't use persistent localStorage wallets. Doc 6's "transaction independence" paper argues wallets should be stateless — no long-lived secrets.
**Implementation:**
- Agent wallets: in-memory only, no localStorage persistence
- Auto-expire after configurable TTL
- Scoped to specific community/mint
- Balance limits enforced by macaroon caveats
- Clean teardown on agent disconnect

### 1.7 — G-Bot Integration (P1)
**Source:** Doc 1 — Fedimint official federation setup service
**File:** `lib/community-generator.ts`
**What:** Integrate Fedimint's G-Bot API for guided federation bootstrap instead of raw Docker scripting.
**Why:** G-Bot automates guardian coordination, peer discovery, and consensus setup. Our current approach generates Docker configs that require manual coordination.
**Implementation:**
- Check G-Bot API availability
- If available: use G-Bot for federation setup (fewer manual steps)
- If unavailable: fall back to current Docker generation
- Track G-Bot API maturity — may not have public API yet

---

## Phase 2: Spire — Full Privacy + Commerce Stack

**Goal:** Complete the privacy layer stack and add production infrastructure.
**Research drivers:** Doc 1 (Fedimint v0.10.0), Doc 3 (CDK, Coco, NUT-26), Doc 4 (Ark), Doc 5 (SP infrastructure)

### 2.1 — Fedimint v0.10.0 Upgrade ✅
**Source:** Doc 1
**File:** `docker-compose.yml`
**Status:** Complete. Root `docker-compose.yml` uses `fedimint/fedimintd:v0.10.0` with Iroh transport and ConnectorRegistry.

### 2.2 — Ark SDK Integration
**Source:** Doc 4
**Files:** New `lib/ark-sdk.ts`, update `lib/types.ts`, `lib/store.ts`, `docker-compose.yml`
**What:** Add `SovereignArkClient` wrapper around `@arkade-os/sdk`. Add `arkd` to Docker stack. Track Ark VTXOs in wallet balance.
**Implementation:**
- `SovereignArkClient` class (mirrors Fedimint/Cashu client pattern)
- Methods: `connect()`, `createVTXO()`, `spendVTXO()`, `getBalance()`, `bridge()` (Ark → on-chain)
- Add `arkSats` to `WalletBalance` type
- Add `arkd` service to Docker compose
- Wire into spend router (Phase 1.2)
- Privacy maximum preset: Ark → on-chain → eCash mint (hybrid bridge from Doc 4)

### 2.3 — CDK Cloud-Native Mint Upgrade (Deferred)
**Source:** Doc 3 — CDK replaces Nutshell for production
**File:** `docker-compose.yml`
**Decision (Research #3):** Keep Nutshell for pilot. CDK still has "ALPHA" warning — operator docs say "only with amounts you do not mind losing." Migrate to cdk-mintd when maturity warning drops. Migration is two-mint Lightning swap (not in-place). Provide `docker-compose.cdk.yml` override for testing.
**Includes:** Postgres backend, Prometheus metrics, structured logging, Kubernetes deployment profiles.

### 2.4 — Multi-Mint Support (Coco)
**Source:** Doc 3 — Coco toolkit
**File:** `lib/cashu-sdk.ts`
**What:** Manage balances across multiple Cashu mints. Enable multi-mint payments.
**Why:** Inter-community commerce requires spending tokens across mints. Coco (funded by OpenSats Wave 16) provides this.

### 2.5 — NUT-26 Payment Requests + QR/NFC
**Source:** Doc 3
**Files:** `lib/cashu-sdk.ts`, `components/wallet-panel.tsx`
**What:** Generate `cashu:` URI format for QR codes. Support NUT-18 structured payment requests.
**Why:** Merchant POS needs scannable QR codes, not raw base64 tokens.

### 2.6 — Silent Payments Infrastructure
**Source:** Doc 5
**Files:** `docker-compose.yml`, new `lib/silent-payments.ts`
**What:** Add `silent-pay-indexer` to Docker stack. Implement SP address parsing + sending for on-chain transactions. Add scan key delegation for mobile.
**Implementation:**
- Docker: add `silent-pay-indexer` service connected to Bitcoin node
- Parse `sp1q` / `tsp1q` addresses in wallet send flow
- Implement scan scheduling with persistence (last scanned height)
- Scan key delegation: scan key on hot device, spend key cold
- Feature flags: `ARXMINT_SP_ENABLED`, `ARXMINT_SP_SCAN_MODE`, `ARXMINT_SP_INDEXER_URL`

### 2.7 — Monitoring Stack (Partially Complete)
**Source:** Doc 3 (CDK Prometheus), Doc 7 (operator-grade monitoring)
**File:** `docker-compose.yml`
**Status:** Prometheus + Grafana services added to root compose. Still needed: `docker/prometheus.yml` scrape config, Grafana dashboard JSON, datasource config.
**Decision (Research #2):** Set scrape interval to 30s (not 10s) for pilot. Add alerts for disk >70%, memory/swap, container restarts, LND health, federation quorum, HTTPS renewal failures.
**Dashboards:** Federation uptime, mint balance, LN channel health, payment success rates, ecash circulation.

### 2.8 — Fedimint Gateway → L402 Bridge
**Source:** Doc 2
**Files:** `lib/fedimint-sdk.ts`, `lib/lightning-agent.ts`
**What:** Route L402 invoice payments through Fedimint gateway. Users pay agent services with ecash that auto-melts to Lightning.
**Why:** Users holding Fedimint ecash shouldn't need a separate Lightning wallet to pay L402 endpoints.

---

## Phase 3: Aether — Advanced Features

**Goal:** Programmable eCash, advanced privacy, community governance.
**Research drivers:** Doc 5 (advanced SP), Doc 6 (STARK conditions, ZK reissuance), Doc 7 (governance)

### 3.1 — Guardian Governance Framework
**Source:** Doc 7
**File:** `lib/community-generator.ts`
**What:** Guardian selection criteria, rotation policy, incident response, quorum management, treasury use policy.

### 3.2 — Programmable eCash (STARK/Cairo Spending Conditions)
**Source:** Doc 6 — NUT-XX
**What:** Conditional ecash tokens (escrow, subscriptions, proof-of-service). Agent pays token that's only spendable when service is proven delivered.
**Status:** Depends on Cashu protocol adoption of NUT-XX. Track upstream.

### 3.3 — ZK Verified Reissuance
**Source:** Doc 6 — arXiv paper on stateless agent wallets
**What:** Implement audit-log + ZK reissuance pattern for agent wallets. Ephemeral wallets that can circulate and reissue tokens without centralized mediation.

### 3.4 — Hardware Wallet Support (BIP392/BIP376)
**Source:** Doc 5
**What:** SP descriptor support and PSBT spending for hardware signing devices.

### 3.5 — Advanced Cashu Features
**Source:** Doc 3
**What:** NUT-28 P2BK, background proof state verification, multi-mint atomic swaps.

### 3.6 — Numo NFC Merchant Integration
**Source:** Doc 3
**What:** Tap-to-pay for merchants using Numo NFC cards. Deep integration with merchant directory.

---

## Research Watchlist (Non-Blocking, Track Continuously)

These items are intentionally tracked outside active delivery phases. Promote to roadmap work only when upstream conditions change.

1. **BIP352 `K_max` / scan-hardening proposals (Doc 5)**  
   Trigger to promote: the proposal lands in spec or major implementations enforce limits by default.
2. **Ark non-interactive receive via CTV+CSFS capability set (Doc 6)**  
   Trigger to promote: Bitcoin soft-fork path and implementation maturity become concrete.
3. **covenant-less Ark (clArk) compatibility strategy (Doc 4)**  
   Trigger to promote: required for interoperability target deployments or SDK parity gaps block integration.
4. **Research citation normalization**  
   Trigger to promote: unresolved placeholder citations block P0/P1 closure; follow `docs/research-citation-policy.md`.

---

## Phase 4: Citadel — Pilot Launch + Growth

**Prerequisite:** Production Readiness Gate passed. All Phases A–E complete.
**Goal:** Launch the Longmont pilot, secure grants, then replicate.
**Research drivers:** Doc 7 (grant templates, BCE patterns, pilot-to-scale)

### 4.0 — Pre-Launch (During Phases A–E)

Grant applications can begin before the pilot is live — prototype + roadmap + research are sufficient for first applications.

**Apply NOW (before pilot):**
- **OpenSats General Grant** ($75K–$200K) — HIGHEST priority. Narrative: "developer-experience + deployment infrastructure for ecash + L402." OpenSats Wave 16 explicitly funds Cashu Dev Kit, cashu-ts/Coco, Nutshell, Minibits. Commit to monthly reports → quarterly public writeups.
- **HRF Bitcoin Development Fund** ($25K–$100K) — Year-round intake, quarterly announcements. Narrative: "freedom-tech deployment for vulnerable communities" + threat model.
- **Spiral** ($50K–$200K) — No fixed deadline, email-based. Narrative: "UX/developer-experience improvement for Bitcoin adoption."

**Preparation:** Shared grant dossier at `docs/GRANT_DOSSIER.md` (executive summary, technical scope, budget, team bios, open-source licensing, threat model). Grant files and human task tracking moved to `C:\code\te-btc\internal\docs\arxmint\`.

### 4.1 — Longmont Pilot Deployment
**Source:** Doc 7, Spec §8
**What:** Deploy full ArxMint stack for Longmont Bitcoin meetup.
**Prerequisites:** Production Readiness Gate passed + 7 days testnet + disaster recovery drill.
**Launch sequence:**
1. Switch LND from `--bitcoin.testnet` to `--bitcoin.mainnet` in compose
2. Generate production credentials (run `scripts/generate-secrets.sh`; full checklist at `C:\code\te-btc\internal\docs\arxmint\human_tasks.md`)
3. Deploy to Vultr VPS
4. Verify health checks, monitoring, and backup automation
5. Onboard first 5 merchants (soft launch)
6. Monitor for 7 days — check alerts, backups, payment success rate
7. Open to full community (30 merchant target)

**KPIs (from Doc 7 template):**
- 30 merchants onboarded by month 6
- 300 monthly active spenders by month 6
- 98%+ payment success rate
- 99.5% federation uptime
- 2+ spend events/user/month

### 4.2 — Post-Launch: Monitoring + Iteration
**What:** First 90 days of live operation.
- Daily: Check Grafana dashboards, review alerts, verify backups
- Weekly: Review transaction volumes, payment success rates, error logs
- Monthly: KPI report (feeds grant reporting), balance audit, security review
- Fix bugs in production — hotfix process: fix → test on regtest → deploy tagged release

### 4.3 — Grant Reporting Dashboard
**Source:** Doc 7 — OpenSats reporting requirements
**What:** Built-in export from dashboard: monthly progress notes, KPI snapshots, budget tracking.
**Format:** Matches OpenSats cadence (monthly first 3 months, then quarterly).

**Apply AFTER pilot traction (30+ days live):**
- **FBCE Round 3** (1–5M sats) — Requires Longmont metrics: merchant onboarding, recurring spend, education. Narrative: "circular economy proof-of-work."

### 4.4 — Replication Playbook
**Source:** Doc 7 — "BCE in a box"
**What:** Publish open-source deployment playbook for other communities.
**Contents:** Infrastructure setup, guardian recruitment guide, merchant onboarding kit, monitoring runbook, governance template, incident response template.

### 4.5 — Multi-City Federation
**Source:** Doc 7 — pilot-to-scale timeline
**What:** Extend from Longmont to additional cities. Inter-federation commerce via Coco multi-mint.
**Prerequisite:** Guardian distribution plan (split from single host to independent operators).

---

## Phase 5: Bazaar — Decentralized Merchant Platform

**Codename:** Bazaar — the open marketplace where sovereign commerce happens
**Goal:** Make ArxMint as easy to integrate as Stripe. Any merchant — online or local — can accept Bitcoin payments with zero KYC on customers, near-zero fees, and full privacy. One API key, one script tag, done.
**Prerequisite:** Phase 4 pilot running (real merchants, real payments proving the infrastructure works)
**Vision:** A private, open-source, decentralized Stripe alternative. Merchants keep 99.7%+ of every sale. No payment data sold. No middleman. Customers pay with ecash (Cashu), Lightning, or Fedimint — merchant gets sats.

### Why This Phase Exists

Stripe charges 2.9% + $0.30 per transaction. A local merchant doing $10K/month loses ~$320/month to processing fees. ArxMint's ecash and Lightning payments cost fractions of a penny. But the technology advantage means nothing if the developer experience is worse than `<script src="stripe.js">`. Phase 5 closes that gap.

The core payment loop (create challenge → pay → verify) is already production-quality. What's missing is the merchant-facing developer experience: API keys, webhooks, a checkout page, a client SDK, and a dashboard. This is plumbing, not protocol work — the hard crypto is done.

### 5.1 — Merchant API Keys + Scoped Authentication

**What:** Issue API credentials when a merchant onboards. `sk_live_...` (server-side, full access) and `pk_live_...` (client-side, create challenges only). Add `sk_test_...` / `pk_test_...` for sandbox mode that hits regtest infrastructure.
**Why:** Without credentials, merchants can't programmatically create payments scoped to their business. This is the single biggest blocker to adoption.
**Implementation:**
- Generate HMAC-derived key pairs on merchant creation, store hashed in `Merchant` DB table
- Add `apiKeyId` field to `PaymentChallenge` — every challenge is scoped to a merchant
- Middleware: `X-API-Key` header authentication for all `/api/v1/merchant/*` endpoints
- Key rotation endpoint: `POST /api/v1/merchant/keys/rotate`
- Rate limits per API key (not just per IP)
- Sandbox mode: separate key prefix (`sk_test_`), routes to regtest LND + test Cashu mint

### 5.2 — Webhook System

**What:** HTTP POST event delivery when payment state changes. Events: `payment.created`, `payment.completed`, `payment.failed`, `payment.expired`, `settlement.completed`.
**Why:** Merchants can't automate fulfillment without knowing when a payment completes. This is the #1 feature request for any payment API.
**Implementation:**
- `WebhookEndpoint` DB table: `merchantId`, `url`, `secret` (HMAC signing key), `events[]`, `active`
- `POST /api/v1/merchant/webhooks` — register endpoint
- Event queue: on payment state change, enqueue webhook delivery
- Delivery: POST to merchant URL with JSON body + `X-ArxMint-Signature` (HMAC-SHA256 of body with endpoint secret)
- Retry: exponential backoff (1s, 5s, 30s, 5m, 30m) — 5 attempts max
- `GET /api/v1/merchant/webhooks/:id/deliveries` — delivery log for debugging
- SDK helper: `arxmint.webhooks.verify(body, signature, secret)` for merchant-side verification
- Invoice-paid listener: watch LND invoice settlement events, trigger `payment.completed` webhook + auto-complete settlement

### 5.3 — Hosted Checkout Page

**What:** A merchant-branded payment page at `/pay/:challengeId`. Customer lands on page, sees amount + QR code, pays via Cashu ecash or Lightning, gets redirected to `successUrl`. No code required on the merchant's site beyond a link.
**Why:** Stripe Checkout is the most-used integration pattern. Most merchants don't want to build a custom payment UI — they want a link that collects money.
**Implementation:**
- `POST /api/v1/merchant/checkout` — create session with `amount`, `description`, `successUrl`, `cancelUrl`, `metadata`
- Returns `checkoutUrl` (e.g., `https://mint.arxmint.com/pay/cs_abc123`)
- Checkout page: shows merchant name + amount, auto-detects best payment method, renders QR (NUT-26 for Cashu, BOLT11 for Lightning)
- Real-time status via SSE — page auto-redirects on payment completion
- Mobile-responsive, dark theme, merchant logo/name from onboarding data
- Payment links: `POST /api/v1/merchant/payment-links` — reusable URLs for fixed-price items (no expiry)
- Embeddable: `<iframe src="https://mint.arxmint.com/pay/cs_abc123">` for inline checkout

### 5.4 — Payment Status API + Real-Time Updates

**What:** `GET /api/v1/merchant/payments/:id` to poll payment status. SSE endpoint for real-time push. WebSocket option for high-frequency POS use.
**Why:** After creating a challenge, the merchant is currently blind. They need to know when the customer paid.
**Implementation:**
- `GET /api/v1/merchant/payments/:id` — returns `{ id, status, amount, type, createdAt, completedAt, metadata }`
- `GET /api/v1/merchant/payments/:id/events` — SSE stream, emits `status_changed` events
- `GET /api/v1/merchant/payments` — list with filters: `status`, `dateRange`, `type`, cursor pagination
- Status enum: `pending` → `completed` | `expired` | `failed`
- For POS: WebSocket at `wss://mint.arxmint.com/ws/payments` — merchant subscribes to their payment stream

### 5.5 — Client-Side SDK + React Components

**What:** `@arxmint/js` — a client-side JavaScript SDK that handles the full payment flow in the browser. Plus `@arxmint/react` for React components.
**Why:** Stripe.js lets any website add payments in 10 lines. ArxMint needs the same.
**Implementation:**
- `@arxmint/js` (vanilla JS, <15KB gzipped):
  ```
  const arx = ArxMint('pk_live_...')
  const session = await arx.checkout({ amount: 500, description: 'Coffee' })
  session.on('completed', (payment) => { /* fulfill order */ })
  session.mount('#payment-container')  // renders QR + status
  ```
- `@arxmint/react`:
  ```
  <ArxMintProvider publishableKey="pk_live_...">
    <PayButton amount={500} onSuccess={handlePaid} />
  </ArxMintProvider>
  ```
- Components: `<PayButton>`, `<CheckoutForm>`, `<PaymentStatus>`, `<QRPayment>`
- Handles: challenge creation, QR rendering, real-time status polling, success/error callbacks
- Framework-agnostic core with React wrapper (Vue/Svelte wrappers post-launch)

### 5.6 — LNURL-pay + Lightning Address

**What:** Give every merchant a Lightning Address (`merchant@mint.arxmint.com`) and LNURL-pay endpoint. Scannable QR codes for physical POS.
**Why:** Lightning Address is the most interoperable Bitcoin payment standard. Any Lightning wallet can scan and pay. This is table stakes for physical merchants.
**Implementation:**
- `/.well-known/lnurlp/:username` — LNURL-pay endpoint per merchant
- Resolves to: create L402 challenge, return BOLT11 invoice, webhook on settlement
- Static QR code for each merchant (print-and-display for POS)
- Optional: NFC tag provisioning via existing Numo integration (tap-to-pay)
- Lightning Address format: `merchantname@mint.arxmint.com`

### 5.7 — Merchant Dashboard

**What:** A dedicated merchant portal at `/merchant/dashboard` with payments, settlements, analytics, and API key management.
**Why:** After Stripe onboarding, you get a dashboard. Currently ArxMint merchants get a `cashu://` URI and nothing else.
**Implementation:**
- **Payments tab:** Filterable transaction list (status, date, amount, type). CSV/JSON export. Real-time feed via SSE.
- **Settlements tab:** Settlement history, pending payouts, settlement frequency config (instant / daily / weekly)
- **Analytics tab:** Revenue over time, payment method breakdown, average transaction size, conversion rate (challenges created vs. completed)
- **Settings tab:** API key management (view, rotate, revoke), webhook endpoints (add, test, view delivery logs), business info updates, payment method preferences
- **Developer tab:** Integration guide, code snippets (curl, JS, React), test mode toggle, webhook event log

### 5.8 — Settlement Automation

**What:** Auto-complete the settlement loop. When a Lightning invoice is paid, automatically mint Cashu ecash and push to the merchant's wallet. Configurable payout schedules.
**Why:** Currently settlement creates an invoice but nothing happens when it's paid. The loop is broken.
**Implementation:**
- LND invoice subscription: watch for settled invoices, match to pending settlements
- On settlement: mint Cashu ecash via `wallet.createMintQuoteBolt11()` → `wallet.mintProofs()`
- Push to merchant's Cashu address or hold in platform balance
- Payout schedule options: instant (every settlement), daily batch, weekly batch
- `POST /api/v1/merchant/settings/payout` — configure schedule
- Settlement fee: configurable per-community (default 0% for pilot, community operator sets fee)

### 5.9 — Public Merchant Directory + Discovery

**What:** Unauthenticated merchant directory at `/merchants`. Searchable by category, location, payment methods. Each merchant gets a public profile page.
**Why:** Customers need to find merchants. A directory also proves the network effect to new merchants considering joining.
**Implementation:**
- `GET /api/v1/directory?category=&location=&paymentMethod=` — public, no auth required
- Merchant profile pages: `/merchants/:slug` — business info, accepted payment methods, QR code, Lightning Address
- Geo-search: store lat/lng coordinates (optional), enable radius queries
- Category filter: food, retail, services, digital, hospitality, health, other
- Map view (optional): merchant pins on OpenStreetMap embed

### 5.10 — Idempotency + Production Hardening

**What:** Idempotency keys on all payment creation endpoints. Request deduplication. Comprehensive error codes.
**Why:** Network retries and webhook redelivery mean merchants will send duplicate requests. Without idempotency, they get double-charged customers or duplicate records.
**Implementation:**
- `Idempotency-Key` header on `POST /api/v1/merchant/checkout` and `POST /api/v1/merchant/payments`
- 24-hour key retention. Same key = return cached response, no new challenge created.
- Structured error codes: `payment_expired`, `invalid_token`, `duplicate_request`, `rate_limited`, `merchant_not_found`, `insufficient_amount`
- Request logging: every API call logged with request ID, merchant ID, endpoint, status code, latency
- SDK retry logic: automatic retry with exponential backoff for 5xx errors, no retry for 4xx

### Implementation Snapshot — Phase 5

| Item | Status | Builds On |
|---|---|---|
| 5.1 Merchant API keys | Planned | Phase A auth + 1.4 merchant onboarding |
| 5.2 Webhook system | Planned | Phase B payment SDK |
| 5.3 Hosted checkout | Planned | Phase B L402 + NUT-24 |
| 5.4 Payment status API | Planned | Phase B payment SDK |
| 5.5 Client-side SDK | Planned | 5.1 + 5.3 + 5.4 |
| 5.6 LNURL-pay / Lightning Address | Planned | Phase B L402 + LND wiring |
| 5.7 Merchant dashboard | Planned | 5.1 + 5.4 + Phase A DB |
| 5.8 Settlement automation | Planned | Phase B settlement + LND invoice subscription |
| 5.9 Public directory | Planned | 1.4 merchant onboarding + Phase A DB |
| 5.10 Idempotency + hardening | Planned | 5.1 + 5.2 + Phase E hardening |

### Phase 5 Priority Order

Build in this order — each step unlocks the next level of merchant adoption:

```
5.1 API Keys ──→ 5.4 Status API ──→ 5.2 Webhooks ──→ 5.8 Settlement Auto
     │                                    │
     └──→ 5.3 Hosted Checkout ───────────→ 5.5 Client SDK
     │
     └──→ 5.6 LNURL-pay
     │
     └──→ 5.7 Merchant Dashboard (parallel, grows with each feature)
     │
     └──→ 5.9 Public Directory (independent, can ship early)

5.10 Idempotency: weave in throughout, harden before mainnet launch
```

### What This Makes Possible

| Merchant Type | Integration | Time to First Payment |
|---|---|---|
| Coffee shop (no code) | Payment link QR printed at register | 5 minutes |
| Online store (low code) | Hosted checkout link in "Buy" button | 15 minutes |
| SaaS app (full code) | Client SDK + webhooks for fulfillment | 1 hour |
| AI agent (programmatic) | L402 API keys + auto-settlement | 30 minutes |
| Marketplace | Server SDK + settlement splitting | 2 hours |

### Stripe vs. ArxMint — Target Comparison

| | Stripe | ArxMint (Phase 5) |
|---|---|---|
| **Transaction fee** | 2.9% + $0.30 | ~0.1% (Lightning routing) or 0% (ecash) |
| **Settlement time** | T+2 days | Instant (ecash) or next block (Lightning) |
| **Customer KYC** | Card + billing address required | None — bearer ecash is anonymous |
| **Merchant KYC** | Full identity verification | Nostr pubkey (optional: business info) |
| **Data sold** | Yes (Stripe Radar, analytics) | Never — no payment data leaves the system |
| **Chargebacks** | Yes (merchant liability) | Impossible — ecash is bearer, Lightning is final |
| **Open source** | No | Yes — MIT license |
| **Self-hostable** | No | Yes — full Docker stack |
| **Censorship** | Platform risk (Stripe can freeze funds) | Sovereign — merchant controls their own mint |

---

## Dependency Graph

```
═══════════════════════════════════════════════════════════════
  PRODUCTION PATH (Phases A–E → Gate → Pilot)
═══════════════════════════════════════════════════════════════

Phase A (Foundation)      Phase B (Payments)      Phase C (Infrastructure)
  DB + Vault + Auth    →   L402 + NUT-24 + SDK  →  Caddy + Monitoring + Backup
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 │
                          Phase D (E2E Testing)
                                 │
                          Phase E (Production Hardening)
                           Rate limit, health checks,
                           value caps, CI/CD, testnet
                                 │
                    ╔════════════════════════════╗
                    ║  PRODUCTION READINESS GATE ║
                    ║  (all checkboxes pass)     ║
                    ╚════════════════════════════╝
                                 │
                          Phase 4: Citadel
                     Longmont pilot + grants

═══════════════════════════════════════════════════════════════
  FEATURE PATH (Phases 0–3, parallel to production path)
═══════════════════════════════════════════════════════════════

Phase 0 (Fortify) ─── must complete before ──→ Phase 1 (Keystone)
                                                    │
                                                    ├── 1.1 NUT-24 ──→ 2.8 Gateway Bridge
                                                    ├── 1.2 Spend Router ──→ 2.2 Ark SDK
                                                    ├── 1.3 BCE Metrics ──→ 4.1 Pilot
                                                    ├── 1.4 Merchant Flow ──→ 4.1 Pilot
                                                    └── 1.6 Agent Wallets ──→ 3.2 Programmable eCash

Phase 2 (Spire) ─────────────────────────────→ Phase 3 (Aether)
    │                                               │
    ├── 2.1 Fedimint v0.10.0 ✅                     ├── 3.1 Governance (post-pilot)
    ├── 2.2 Ark SDK ──→ 2.6 SP Infra                ├── 3.2 STARK ──→ depends on upstream
    ├── 2.3 CDK (deferred) ──→ 2.7 Monitoring       └── 3.3 ZK Reissuance ──→ depends on upstream
    ├── 2.4 Coco ──→ 4.5 Multi-City
    └── 2.5 NUT-26 ──→ 3.6 Numo NFC

Phase 4 (Citadel) depends on:
    - Production Readiness Gate passed (Phases A–E)
    - Phase 0 complete (security)
    - Phase 1.3 + 1.4 (metrics + merchants)
    - Phase 2.7 (monitoring config)
    NOT blocked by: Phase 3 (advanced features are post-pilot)

Phase 5 (Bazaar) depends on:
    - Phase 4 running (real merchant validation)
    - Phase A (DB + auth)
    - Phase B (payment SDK)
    - Phase E (production hardening)
    NOT blocked by: Phase 3 (Aether) or Phase 4 completion
    CAN start in parallel with Phase 4 once pilot is live
```

---

## Research → Roadmap Traceability

Every roadmap item traces back to at least one research document.
**Original research:** Docs 1–7 cross-referenced in `docs/research-crossref.md`
**Deep research (Feb 2026):** 6 studies in `docs/research/` that locked architecture decisions

| Roadmap Item | Doc 1 | Doc 2 | Doc 3 | Doc 4 | Doc 5 | Doc 6 | Doc 7 | Research # |
|---|---|---|---|---|---|---|---|---|
| 0.1 Keyset ID validation | | | | | | X | | #3, #5 |
| 0.2 SP status fix | X | | | | X | | | |
| 0.3 Security tiers | | X | | | | | | |
| 0.4 Remote signer | | X | | | | | | |
| 1.1 NUT-24 paywalls | | | X | | | | | #3 |
| 1.2 Spend router | | | | X | | | | |
| 1.3 BCE metrics | | | | | | | X | |
| 1.4 Merchant onboarding | | | | | | | X | |
| 1.5 Macaroon bakery | | X | | | | | | |
| 1.6 Agent wallets | X | | | | | X | | #5 |
| 1.7 G-Bot integration | X | | | | | | | |
| 2.1 Fedimint v0.10.0 ✅ | X | | | | | | | |
| 2.2 Ark SDK | | | | X | | | | |
| 2.3 CDK upgrade | | | X | | | | | #3 |
| 2.4 Coco multi-mint | | | X | | | | | |
| 2.5 NUT-26 QR/NFC | | | X | | | | | |
| 2.6 SP infrastructure | | | | | X | | | |
| 2.7 Monitoring | | | X | | | | X | #2 |
| 2.8 Gateway bridge | | X | | | | | | |
| 3.1 Governance | | | | | | | X | |
| 3.2 STARK eCash | | | | | | X | | |
| 3.3 ZK reissuance | | | | | | X | | |
| 3.4 HW wallet (BIP392) | | | | | X | | | |
| 3.5 Advanced Cashu | | | X | | | | | |
| 3.6 Numo NFC | | | X | | | | | |
| 4.1 Longmont pilot | | | | | | | X | #2, #6 |
| 4.2 Grant applications | | | | | | | X | #6 |
| 4.3 Reporting dashboard | | | | | | | X | |
| 4.4 Replication playbook | | | | | | | X | |
| 4.5 Multi-city | | | X | | | | X | |
| **Foundation: Database** | | | | | | | | #1 |
| **Foundation: Proof vault** | | | | | | | | #1, #5 |
| **Foundation: Auth** | | | | | | | | #4 |
| **Infrastructure: VPS deploy** | | | | | | | | #2 |
| **Infrastructure: Caddy proxy** | | | | | | | | #2 |
| **Infrastructure: Backup automation** | | | | | | | | #2 |
| **Hardening: Rate limiting** | | | | | | | | — |
| **Hardening: Health checks** | | | | | | | | — |
| **Hardening: Value caps** | | | | | | | | — |
| **Hardening: CI/CD** | | | | | | | | — |
| **Hardening: Incident response** | | | | | | | | #2 |

---

## Version Naming

Following the positioning doc's Tartarian builder theme:

| Phase | Codename | Meaning |
|---|---|---|
| Phase 0 | **Fortify** | Harden the foundation before building higher |
| Phase 1 | **Keystone** | The critical stone that holds the arch together |
| Phase 2 | **Spire** | The structure rises — full stack visible |
| Phase 3 | **Aether** | Advanced capabilities, reaching higher |
| Phase 5 | **Bazaar** | The open marketplace — sovereign commerce for all |
| Phase 4 | **Citadel** | The complete sovereign fortress — deployed and defended |



