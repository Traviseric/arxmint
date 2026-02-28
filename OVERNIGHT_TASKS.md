# ArxMint — Overnight Tasks

**Project:** ArxMint (AI-first Bitcoin circular economy builder)
**Stack:** Next.js 15, React 19, TypeScript, Tailwind, Cashu, Fedimint, Lightning
**Spec:** `docs/spec.md` | **Roadmap:** `docs/roadmap.md` | **Agent rules:** `CLAUDE.md`
**Status:** Beautiful prototype — no persistence, no auth, no real payment validation

---

## Summary

| Status | Count |
|--------|-------|
| Pending | 21 |
| In Progress | 0 |
| Completed | 0 |
| Total | 21 |

---

## Pending

### P0 — Foundation (Must Complete First)

These are MVP blockers. Everything is in-memory right now — page refresh loses all data.

- [ ] [P0] Add Prisma ORM + PostgreSQL schema for communities, wallets, merchants, transactions (ID: 1)
  - Install `prisma` and `@prisma/client`
  - Schema: `Community`, `Wallet`, `WalletProof` (Cashu proofs), `Merchant`, `Transaction`, `User`
  - Use `DATABASE_URL` env var, add to `.env.example`
  - Add `npx prisma generate` to build step
  - Generate initial migration
  - **Files:** new `prisma/schema.prisma`, update `package.json`

- [ ] [P0] Add localStorage backup for Cashu proofs as immediate recovery (ID: 2)
  - Before DB is wired, proofs should at least survive page refresh via localStorage
  - Add `saveProofsToLocalStorage()` and `loadProofsFromLocalStorage()` to `lib/cashu-sdk.ts`
  - Hydrate Zustand store from localStorage on mount
  - This is the quick win before full DB persistence
  - **Files:** `lib/cashu-sdk.ts`, `lib/store.ts`

- [ ] [P0] Persist community configs to database (ID: 3)
  - After community generation, save config to Postgres via Prisma
  - Load saved communities on dashboard
  - Replace in-memory Zustand-only storage for communities
  - **Files:** `lib/community-generator.ts`, `app/create/page.tsx`, `app/dashboard/page.tsx`
  - **Depends on:** ID 1

- [ ] [P0] Persist merchant listings to database (ID: 4)
  - Merchant onboarding form currently collects data but discards it
  - Save to `Merchant` table, load in community directory
  - **Files:** `components/merchant-onboard.tsx`, `app/community/[id]/page.tsx`
  - **Depends on:** ID 1

- [ ] [P0] Add transaction history / ledger (ID: 5)
  - Record every send/receive/swap in `Transaction` table
  - Show transaction list in wallet panel
  - Fields: type, amount, backend (cashu/lightning/fedimint), timestamp, status, counterparty
  - **Files:** `components/wallet-panel.tsx`, new API route `app/api/transactions/route.ts`
  - **Depends on:** ID 1

- [ ] [P0] Add user authentication via Nostr login (ID: 6)
  - `lib/nostr-auth.ts` already has scaffolding — wire it to real auth flow
  - Sign event with Nostr key → verify on server → create session
  - Protect API routes with auth middleware
  - Add session cookie or JWT
  - **Files:** `lib/nostr-auth.ts`, `components/nostr-login.tsx`, new `lib/auth-middleware.ts`

### P1 — Core Integrations

These make the product actually work end-to-end with real Bitcoin infrastructure.

- [ ] [P1] Wire L402 endpoint to real LND invoice generation (ID: 7)
  - Current `app/api/l402/route.ts` is demo-only (accepts any token)
  - Connect to LND via gRPC, generate real invoices
  - Validate macaroons server-side on retry
  - Test: pay invoice → get preimage → access granted
  - **Files:** `app/api/l402/route.ts`, `lib/lightning-agent.ts`

- [ ] [P1] Wire NUT-24 ecash paywall to validate tokens against real mint (ID: 8)
  - `app/api/agent/route.ts` dev path still serves unauthenticated responses
  - Verify Cashu tokens against connected mint before granting access
  - Reject invalid/spent tokens
  - **Files:** `app/api/agent/route.ts`, `lib/cashu-paywall.ts`

- [ ] [P1] Add Prometheus scrape config + Grafana dashboard JSON (ID: 9)
  - docker-compose.yml already has Prometheus + Grafana services
  - Need `docker/prometheus.yml` with scrape targets for LND, Cashu, Fedimint
  - Need `docker/grafana/dashboards/` with default dashboard JSON (federation uptime, mint balance, LN channels)
  - Need `docker/grafana/datasources/` with Prometheus datasource config
  - **Files:** new `docker/prometheus.yml`, new `docker/grafana/` configs

- [ ] [P1] Connect BCE metrics to real transaction data (ID: 10)
  - `lib/bce-metrics.ts` uses `getDemoBCEMetrics()` with hardcoded values
  - Wire to actual transaction records from DB
  - Compute real: merchant count, active spenders, spend velocity, success rate
  - **Files:** `lib/bce-metrics.ts`, `app/dashboard/page.tsx`
  - **Depends on:** ID 1, ID 5

- [ ] [P1] Complete remote signer integration for Lightning agents (ID: 11)
  - Config + validation shipped but transport not wired end-to-end
  - Agent payment path should use `litd` remote signer
  - Agent runtime must never hold signing key material
  - **Files:** `lib/lightning-agent.ts`

### P1 — Teneo Marketplace Payment Layer

ArxMint is the payment network for Teneo Marketplace (`C:\code\teneo-marketplace`, github.com/Traviseric/teneo-marketplace). The marketplace is where creators sell books, courses, funnels, and digital products. ArxMint handles the money — L402 paywalls for instant content access, Cashu ecash for zero-fee micropayments, Fedimint for community-owned custody, and the spend router to pick the best payment path automatically.

