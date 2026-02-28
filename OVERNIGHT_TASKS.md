# ArxMint — Overnight Tasks

**Project:** ArxMint (AI-first Bitcoin circular economy builder)
**Stack:** Next.js 15, React 19, TypeScript, Tailwind, Cashu, Fedimint, Lightning
**Spec:** `docs/spec.md` | **Roadmap:** `docs/roadmap.md` | **Agent rules:** `CLAUDE.md`
**Status:** Beautiful prototype — no persistence, no auth, no real payment validation
**Research:** `docs/research/` — 5 deep research docs inform all architecture decisions below
**E2E Testing:** `docs/E2E_TESTING.md` — 8 layers, 22 test flows, regtest Docker stack

---

## Summary

| Status | Count |
|--------|-------|
| Pending | 0 |
| In Progress | 0 |
| Completed | 39 |
| Total | 39 |

---

## Key Research Decisions (Agents: follow these)

| Decision | Answer |
|----------|--------|
| **Database** | Self-hosted Postgres in Docker Compose. Internal network only, no public port. |
| **Cashu proofs** | Client-side ONLY (IndexedDB + WebCrypto). NEVER store proofs in server DB. Non-custodial. |
| **Auth** | Auth.js + Nostr NIP-98 primary + email magic link fallback. L402 for agents only. Step-up reauth for spend ops. |
| **Mint** | Nutshell for pilot. CDK migration later (two-mint Lightning swap). |
| **Reverse proxy** | Caddy (automatic HTTPS). |
| **Network** | All services on internal Docker network. Only Caddy exposes 80/443. |

---

## Pending

### P0 — Foundation (Must Complete First)

These are production blockers. Everything is in-memory right now — page refresh loses all data. Nothing else matters until these ship.