Together they form a complete open-source creator economy: marketplace = storefront, arxmint = payment rails. Same Nostr identity across both. Can't be deplatformed because both the store and the payment layer are decentralized. When Stripe bans a creator, arxmint takes over — no downtime, no lost revenue.

- [ ] [P1] Package L402 + NUT-24 + spend router as importable payment SDK (ID: 18)
  - The marketplace needs to import arxmint's payment primitives without running the full Next.js app
  - Extract `lib/cashu-paywall.ts`, `lib/spend-router.ts`, and the L402 logic from `app/api/l402/route.ts` into a standalone `lib/payment-sdk.ts` with a clean API: `createL402Challenge()`, `verifyL402Token()`, `createCashuChallenge()`, `verifyCashuPayment()`, `routePayment()`
  - Export types: `PaymentChallenge`, `PaymentResult`, `SpendRoute`
  - This SDK is what teneo-marketplace imports — the marketplace calls `routePayment(amount, privacy)` and gets back the right payment flow without knowing the internals
  - **Files:** new `lib/payment-sdk.ts`, export from `lib/index.ts`

- [ ] [P1] Add HTTP API mode for marketplace integration (ID: 19)
  - Teneo Marketplace is Express.js (not Next.js) — it can't import arxmint's TypeScript modules directly
  - Add REST endpoints that wrap the payment SDK: `POST /api/payment/create-challenge` (returns L402 or Cashu challenge based on amount), `POST /api/payment/verify` (verifies L402 preimage or Cashu token), `GET /api/payment/status/:id` (check payment status)
  - Marketplace calls these endpoints instead of importing code — arxmint runs as a payment service alongside the marketplace
  - Include CORS config for marketplace domains
  - **Files:** new `app/api/payment/route.ts`, new `app/api/payment/verify/route.ts`, new `app/api/payment/status/[id]/route.ts`

- [ ] [P1] Federation ecash settlement for marketplace revenue sharing (ID: 20)
  - Teneo Marketplace has a federation network where nodes share 10-20% revenue on referral sales
  - Currently revenue shares are just database entries with no actual money movement
  - Build a settlement endpoint: when a referral sale completes, mint Cashu ecash for the referral fee amount and send it to the referring node's Fedimint guardian
  - Use `lib/cashu-sdk.ts` to mint proofs and `lib/fedimint-sdk.ts` to deposit into the federation
  - **Files:** new `app/api/settlement/route.ts`, `lib/cashu-sdk.ts`, `lib/fedimint-sdk.ts`
  - **Depends on:** ID 8 (real mint validation)

- [ ] [P1] Shared Nostr auth verification (ID: 21)
  - Both arxmint and teneo-marketplace use NIP-07 + NIP-98 for auth
  - Ensure the auth middleware (`lib/auth-middleware.ts`) can validate sessions initiated by either app
  - A creator logged into teneo-marketplace with their Nostr key should be recognized by arxmint payment endpoints without re-authenticating
  - Document the shared session pattern so both projects stay compatible
  - **Files:** `lib/auth-middleware.ts`, `lib/nostr-auth.ts`
  - **Depends on:** ID 6

### P2 — Testing & Hardening

- [ ] [P2] Add integration tests for Cashu SDK against regtest mint (ID: 12)
  - Current tests are 300 lines across 3 files — not enough for 12K LOC
  - Test: mint proofs, melt proofs, swap across mints, keyset validation with real mint
  - Use Docker regtest setup
  - **Files:** new `tests/cashu-integration.test.ts`

- [ ] [P2] Add integration tests for L402 + NUT-24 auth flows (ID: 13)
  - Test full 402 challenge → pay → retry → access granted flow
  - Test invalid token rejection
  - Test expired macaroon rejection
  - **Files:** new `tests/l402-integration.test.ts`

- [ ] [P2] Add E2E test: prompt → generate config → verify Docker output (ID: 14)
  - Test the core product flow: user enters prompt, system generates valid Docker config
  - Validate generated compose file is syntactically correct
  - Validate service definitions match expected backends
  - **Files:** new `tests/e2e-generation.test.ts`

- [ ] [P2] Add wallet persistence + recovery tests (ID: 15)
  - Test: save proofs to localStorage → refresh → proofs restored
  - Test: save proofs to DB → new session → proofs restored
  - Test: encrypted proof export → import → balances match
  - **Files:** new `tests/wallet-persistence.test.ts`
  - **Depends on:** ID 2

- [ ] [P2] Write DEPLOY.md — step-by-step VPS deployment guide (ID: 16)
  - Dockerfile exists (multi-stage, Node 22-alpine)
  - Document: server requirements, env setup, docker compose up, domain/SSL, monitoring
  - Include regtest vs mainnet config differences
  - **Files:** new `DEPLOY.md`

- [ ] [P2] Add CDK mint option alongside Nutshell in root compose (ID: 17)
  - Generator supports CDK for production but local compose only has Nutshell
  - Add `docker-compose.cdk.yml` override for CDK-based mint
  - Document when to use CDK vs Nutshell
  - **Files:** new `docker/docker-compose.cdk.yml`, update `README.md`

---

## Agent Notes

- **Read `CLAUDE.md` first** — has SDK rules (Fedimint is client-only, LNC-Web is WASM, Cashu v3 API)
- **Read `docs/spec.md`** — canonical product spec with acceptance criteria for all P0/P1 items
- **CSS conventions:** Use `.sovereign-card`, `.sovereign-btn`, etc. from `globals.css`
- **State:** Zustand via `useSovereignStore` — no prop drilling
- **SDK singletons:** `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`
- **Run `npm run build` before finishing** — must pass Next.js build
- **Run `npm test` before finishing** — node test runner, not jest