- [x] [P0] Add Prisma ORM + PostgreSQL schema (ID: 1)
  - Install `prisma` and `@prisma/client`
  - Schema: `Community`, `Merchant`, `Transaction`, `User`, `Account`, `Session`, `VerificationToken`
  - **CRITICAL: NO Cashu proof tables.** Proofs are client-side only (Research #1). Add code comment: "Cashu proofs NEVER touch this DB. See lib/cashu-vault.ts"
  - Include Auth.js standard tables: `Account`, `Session`, `VerificationToken` (Research #4)
  - Postgres service in `docker-compose.yml`: `postgres:15-alpine`, internal network only, no public port, healthcheck via `pg_isready`
  - Use `DATABASE_URL` env var, add to `.env.example`
  - **Files:** new `prisma/schema.prisma`, update `docker-compose.yml`, update `package.json`, update `.env.example`

- [x] [P0] Build client-side encrypted Cashu vault (ID: 2)
  - Research #1 & #5: Proofs are bearer instruments. Store client-side with encryption, not in server DB.
  - **Storage:** IndexedDB (not localStorage — quota limits, OWASP guidance). Request `navigator.storage.persist()`.
  - **Architecture:** Repository abstraction layer (ProofRepo, CounterRepo, OperationRepo) → IndexedDB adapter. Follow Coco's storage-agnostic pattern.
  - **Data model:** 5 collections: Proofs (encrypted `secret`+`C`), Counters (atomic with proof writes), Operations (saga log for crash recovery), Payment Requests (NUT-26), Proof State Metadata (unencrypted index for queries)
  - **Encryption:** AES-256-GCM via Web Crypto API. Key derivation: Argon2id (RFC 9106) from user passphrase. Master key in-memory only while unlocked. Auto-lock on idle.
  - **Counter persistence:** MUST be atomic with proof writes (single IndexedDB transaction) — secret reuse vulnerability if not. Hook into cashu-ts v3 counter events.
  - **Recovery:** NUT-13 seed phrase (12-word BIP39 mnemonic) as primary recovery. Per-mint restore via NUT-09 `/v1/restore` in batches of 100. Encrypted snapshot export (TokenV4 per mint) as secondary.
  - **Crash recovery:** Saga pattern — mark proofs pending before operations, check NUT-07 `/v1/checkstate` on restart, reconcile.
  - **Agent wallets:** Separate namespace + key material. In-memory default. Minimal operation log with TTL for crash recovery only.
  - **Nostr:** Do NOT derive storage key from NIP-07 (doesn't expose private keys). Use passphrase or mnemonic-derived key. NUT-27 for mint list backup via Nostr.
  - **UI:** Passphrase setup, seed phrase backup screen, "Export Wallet" (encrypted JSON), "Restore Wallet" (import + decrypt)
  - Hydrate Zustand store from vault on mount
  - **Files:** new `lib/cashu-vault.ts` (VaultManager: unlock/lock lifecycle), new `lib/crypto.ts` (AES-GCM + Argon2id), new `lib/proof-repo.ts` (repository abstraction), update `lib/store.ts`

- [x] [P0] Persist community configs to database (ID: 3)
  - After community generation, save config to Postgres via Prisma
  - Load saved communities on dashboard
  - Replace in-memory Zustand-only storage for communities
  - **Files:** `lib/community-generator.ts`, `app/create/page.tsx`, `app/dashboard/page.tsx`
  - **Depends on:** ID 1

- [x] [P0] Persist merchant listings to database (ID: 4)
  - Merchant onboarding form currently collects data but discards it
  - Save to `Merchant` table, load in community directory
  - **Files:** `components/merchant-onboard.tsx`, `app/community/[id]/page.tsx`
  - **Depends on:** ID 1

- [x] [P0] Add transaction history / ledger (ID: 5)
  - Record every send/receive/swap in `Transaction` table
  - Store metadata only (type, amount, backend, timestamp, status) — NOT raw proofs
  - Show transaction list in wallet panel
  - **Files:** `components/wallet-panel.tsx`, new API route `app/api/transactions/route.ts`
  - **Depends on:** ID 1

- [x] [P0] Add user authentication via Auth.js + Nostr NIP-98 (ID: 6)
  - Research #4: Use Auth.js as session framework, not custom in-memory store
  - Create Auth.js config: `app/api/auth/[...nextauth]/route.ts`
  - Two providers: Nostr Credentials (wraps existing `lib/nostr-auth.ts` NIP-98 verification) + Email (magic link for merchants)
  - Prisma adapter for session persistence (uses Auth.js tables from ID 1)
  - Cookie hardening: HttpOnly, Secure, SameSite=Strict
  - Create `middleware.ts` to gate `/wallet`, `/merchant`, `/admin` routes via `auth()`
  - Risk tiers: browse = session cookie sufficient; spend/export = step-up reauth (5-min TTL)
  - Add `NEXTAUTH_SECRET` and `NEXTAUTH_URL` to `.env.example`
  - **Files:** `lib/nostr-auth.ts` (keep verification, add Auth.js adapter), new `app/api/auth/[...nextauth]/route.ts`, new `middleware.ts`, update `.env.example`
  - **Depends on:** ID 1

### P1 — Core Integrations

These make the product actually work end-to-end with real Bitcoin infrastructure.

- [x] [P1] Wire L402 endpoint to real LND invoice generation (ID: 7)
  - Current `app/api/l402/route.ts` is demo-only (accepts any token)
  - Connect to LND via gRPC, generate real invoices
  - Validate macaroons server-side on retry
  - Test: pay invoice → get preimage → access granted
  - **Files:** `app/api/l402/route.ts`, `lib/lightning-agent.ts`

- [x] [P1] Wire NUT-24 ecash paywall to validate tokens against real mint (ID: 8)
  - `app/api/agent/route.ts` dev path still serves unauthenticated responses
  - Verify Cashu tokens against connected mint before granting access
  - Reject invalid/spent tokens
  - Note: Research #3 confirmed NUT-24 has no mint implementations yet — this is ArxMint's own validation
  - **Files:** `app/api/agent/route.ts`, `lib/cashu-paywall.ts`

- [x] [P1] Add Prometheus scrape config + Grafana dashboard JSON (ID: 9)
  - docker-compose.yml already has Prometheus + Grafana services
  - Need `docker/prometheus.yml` with scrape targets for LND, Cashu, Fedimint
  - Need `docker/grafana/dashboards/` with default dashboard JSON (federation uptime, mint balance, LN channels)
  - Need `docker/grafana/datasources/` with Prometheus datasource config
  - Research #2: Set scrape interval to 30s (not 10s) for pilot. Add alerts for disk >70%, memory/swap, container restarts, LND health, federation quorum
  - **Files:** new `docker/prometheus.yml`, new `docker/grafana/` configs

- [x] [P1] Connect BCE metrics to real transaction data (ID: 10)
  - `lib/bce-metrics.ts` uses `getDemoBCEMetrics()` with hardcoded values
  - Wire to actual transaction records from DB
  - Compute real: merchant count, active spenders, spend velocity, success rate
  - **Files:** `lib/bce-metrics.ts`, `app/dashboard/page.tsx`
  - **Depends on:** ID 1, ID 5

- [x] [P1] Complete remote signer integration for Lightning agents (ID: 11)
  - Config + validation shipped but transport not wired end-to-end
  - Agent payment path should use `litd` remote signer
  - Agent runtime must never hold signing key material
  - **Files:** `lib/lightning-agent.ts`

- [x] [P1] Add Caddy reverse proxy to Docker stack (ID: 22)
  - Research #2: Caddy for automatic HTTPS (Let's Encrypt + ZeroSSL)
  - Add Caddy service to `docker-compose.yml` on host network (ports 80, 443)
  - Route to internal services: web app (3000), Grafana (3001)
  - Keep LND gRPC/REST, Postgres, Prometheus on internal network only
  - Aperture placement: TLS termination at Caddy edge, then L402 gating on specific routes
  - Add `DOMAIN` and `CADDY_EMAIL` to `.env.example`
  - **Files:** update `docker-compose.yml`, new `docker/Caddyfile`, update `.env.example`

- [x] [P1] Add Postgres to Docker Compose with internal network isolation (ID: 23)
  - Research #1 & #2: Postgres inside Docker network, no public port exposed
  - Create `internal` network in docker-compose.yml; bind Postgres, LND gRPC/REST, Prometheus to it
  - Only Caddy exposes public ports (80/443)
  - LND p2p (9735) stays public for Lightning connectivity
  - Fedimint guardian ports (8173) stay internal (single-host pilot)
  - Add `POSTGRES_PASSWORD` to `.env.example`
  - **Files:** update `docker-compose.yml`, update `.env.example`

- [x] [P1] Add backup automation scripts (ID: 24)
  - Research #2: State safety hierarchy: channel.backup > wallet seed > guardian keys > Postgres > monitoring
  - `scripts/backup_postgres.sh`: Daily pg_dump with 7-day retention, compress, sync to backup destination
  - `scripts/watch_channel_backup.sh`: Watch LND `channel.backup` file and sync on change (inotify/polling)
  - Add to docker-compose as sidecar or document crontab setup
  - **Files:** new `scripts/backup_postgres.sh`, new `scripts/watch_channel_backup.sh`

### P1 — Teneo Marketplace Payment Layer

ArxMint is the payment network for Teneo Marketplace (`C:\code\teneo-marketplace`, github.com/Traviseric/teneo-marketplace). The marketplace is where creators sell books, courses, funnels, and digital products. ArxMint handles the money — L402 paywalls for instant content access, Cashu ecash for zero-fee micropayments, Fedimint for community-owned custody, and the spend router to pick the best payment path automatically.

Together they form a complete open-source creator economy: marketplace = storefront, arxmint = payment rails. Same Nostr identity across both. Can't be deplatformed because both the store and the payment layer are decentralized. When Stripe bans a creator, arxmint takes over — no downtime, no lost revenue.

- [x] [P1] Package L402 + NUT-24 + spend router as importable payment SDK (ID: 18)
  - The marketplace needs to import arxmint's payment primitives without running the full Next.js app
  - Extract `lib/cashu-paywall.ts`, `lib/spend-router.ts`, and the L402 logic from `app/api/l402/route.ts` into a standalone `lib/payment-sdk.ts` with a clean API: `createL402Challenge()`, `verifyL402Token()`, `createCashuChallenge()`, `verifyCashuPayment()`, `routePayment()`
  - Export types: `PaymentChallenge`, `PaymentResult`, `SpendRoute`
  - This SDK is what teneo-marketplace imports — the marketplace calls `routePayment(amount, privacy)` and gets back the right payment flow without knowing the internals
  - **Files:** new `lib/payment-sdk.ts`, export from `lib/index.ts`

- [x] [P1] Add HTTP API mode for marketplace integration (ID: 19)
  - Teneo Marketplace is Express.js (not Next.js) — it can't import arxmint's TypeScript modules directly
  - Add REST endpoints that wrap the payment SDK: `POST /api/payment/create-challenge` (returns L402 or Cashu challenge based on amount), `POST /api/payment/verify` (verifies L402 preimage or Cashu token), `GET /api/payment/status/:id` (check payment status)
  - Marketplace calls these endpoints instead of importing code — arxmint runs as a payment service alongside the marketplace
  - Include CORS config for marketplace domains
  - **Files:** new `app/api/payment/route.ts`, new `app/api/payment/verify/route.ts`, new `app/api/payment/status/[id]/route.ts`

- [x] [P1] Federation ecash settlement for marketplace revenue sharing (ID: 20)
  - Teneo Marketplace has a federation network where nodes share 10-20% revenue on referral sales
  - Currently revenue shares are just database entries with no actual money movement
  - Build a settlement endpoint: when a referral sale completes, mint Cashu ecash for the referral fee amount and send it to the referring node's Fedimint guardian
  - Use `lib/cashu-sdk.ts` to mint proofs and `lib/fedimint-sdk.ts` to deposit into the federation
  - **Files:** new `app/api/settlement/route.ts`, `lib/cashu-sdk.ts`, `lib/fedimint-sdk.ts`
  - **Depends on:** ID 8 (real mint validation)

- [x] [P1] Shared Nostr auth verification (ID: 21)
  - Both arxmint and teneo-marketplace use NIP-07 + NIP-98 for auth
  - Research #4: Auth.js with Nostr NIP-98 provider. Ensure the Auth.js session can validate sessions initiated by either app
  - A creator logged into teneo-marketplace with their Nostr key should be recognized by arxmint payment endpoints without re-authenticating
  - Document the shared session pattern so both projects stay compatible
  - **Files:** `lib/auth-middleware.ts`, `lib/nostr-auth.ts`
  - **Depends on:** ID 6

### P2 — Testing & Hardening

**Full E2E testing strategy:** `docs/E2E_TESTING.md` — 8 layers, 22 test flows, regtest Docker stack.

- [x] [P2] Set up regtest Docker stack for E2E tests (ID: 12)
  - Create `docker/docker-compose.regtest.yml` override with bitcoind regtest node
  - Create `scripts/wait-for-stack.sh` (health check loop for all services)
  - Create `scripts/fund-regtest.sh` (generate blocks, fund LND)
  - Ensure `npm run setup:regtest` starts full E2E-capable stack
  - **See:** `docs/E2E_TESTING.md` — Regtest Docker Stack section
  - **Files:** new `docker/docker-compose.regtest.yml`, new `scripts/wait-for-stack.sh`, new `scripts/fund-regtest.sh`, update `package.json`

- [x] [P2] Add E2E tests: payment flows (L402 + NUT-24 + spend router) (ID: 13)
  - Test full L402 flow: 402 challenge → pay LND invoice → preimage → access granted
  - Test NUT-24 flow: Cashu token payment → access, double-spend → rejection
  - Test spend router path selection: amount/privacy/availability → correct backend
  - Test transaction ledger: payments create metadata records (no raw proofs in DB)
  - **See:** `docs/E2E_TESTING.md` — Layer 3 tests (3.1, 3.2, 3.3, 3.4)
  - **Files:** new `tests/e2e/l402-payment.test.ts`, `tests/e2e/nut24-payment.test.ts`, `tests/e2e/spend-router.test.ts`, `tests/e2e/transaction-ledger.test.ts`
  - **Depends on:** ID 7, ID 8, ID 12

- [x] [P2] Add E2E tests: vault lifecycle + recovery (ID: 14)
  - Test vault create → lock → unlock → read proofs (correct/wrong passphrase)
  - Test NUT-13 seed phrase backup → destroy vault → restore from mint via NUT-09
  - Test crash recovery: simulate crash mid-payment → saga pattern reconciliation → no money lost
  - Test concurrent vault access: two tabs don't corrupt data
  - **See:** `docs/E2E_TESTING.md` — Layer 4 tests (4.1, 4.2, 4.3, 4.4)
  - **Files:** new `tests/e2e/vault-lifecycle.test.ts`, `tests/e2e/vault-seed-restore.test.ts`, `tests/e2e/vault-crash-recovery.test.ts`
  - **Depends on:** ID 2, ID 12

- [x] [P2] Add E2E tests: auth flows + failure modes (ID: 15)
  - Test Nostr NIP-98 login → session → protected route access/denial
  - Test email magic link → session → access
  - Test step-up reauth: stale session → 403 on spend ops → re-auth → 200
  - Test failure modes: double-spend, expired macaroon, invalid keyset, keyset collision
  - **See:** `docs/E2E_TESTING.md` — Layer 2 (2.1–2.3) + Layer 8 (8.1–8.4)
  - **Files:** new `tests/e2e/auth-nostr.test.ts`, `tests/e2e/auth-email.test.ts`, `tests/e2e/auth-step-up.test.ts`, `tests/e2e/keyset-safety.test.ts`
  - **Depends on:** ID 6, ID 12

- [x] [P2] Write DEPLOY.md — step-by-step VPS deployment guide (ID: 16)
  - Research #2: Vultr 16GB/6-core target. Caddy for HTTPS.
  - Document: VPS provisioning (SSH hardening, UFW rules), Docker install, env setup, `docker compose up`, domain/SSL via Caddy, monitoring access via SSH tunnel
  - Include: testnet vs mainnet config, single-host federation trust caveat, firewall rules (22/80/443/9735 only)
  - Include: Nutshell pilot hardening checklist (Research #3): Postgres backend, version pinning, upgrade procedure
  - **Files:** new `DEPLOY.md`

- [x] [P2] Add CDK mint option alongside Nutshell in root compose (ID: 17)
  - Research #3: CDK for production (after ALPHA drops). Migration is two-mint Lightning swap.
  - Add `docker-compose.cdk.yml` override with separate mint URL + port
  - Document when to use CDK vs Nutshell and migration procedure
  - **Files:** new `docker/docker-compose.cdk.yml`, update `README.md`

- [x] [P2] Add multi-mint keyset safety gates (ID: 25)
  - Research #3 & #5: Jan 2026 disclosure — malicious mint can poison wallets via keyset ID collisions
  - Compute/verify keyset IDs per NUT-02 (don't trust mint-provided IDs)
  - Reject keyset ID collisions with previously known keysets
  - Prefer Keyset ID V2 (`01...` with HMAC-SHA256); warn on legacy `00...` IDs
  - Prevent auto-add/auto-swap for received tokens from unknown mints
  - Add info tooltip to wallet panel: "Avoid auto-trusting unknown mints. Hold small balances."
  - **Files:** `components/wallet-panel.tsx`, `lib/cashu-sdk.ts`, `lib/cashu-vault.ts`

- [x] [P2] Add NUT-13 seed phrase backup + restore UI (ID: 26)
  - Research #5: Primary money-loss prevention. 12-word BIP39 mnemonic.
  - Seed phrase generation during wallet setup
  - Backup screen with "write down these words" UX
  - Restore flow: enter 12 words → per-mint restore via NUT-09 `/v1/restore` in batches of 100
  - Check mint NUT-09 support before showing restore option
  - **Files:** new components for seed backup/restore, `lib/cashu-vault.ts`
  - **Depends on:** ID 2

### P1 — Production Hardening (Phase E)

These must be done BEFORE the Longmont pilot accepts real money. See `docs/roadmap.md` — Production Readiness Gate.

- [x] [P1] Add health check endpoint + startup env validation (ID: 27)
  - `GET /api/health` returns JSON: `{ status, db, mint, lnd, uptime }`
  - Check DB connection (`prisma.$queryRaw('SELECT 1')`)
  - Check Cashu mint reachability (`fetch(CASHU_MINT_URL + '/v1/info')`)
  - Check LND connectivity (gRPC `getInfo`)
  - Startup validation: fail fast if required env vars missing (`DATABASE_URL`, `NEXTAUTH_SECRET`, `CASHU_PRIVATE_KEY`)
  - Wire into Docker healthcheck for `web` service
  - **Files:** new `app/api/health/route.ts`, update `docker-compose.yml` (web healthcheck), new `lib/env-check.ts`

- [x] [P1] Add rate limiting to API endpoints (ID: 28)
  - Payment endpoints (`/api/l402/*`, `/api/payment/*`, `/api/agent/*`): 10 req/min per IP
  - Auth endpoints (`/api/auth/*`): 5 req/min per IP (brute-force protection)
  - Public endpoints: 60 req/min per IP
  - Return 429 with `Retry-After` header when exceeded
  - Use in-memory rate limiter for pilot (no Redis needed at this scale)
  - **Files:** new `lib/rate-limit.ts`, update `middleware.ts`

- [x] [P1] Add input validation + structured error responses (ID: 29)
  - Validate all user inputs server-side: community names (max length, no HTML), merchant data (required fields, valid categories), payment amounts (positive integers, within value caps)
  - Reject malformed Cashu tokens before passing to SDK (basic format check)
  - API error format: `{ error: string, code: string }` — NEVER return stack traces in production
  - Sanitize any user content rendered in HTML (XSS prevention via Next.js built-in escaping + CSP)
  - **Files:** new `lib/validation.ts`, update API route handlers

- [x] [P1] Add security headers + CSP via middleware (ID: 30)
  - Content-Security-Policy: restrict script sources, no inline scripts (or nonce-based)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: restrict camera, microphone, geolocation
  - Add via Next.js `middleware.ts` (not Caddy — defense in depth)
  - **Files:** update `middleware.ts`, update `next.config.js` (headers)

- [x] [P1] Add structured logging (ID: 31)
  - JSON-formatted logs: `{ timestamp, level, message, requestId, userId?, action? }`
  - Log all payment operations: amount, backend, status (NEVER log proof secrets, C values, or raw tokens)
  - Log auth events: login, logout, reauth, failure (with IP, not password)
  - Log rate limit hits and blocked requests
  - Write to stdout for Docker log aggregation
  - **Files:** new `lib/logger.ts`, update API routes to use logger

- [x] [P1] Add pilot value caps (ID: 32)
  - Maximum wallet balance per user: configurable via env, default 50,000 sats
  - Maximum single transaction: configurable, default 10,000 sats
  - Maximum daily volume per user: configurable, default 100,000 sats
  - Enforce server-side on mint/melt/send operations (not just UI)
  - Display current limits in wallet UI
  - Admin can adjust via env vars without code change
  - **Files:** new `lib/value-caps.ts`, update `app/api/` payment routes, update `components/wallet-panel.tsx`, update `.env.example`

- [x] [P1] Production Dockerfile (multi-stage, non-root) (ID: 33)
  - Multi-stage build: deps stage → build stage → runtime stage
  - Runtime image: `node:22-alpine` (smallest)
  - Run as non-root user (`node` user)
  - Pin base image version (no `:latest`)
  - No devDependencies in production image
  - Add `HEALTHCHECK` instruction pointing to `/api/health`
  - Copy only `package.json`, `node_modules`, `.next/standalone`, `prisma/`
  - **Files:** update `Dockerfile`

- [x] [P2] Add CI/CD pipeline (ID: 34)
  - GitHub Actions workflow: lint → type-check → build → unit tests → E2E tests (regtest Docker)
  - Run on push to `main` and all PRs
  - E2E job: start regtest stack, fund LND, run `tests/e2e/**/*.test.ts`
  - Deploy to testnet VPS on `main` merge (optional, can be manual)
  - Deploy to mainnet only on tagged release (`v*.*.*`)
  - **Files:** new `.github/workflows/ci.yml`, new `.github/workflows/deploy.yml`

- [x] [P2] Write incident response runbook (ID: 35)
  - What to do when: LND goes down, mint stops responding, federation loses quorum, backup fails, disk fills up, payment success rate drops
  - Alert routing: Grafana → email notification
  - Rollback procedure: `docker compose down && docker compose -f ... up -d` with previous image tag
  - Emergency: how to freeze the mint (stop accepting deposits)
  - Contact list: who to call when things break
  - **Files:** new `docs/INCIDENT_RESPONSE.md`

---

## Agent Notes

- **Read `CLAUDE.md` first** — has SDK rules (Fedimint is client-only, LNC-Web is WASM, Cashu v3 API)
- **Read `docs/spec.md`** — canonical product spec with acceptance criteria for all P0/P1 items
- **Read `docs/research/`** — 5 deep research docs inform architecture decisions. Key decisions summarized in table above.
- **CSS conventions:** Use `.sovereign-card`, `.sovereign-btn`, etc. from `globals.css`
- **State:** Zustand via `useSovereignStore` — no prop drilling
- **SDK singletons:** `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`
- **Proof vault:** IndexedDB + AES-256-GCM + Argon2id KDF. Repository abstraction (Coco pattern). NUT-13 seed recovery. Atomic counter persistence. See Research #5.
- **Custody model:** ArxMint is NON-CUSTODIAL. Cashu proofs stored client-side only. Server DB stores metadata only.
- **Run `npm run build` before finishing** — must pass Next.js build
- **Run `npm test` before finishing** — node test runner, not jest
