# ArxMint â€” Implementation Roadmap

**Version:** 4.6 â€” March 12, 2026
**Informed by:** 7 research documents cross-referenced in `docs/research/research-crossref.md` + 6 deep research studies in `docs/research/` + 11 self-hosting UX studies in `docs/research/Phase5-Bazaar/Self-Hosting-UX/`
**Canonical spec:** `docs/core/spec.md` (all `Spec Â§X` references point here)
**Agent task queue:** `AGENT_TASKS.md` (canonical implementation task queue derived from this roadmap)
**E2E testing:** `docs/testing/e2e-testing.md` (8 layers, 22 test flows)
**Security rollout:** `docs/security/HARDENING_ROLLOUT_PLAN.md` (observe-first hardening with canary enforce)
**Codename convention:** Phase names follow the brand versioning from positioning doc (Keystone â†’ Spire â†’ Aether)
**Production gate:** This roadmap defines a clear Production Readiness Gate between Phase E and Phase 4. No real money until the gate passes.

---

## Roadmap Overview

**Production path** (what must complete before real money):
```
Phase A: Foundation    (DB + vault + auth)              âœ… CODE COMPLETE
Phase B: Payments      (L402 + NUT-24 + SDK)            âœ… CODE COMPLETE
Phase C: Infrastructure (Caddy + monitoring + backup)   âœ… CODE COMPLETE
Phase D: E2E Testing   (regtest stack + 22 test flows)  âœ… CODE COMPLETE
Phase E: Hardening     (rate limit, health, caps, CI)   âœ… CODE COMPLETE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PRODUCTION READINESS GATE â†’ ðŸŸ¡ NUC testnet deployment running (LND syncing, Cashu standing by)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Phase 4: Citadel       (Longmont pilot + grants)        ðŸŸ¡ IN PROGRESS
Phase 5: Bazaar       (Merchant platform â€” decentralized Stripe)  ðŸŸ¡ EARLY PROTOTYPE
Phase 6: Enterprise   (Audit, plugins, compliance, reach)         ðŸ”µ PLANNED
```

**Feature path** (parallel, not blocking production):
```
Phase 0: Fortify     (Security hardening)            âœ… COMPLETE
Phase 1: Keystone    (Core architecture upgrades)    âœ… COMPLETE
Phase 2: Spire       (Full privacy + commerce stack) âœ… COMPLETE
Phase 3: Aether      (Advanced features + scale)     ðŸŸ  POST-PILOT
```

---

## TE-BTC Ecosystem Dependencies

ArxMint is the flagship app, but it depends on â€” and is consumed by â€” sibling projects in `C:\code\te-btc`. Agents working on ArxMint must understand what these projects provide, what state they're in, and when ArxMint should block on or integrate with them.

### Ecosystem Map

```
C:\code\te-btc\
â”œâ”€â”€ arxmint/              â† YOU ARE HERE (Next.js app, payment rails, merchant platform)
â”œâ”€â”€ cashu-l402/           â† Standalone L402 + NUT-24 library (PRODUCTION READY)
â”œâ”€â”€ cashu-mint/           â† TypeScript Cashu mint, NUT-00 through NUT-07 (PHASE 1 COMPLETE)
â”œâ”€â”€ agent-wallet/         â† Agent-native Cashu wallet (SPEC ONLY, no code yet)
â”œâ”€â”€ multi-mint-router/    â† Cross-mint payment router, MCP server (SPEC ONLY, deferred)
â”œâ”€â”€ integrity-anchor/     â† OpenTimestamps anchoring library (SPEC ONLY, Track B)
â””â”€â”€ internal/             â† Grant apps, strategies, research docs (not code)
```

### Project Status & ArxMint Integration Points

| Project | Status | Tests | ArxMint Integration | When to Build |
|---------|--------|-------|---------------------|---------------|
| **cashu-l402** | **Production ready** | 265/265 âœ… | Replace `lib/cashu-paywall.ts` + L402 client code with `@te-btc/cashu-l402` import. Offline P2PK+DLEQ verification, settlement queue, spend router all extracted. | **NOW** â€” publish to npm, swap into ArxMint |
| **cashu-mint** | Phase 1 complete (59% feature gate) | 33 unit âœ… + 22 skipped (need DB) | ArxMint currently uses Nutshell as its Cashu mint in Docker. `cashu-mint` replaces Nutshell when it hits 90% feature gate. ArxMint's `lib/cashu-sdk.ts` client code doesn't change â€” only the Docker service swaps. | **NOW** â€” finish P1 gaps (LND fee extraction, NUT-08, keyset rotation API, integration tests) |
| **agent-wallet** | Spec complete, no code | â€” | ArxMint's `lib/cashu-sdk.ts` has ephemeral agent wallet code inline. `agent-wallet` extracts this into a proper package with budget enforcement, policy engine, NIP-60/61 backup, proof pool management. ArxMint imports `@te-btc/agent-wallet` once Phase 1 ships. | **NEXT** â€” unblocked, can start in parallel with cashu-mint |
| **multi-mint-router** | Spec complete, no code | â€” | Enables cross-community commerce (Phase 4.5 multi-city federation). ArxMint's spend router delegates to the multi-mint-router when multiple mints are available. Deployed as MCP server. | **DEFERRED** â€” trigger: 2+ community mints live |
| **integrity-anchor** | Spec complete, no code | â€” | Track B (defense/compliance). Independent from ArxMint payment flows. Provides OTS-anchored audit trails for SBOM, AI model provenance, compliance. Not on ArxMint's critical path. | **INDEPENDENT** â€” can start anytime, no ArxMint dependency |

### External Project: OpenBazaar.ai (`C:\code\openbazaar-ai`)

**What:** Open-source marketplace builder (Express.js + vanilla frontend). Replaces ClickFunnels/Gumroad/Teachable. Dual-payment: Stripe + ArxMint crypto.

**Current state (March 2026):** Broadly implemented (42 routes, 51 services, 517 passing tests), but **production proof incomplete**. Phase 0 gate requires: one real Stripe purchase, one real POD purchase, Supabase production path validation, auth/account flow completion, email delivery proof. None of these are done yet.

**ArxMint â†” OpenBazaar.ai integration status:**

| Integration Point | Status | Files |
|-------------------|--------|-------|
| Catalog fetch (`/api/storefront/catalog`) | **Wired** â€” ArxMint `/bazaar` page fetches product catalog from OpenBazaar.ai | `app/bazaar/page.tsx` â†’ `openbazaar.ai/api/storefront/catalog` |
| Payment redirect | **Wired** â€” OpenBazaar.ai `arxmintProvider.js` redirects to `arxmint.com/pay/{merchantId}` | `openbazaar-ai/marketplace/backend/services/arxmintProvider.js` |
| Fulfillment webhook | **Wired** â€” ArxMint POSTs HMAC-signed payload to OpenBazaar.ai on payment completion | `app/api/checkout/webhook/route.ts` â†’ `openbazaar.ai/api/storefront/fulfill` |
| HMAC signature verification | **Wired** â€” Both sides verify `X-ArxMint-Signature` headers | Shared `ARXMINT_WEBHOOK_SECRET` env var |
| L402 invoice creation | **STUB** â€” `arxmintService.js` returns `NOT_IMPLEMENTED` | Needs `@arxmint/js` SDK (Phase 5.5) |
| L402 payment verification | **STUB** â€” same | Needs `@arxmint/js` SDK |
| Cashu token acceptance | **STUB** â€” same | Needs `@te-btc/cashu-l402` integration |
| Printful/Lulu fulfillment | **Code exists** â€” provider services written, not production-tested | `openbazaar-ai/marketplace/backend/services/printfulFulfillmentProvider.js` |

**What OpenBazaar.ai needs before ArxMint Bazaar goes live:**
1. Pass Phase 0 gate (one real Stripe + one real POD purchase)
2. Validate Supabase production path end-to-end
3. Finish auth/account flow so buyers can track orders
4. Test ArxMint fulfillment webhook with a real testnet payment
5. Replace `arxmintService.js` stubs with `@arxmint/js` SDK calls once SDK ships

### Build Order Across Ecosystem

```
DONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  [x] cashu-l402 Phase 1-2 (265 tests, offline P2PK+DLEQ)
  [x] ArxMint Phases A-E + 0-2 (code complete)
  [x] OpenBazaar.ai test baseline (517 tests green)

NOW (PARALLEL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  [ ] cashu-l402 â†’ npm publish + swap into ArxMint
  [ ] cashu-mint â†’ finish P1 gaps (LND fee, NUT-08, integration tests)
  [ ] ArxMint â†’ first testnet payment on NUC (LND syncing)
  [ ] OpenBazaar.ai â†’ Phase 0 gate (real Stripe + POD purchase)

NEXT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  [ ] agent-wallet Phase 1 (scaffold + core wallet + budget engine)
  [ ] cashu-mint Phase 2 (NUT-08, NUT-10/11/14, rate limiting)
  [ ] ArxMint Phase 4 full pilot (30 merchants, mainnet)
  [ ] OpenBazaar.ai â†’ ArxMint fulfillment webhook proof

LATER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  [ ] multi-mint-router (trigger: 2+ live community mints)
  [ ] cashu-mint Phase 3-4 (programmable eCash, agent-wallet integration)
  [ ] ArxMint Phase 5 full (merchant self-hosted nodes)
  [ ] ArxMint Phase 6 (enterprise audit, plugins, compliance)
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
| 1.1 NUT-24 dual paywall | Complete | `lib/cashu-paywall.ts`, `app/api/agent/route.ts` â€” token validation wired; requires live mint for end-to-end verification |
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
| 4.x production/grant rollout | Partial | Grant applications in `C:\code\te-btc\internal\arxmint-internal\grants\`, KPI framework at `docs/operations/pilot-kpis.md`, deployment docs in `docs/`; merchant directory live at arxmint.com/merchants with Glacier + Teneo, 13 pipeline merchants, Nostr admin auth, public signup, and TE NUC testnet deployment running |
| 5.x merchant platform (Bazaar) | Partial | Repo now contains merchant API keys, webhook engines, checkout/status flows, dashboard shell, wizard/config generation, LNURL, load tests, packaging folders, and update/backup primitives. Remaining work is contract alignment, env wiring, and end-to-end merchant-node verification |
| 4.6 developer portal & social proof | Partial | Docs site, quickstart, case-study/social-proof assets, and SEO pages are landed; content expansion and tighter integration remain |
| 6.x enterprise polish | Partial | WooCommerce + Zapier scaffolds, compliance kit docs, and webhook subscription APIs are shipped in repo; external audit and platform publishing/distribution remain |
| **Identity alias graph** | Complete | `lib/identity.ts` (link, resolve, unlink, getAllAliases), 3 API routes, `identity_aliases` table migrated. Generic primitives - namespaces defined by callers, not ArxMint. |
| **Identity: auto-link on checkout** | Planned | When user pays via L402/Cashu with cross-auth JWT, auto-link `nostr_{pubkey}` <-> `teneo-auth_{userId}` |
| **Identity: OpenAPI agent scopes** | Planned | Add `x-agent-scope`, `x-agent-safe`, `x-auth-method` to identity endpoints for agentic CLI |
| **Identity: unlink route** | Planned | `DELETE /api/identity/unlink` - lib function exists (`unlinkIdentity`), route not wired |
| **@te-btc/cashu-l402** | Complete | 265 tests, L402 server/client + NUT-24 paywall + offline P2PK+DLEQ + settlement queue + spend router. Ready for npm publish + ArxMint swap. `C:\code\te-btc\cashu-l402` |
| **@te-btc/cashu-mint** | Partial | NUT-00..07 implemented, 33 unit tests passing. Gaps: LND fee extraction, NUT-08 advertising, keyset rotation API, LND integration testing. 59% feature gate (needs 90%). `C:\code\te-btc\cashu-mint` |
| **@te-btc/agent-wallet** | Planned | Full spec + architecture written. No code yet. Phase 1: core wallet + budget enforcement + storage adapters. `C:\code\te-btc\agent-wallet` |
| **@te-btc/multi-mint-router** | Planned | Full spec + 47-citation research doc. No code yet. Deferred until 2+ community mints live. `C:\code\te-btc\multi-mint-router` |
| **OpenBazaar.ai** | Partial | 517 tests green, 42 routes, 51 services. Catalog/redirect/webhook wired to ArxMint. Phase 0 gate: needs real Stripe purchase, real POD purchase, Supabase proof, auth flow. `C:\code\openbazaar-ai` |

---

## Execution Update (March 12, 2026)

ArxMint is farther ahead in code than this roadmap previously implied. The TE-BTC ecosystem is also materializing â€” `cashu-l402` is production-ready (265 tests), `cashu-mint` has core NUTs implemented, and OpenBazaar.ai has 517 passing tests with the ArxMint integration wired.

The correct execution stance now is:

- Do not rebuild Phase 5 surfaces from scratch.
- Treat most Bazaar work as code-landed but not yet fully consolidated or verified.
- **Prioritize ecosystem integration over new ArxMint features:**
  - Publish `@te-btc/cashu-l402` to npm and swap into ArxMint (replaces inline code)
  - Finish `cashu-mint` Phase 1 gaps (LND fee extraction, NUT-08, integration tests)
  - Start `agent-wallet` Phase 1 (spec is complete, code scaffold ready)
- Focus ArxMint work on alignment, promotion, and verification:
  - Complete first testnet payment on NUC (LND syncing â€” this unblocks everything)
  - Unify checkout/status/package contracts
  - Finish the real merchant init/export/provision path
  - Replace remaining merchant stubs or explicitly defer them
  - Run end-to-end testnet verification on the existing merchant-node flow
- **OpenBazaar.ai must pass its Phase 0 gate** before ArxMint Bazaar can go live with real products.

Agents should read the Phase 5 snapshot below as:

- `Complete` = shipped and directly reusable
- `Partial` = shipped in repo, but still needs route alignment, env wiring, or end-to-end verification
- `Prototype` = genuine scaffolding or upstream-blocked work

---

## Known Gaps (Code Written != Verified Working)

Every roadmap item above has code in the repo. But **code written is not code verified**.
To honestly mark something "done" requires real-world verification:
connect to a real mint, make a real payment, see real metrics.

### ~~Critical Gaps~~ â†’ Resolved (Phase A Complete)

All five previously-critical persistence and auth gaps are now code-complete. Live verification still requires a testnet VPS deployment.

| ~~Gap~~ | Resolution | Files |
|---------|------------|-------|
| ~~No database~~ | âœ… Supabase (`@supabase/supabase-js`) for production (Vercel). Prisma schema retained for Docker self-hosted path. `merchant_pledges` table live. | `lib/supabase.ts`, `app/api/pledge/route.ts`, `prisma/schema.prisma` |
| ~~No user auth~~ | âœ… Nostr NIP-98 login + HMAC-SHA256 session tokens. L402 for agents. Note: Edge Runtime middleware removed (crashed serverless functions due to WASM webpack config); route protection via per-route auth checks. | `lib/auth-middleware.ts`, `app/login/page.tsx`, `app/api/auth/route.ts` |
| ~~No wallet recovery~~ | âœ… IndexedDB encrypted vault (AES-256-GCM + PBKDF2-SHA256, 600K iterations, OWASP 2023). NUT-13 seed phrase backup + NUT-09 restore UI. | `lib/cashu-vault.ts`, `lib/crypto.ts`, `lib/proof-repo.ts` |
| ~~No merchant backend~~ | âœ… Merchant pledge directory live at `/merchants`. Public signup form â†’ Supabase `merchant_pledges` table. Glacier Ice Cream as seed merchant. | `app/merchants/page.tsx`, `components/merchant-signup-form.tsx`, `app/api/pledge/route.ts` |
| ~~No transaction history~~ | âœ… Transaction metadata (type, amount, backend, timestamp â€” no raw proofs) persisted to `Transaction` table. | `app/api/transactions/route.ts`, `lib/store.ts` |

### Integration Gaps â€” Status Update

| Item | Status | Notes |
|------|--------|-------|
| **L402 invoice generation** | âœ… Wired | `app/api/l402/route.ts` generates real BOLT-11 via LND gRPC; HMAC macaroon validation; challenges persisted to DB |
| **NUT-24 paywall** | âœ… Wired | `app/api/agent/route.ts` validates Cashu tokens against mint; double-spend rejection; skip-verify guard removed |
| **Remote signer transport** | âœ… Complete | `litd` remote signer integration complete in `lib/lightning-agent.ts` |
| **CDK vs Nutshell** | Intentional: Nutshell | Nutshell for pilot (stable). CDK when it drops "ALPHA" â€” two-mint Lightning swap migration, not in-place |
| **Monitoring config** | âœ… Complete | `docker/prometheus.yml` + `docker/grafana/datasources/` + `docker/grafana/dashboards/` created |
| **Gateway bridge** | âœ… Complete | Real LND payment + preimage extraction wired in `lib/fedimint-sdk.ts` |
| **BCE metrics** | âœ… Wired | Dashboard connected to real transaction DB records via `app/api/bce-metrics/route.ts` |
| **Reverse proxy** | âœ… Complete | Caddy service in `docker/docker-compose.caddy.yml`; automatic HTTPS; internal network routing |
| **Backup automation** | âœ… Complete | `scripts/backup.sh` (Postgres dump, 7-day retention) + `scripts/lnd-backup.sh` (channel.backup watch) |
| **Keyset collision safety** | âœ… Complete | NUT-02 ID computation, collision detection, V2 ID preference in `lib/cashu-sdk.ts` |
| **Ark SDK** | ðŸš« BLOCKED | `lib/ark-sdk.ts` is stub. Waiting on `@arkade-os/sdk` upstream release. UI correctly shows "coming soon." |
| **CoinJoin / PayJoin** | ðŸš« NOT IMPLEMENTED | UI correctly shows "coming soon" via `supportedBy: "not-yet-implemented"`. No protocol integration. |
| **Silent Payments scanning** | ðŸš« BLOCKED | Address generation works (Cashu); receiving requires federation module (not upstream) |
| **Agent compute / data** | âš ï¸ DEMO | Stubs return placeholder responses. Marked `demo: true` in API. Real dispatch on roadmap. |
| **Grant applications** | âœ… Drafted | OpenSats, HRF, Spiral, FBCE drafts at `C:\code\te-btc\internal\arxmint-internal\grants\`. Need real pilot data to submit. |
| **Programmable eCash (3.2)** | ðŸš« BLOCKED | Depends on upstream Cashu NUT-XX adoption |
| **ZK reissuance (3.3)** | ðŸš« BLOCKED | Depends on upstream Cashu ZK proof support |
| **HW wallet BIP392 (3.4)** | ðŸš« BLOCKED | Requires physical hardware for testing |

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
- [ ] **4.2 TE Code ecosystem merchants**: Turn all 20 internal tools into real ArxMint merchants. Each gets a Lightning checkout, processes a real payment, then lists on arxmint.com/merchants. Master playbook: `.claude/MERCHANT_MONETIZATION.md`. Individual plans: `<project>/docs/MERCHANT_PLAN.md`. Drip 3-4 merchants/week onto the directory.

---

## Architecture Decisions (Locked by Research)

Six deep research studies in `docs/research/` + 11 self-hosting UX studies in `docs/research/Phase5-Bazaar/Self-Hosting-UX/` resolved all previously open architecture questions. These decisions are final for the pilot phase:

| Decision | Answer | Research Source |
|----------|--------|----------------|
| **Application database** | **Vercel deployment:** Supabase (`@supabase/supabase-js`) â€” no binary engine, works on serverless. **Self-hosted deployment:** PostgreSQL 15 in Docker Compose (Prisma schema available). Supabase instance: `ncddvxglmnnfagyyupeu`. | `docs/research/1-Database & Persistence Strategy.md` |
| **Cashu proof custody** | **Non-custodial.** Proofs stored client-side only in encrypted IndexedDB vault (AES-256-GCM). Server DB stores transaction metadata, NEVER raw proofs. | `docs/research/1-Database & Persistence Strategy.md` |
| **Proof vault architecture** | Repository abstraction (ProofRepo, CounterRepo, OperationRepo) â†’ IndexedDB adapter. Counter persistence must be atomic with proof writes. NUT-13 seed phrase as primary recovery. Saga pattern for crash recovery. Agent wallets: separate namespace, in-memory default. | `docs/research/5-Cashu Proof Persistence & Recovery.md` |
| **Encryption** | AES-256-GCM via Web Crypto API. Key derivation: PBKDF2-SHA256 (600K iterations, OWASP 2023) from user passphrase. Master key in-memory only while unlocked. Auto-lock on idle. | `docs/research/5-Cashu Proof Persistence & Recovery.md` |
| **Authentication** | Auth.js as session framework. Two providers: Nostr NIP-98 (primary) + Email magic link (merchant fallback). Session persistence via Supabase (Vercel) or Prisma adapter (self-hosted). Step-up reauth for wallet operations (5-min TTL). L402 for agents only â€” separate track from human auth. Note: Edge Runtime middleware removed â€” auth checks are per-route. | `docs/research/4-Auth Strategy.md` |
| **VPS hosting** | Vultr 16GB/6-core ($80/mo). Alternative: DigitalOcean 8GB ($48/mo). Hetzner needs written ToS approval for node hosting. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Reverse proxy** | Caddy (automatic HTTPS via Let's Encrypt + ZeroSSL). Not nginx, not Traefik. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Network topology** | All services on internal Docker network. Only Caddy exposes ports 80/443. LND p2p (9735) stays public. Fedimint guardian ports internal (single-host pilot). | `docs/research/2-Pilot VPS & Deployment.md` |
| **Tor vs clearnet** | Hybrid (clearnet + Tor) for stable VPS IPv4. Tor-only if home server or dynamic IP. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Federation trust model** | 3 guardians on 1 machine is OK for engineering pilot. Must message as "single-operator, not trust-distributed." Cap fund values. Plan migration to independent guardians before mainnet. | `docs/research/2-Pilot VPS & Deployment.md` |
| **Production mint** | Nutshell for pilot (reference implementation, battle-tested, already integrated). Migrate to cdk-mintd when it drops "ALPHA" warning (6â€“12 months). Migration is two-mint Lightning swap, not in-place upgrade. | `docs/research/3-CDK vs Nutshell.md` |
| **Grant strategy** | Apply NOW to OpenSats ($75Kâ€“$200K), HRF ($25Kâ€“$100K), Spiral ($50Kâ€“$200K). FBCE after pilot traction. | `docs/research/6-Grant Application Strategy.md` |
| **Phase 5 custody model** | **Strictly non-custodial.** Self-hosted BTCPay Server model. ArxMint provides open-source software + optional non-custodial infrastructure services (BYOC provisioning, managed DNS, signed updates). Merchants run their own nodes and hold their own keys. Payments are peer-to-peer. ArxMint never touches funds, holds seeds, or retains admin macaroons. Hosted custodial model would require federal MSB registration + multi-state licensing + EU MiCA CASP + UK FCA authorization. | `docs/research/Phase5-Bazaar/1-Crypto Payment Infrastructure Legal Analysis.md` |
| **Phase 5 API keys** | Local L402 macaroons scoped to merchant's own node, NOT hosted API keys that trigger remote custodial actions. Merchant holds full cryptographic control. | `docs/research/Phase5-Bazaar/1-Crypto Payment Infrastructure Legal Analysis.md` |
| **Phase 5 checkout** | Self-hosted on merchant's domain. Invoices generated by merchant's own LND node. ArxMint provides the software; merchant runs it. Hosting checkout centrally = money transmission. | `docs/research/Phase5-Bazaar/1-Crypto Payment Infrastructure Legal Analysis.md` |
| **Phase 5 node architecture** | Split-plane: merchant-owned data plane (LND + mint + checkout + dashboard) + ArxMint-managed control plane (provisioning, DNS, updates, health). Control plane is non-custodial â€” can create/destroy infra but cannot move/freeze/redirect funds. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/4-Managed Self-Hosting for ArxMint Phase 5.md` |
| **Phase 5 DNS strategy** | Managed subdomain (`storename.arxmint.cloud`) as default. ArxMint manages the DNS zone; merchant runs the node. Custom domains optional upgrade. DynDNS-style API for dynamic IP nodes. Not custody â€” just publishing a DNS record. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/6-DNS and Domain Friction for Self-Hosted Merchant Nodes.md` |
| **Phase 5 connectivity** | Cloudflare Tunnel as primary (outbound-only, eliminates CG-NAT/firewall/dynamic IP). Caddy direct for static-IP VPS. LAN-only for in-person POS. Tor as privacy backchannel. PaaS (Railway, Render, Fly.io) rejected as too fragile for merchant POS. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/2-Delivering a "Download an App, Start Accepting Bitcoin" Experience.md` |
| **Phase 5 updates** | Appliance update model: tested stack BOM (locked versions, signed manifests), not `docker compose pull`. Patch-track auto-updates for UI during maintenance windows. Consent-required for LND version changes. Automatic rollback on failed health checks. Canary rings: internal â†’ early adopters â†’ stable. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/7-Operational Resilience for ArxMint Merchant Nodes.md` |
| **Phase 5 backups** | Zero-knowledge encrypted: backup payload encrypted locally with seed-derived key before transmission. ArxMint stores encrypted blobs it cannot decrypt. LND SCB must be event-driven (on channel open/close), NOT nightly cron â€” old channel state is toxic. One-click restore: fresh host â†’ enter seed â†’ decrypt â†’ restore. Automated restore rehearsal. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/7-Operational Resilience for ArxMint Merchant Nodes.md` |
| **Phase 5 liquidity** | LSP integration for JIT channel opening. Present as "max instant payment size" with one-tap "increase limit." Turbo channels (zero-conf) for instant onboarding. LND autopilot is secondary; LSP/Pool/Loop is primary liquidity strategy. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/5-Self-Hosting Bitcoin Node UX.md` |
| **Phase 5 LND backend** | Neutrino light client as default (avoids 1-7 day full chain sync). Full node available as optional upgrade. This is the single biggest BTCPay UX lesson. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/8-Competitive UX Benchmarking.md` |
| **Phase 5 revenue model** | BYOC managed operations: $15â€“25/mo subscription covering infra (~$6/mo raw), encrypted backup storage, signed updates, health monitoring, support. Merchant creates cloud account; ArxMint provisions via OAuth/API grant (revocable). | `docs/research/Phase5-Bazaar/Self-Hosting-UX/4-Managed Self-Hosting for ArxMint Phase 5.md` |
| **Phase 5 home node packaging** | Umbrel is fastest target (Docker Compose maps directly to packaging format). StartOS as secondary (better ops UX but different packaging). Citadel low incremental effort from Umbrel package. | `docs/research/Phase5-Bazaar/Self-Hosting-UX/3-Merchant-Grade Self-Hosting Lessons.md` |

---

## Path to Working Product

What's needed to go from "beautiful prototype" to "production system that handles real money."
Research-informed â€” every decision below is locked. See `AGENT_TASKS.md` for the active execution queue aligned to this roadmap.
**E2E verification:** `docs/testing/e2e-testing.md` â€” 8 layers, 22 test flows ensuring the full system works end-to-end.

### Phase A: Foundation â€” Database + Vault + Auth

**Goal:** Users can refresh the page without losing everything.

1. **Database** â€” **Vercel path:** Supabase (`@supabase/supabase-js`) with service role key. Tables created via SQL. **Self-hosted path:** `postgres:15-alpine` in Docker Compose, internal network only. Prisma schema available for self-hosted DDL. **No Cashu proof tables â€” proofs are client-side only.**
2. **Client-side encrypted vault** â€” IndexedDB + AES-256-GCM + PBKDF2-SHA256 (600K iterations, OWASP 2023). Repository abstraction layer (ProofRepo, CounterRepo, OperationRepo). Atomic counter persistence with proof writes. Passphrase setup UI. NUT-13 seed phrase backup + NUT-09 restore flow.
3. **Auth.js + Nostr NIP-98** â€” Auth.js config with Nostr Credentials provider (wraps existing `lib/nostr-auth.ts`) + Email magic link provider. Supabase session adapter (Vercel) or Prisma adapter (self-hosted). HttpOnly/Secure/SameSite cookies. Per-route auth checks for `/wallet`, `/merchant`, `/admin` (Edge Runtime middleware removed â€” WASM webpack config crashes Vercel Edge). Risk-tier step-up reauth (5-min TTL for spend operations).
4. **Persist app data** â€” Community configs, merchant listings, transaction metadata (not proofs) saved to Postgres. Hydrate Zustand from DB on load.

### Phase B: Real Payments â€” L402 + NUT-24 + Payment SDK

**Goal:** Money actually moves. Demo endpoints become real.

1. **Wire L402 to LND** â€” Connect `app/api/l402/route.ts` to real LND via gRPC. Generate real invoices. Validate macaroons server-side.
2. **Wire NUT-24 paywall** â€” Verify Cashu tokens against connected mint in `app/api/agent/route.ts`. Reject invalid/spent tokens.
3. **Payment SDK for Teneo Marketplace** â€” Extract payment primitives into `lib/payment-sdk.ts` with clean API: `createL402Challenge()`, `verifyL402Token()`, `routePayment()`. Add REST endpoints (`/api/payment/*`) for Express.js marketplace integration.
4. **Federation settlement** â€” Mint Cashu ecash for marketplace referral fees, deposit into Fedimint.
5. **Shared Nostr auth** â€” Auth.js sessions recognized by both arxmint and teneo-marketplace.

### Phase C: Production Infrastructure â€” Deploy + Monitor + Backup

**Goal:** The stack runs on a real VPS with HTTPS, monitoring, and backups.

1. **Caddy reverse proxy** â€” Add to compose, automatic HTTPS, route to internal services.
2. **Network hardening** â€” Internal Docker network for all services. Only Caddy exposes 80/443. LND p2p (9735) public. Fedimint guardian ports internal.
3. **Prometheus scrape config + Grafana dashboards** â€” Scrape targets for LND, Cashu, Fedimint at 30s intervals. Alerts for disk >70%, container restarts, LND health, federation quorum.
4. **Backup automation** â€” Daily Postgres dump with 7-day retention. LND channel.backup watch + sync on change. Off-host encrypted storage.
5. **docs/deployment/deploy.md** â€” Step-by-step: Vultr provisioning, SSH hardening, UFW rules, Docker install, env setup, `docker compose up`, Caddy HTTPS, monitoring access. Nutshell hardening checklist.
6. **BCE metrics pipeline** â€” Wire dashboard to real transaction data from DB.

### Phase D: E2E Testing + Hardening

**Goal:** Confidence that real money won't be lost. Full system verification.
**Strategy document:** `docs/testing/e2e-testing.md` â€” 8 layers of verification from prompt generation to crash recovery.

1. **Regtest test stack** â€” `docker-compose.regtest.yml` with bitcoind regtest for deterministic, no-real-money testing. Scripts to boot, fund, and tear down.
2. **Payment flow tests** â€” L402 (402 â†’ pay â†’ preimage â†’ access). NUT-24 (Cashu token â†’ access, double-spend â†’ rejection). Spend router path selection. Transaction ledger metadata (no proofs in DB).
3. **Vault lifecycle tests** â€” Create/lock/unlock, seed phrase backup + NUT-09 restore, crash recovery saga, concurrent access safety.
4. **Auth flow tests** â€” Nostr NIP-98 login â†’ session â†’ protected routes. Email magic link. Step-up reauth for spend operations.
5. **Failure mode tests** â€” Double-spend prevention, expired macaroons, invalid/collision keysets, keyset attacks.
6. **Infrastructure tests** â€” Docker stack health, service dependency resilience, network isolation verification, Prometheus scrape validation, backup/restore cycle.
7. **Multi-mint safety gates** â€” Keyset ID computation per NUT-02. Collision detection. Legacy ID warnings. Block auto-add from unknown mints.
8. **NUT-13 seed phrase UI** â€” Backup screen. Restore flow (enter words â†’ per-mint restore in batches of 100).
9. **CDK migration prep** â€” `docker-compose.cdk.yml` override. Document two-mint swap procedure.
10. **Remote signer** â€” Complete `litd` integration so agent runtime never holds signing keys.

### Phase E: Production Hardening â€” Ship-Ready

**Goal:** The system is safe to run with real money and real users. No silent failures, no open attack surfaces.

1. **Health check endpoints** â€” `GET /api/health` returns service status (DB connected, mint reachable, LND synced). Used by Caddy health checks and monitoring alerts. Fail fast on startup if required env vars missing.
2. **Rate limiting** â€” Rate limit all API endpoints. Payment endpoints: 10 req/min per IP. Auth endpoints: 5 req/min (brute-force protection). Public endpoints: 60 req/min. Use `next-rate-limit` or middleware-based approach.
3. **Input validation + sanitization** â€” Validate all user inputs server-side (community names, merchant data, payment amounts). Reject malformed Cashu tokens before passing to SDK. Sanitize any user content rendered in HTML (XSS prevention).
4. **Error handling** â€” Custom error pages (404, 500). API endpoints return structured error JSON (`{ error: string, code: string }`), never stack traces. Unhandled promise rejections caught and logged.
5. **Structured logging** â€” JSON-formatted logs with timestamp, level, request ID, user ID. Log all payment operations (amount, backend, status â€” never proof secrets). Log auth events (login, logout, reauth, failure). Ship logs to stdout for Docker log aggregation.
6. **Security headers** â€” Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Caddy adds HSTS. Next.js middleware adds CSP.
7. **Dockerfile production audit** â€” Multi-stage build (deps â†’ build â†’ runtime). Run as non-root user. Pin base image versions. No dev dependencies in production image. Health check in Dockerfile.
8. **Database migrations** â€” **Vercel path:** Schema changes via SQL in Supabase dashboard or migration scripts. **Self-hosted path:** Prisma migration strategy: `prisma migrate deploy` on startup (not `prisma db push`). Migration files committed to git. Rollback procedure documented.
9. **Pilot value caps** â€” Maximum wallet balance per user (configurable, default 50,000 sats for pilot). Maximum single transaction amount. Maximum daily transaction volume. Enforced server-side, not just UI. Clearly displayed to users.
10. **Testnet validation** â€” Full deployment on testnet VPS before mainnet. Run all E2E tests against testnet stack. Merchant onboarding dry run with test merchants. Minimum 7 days on testnet with no incidents before mainnet.
11. **CI/CD pipeline** â€” GitHub Actions: lint â†’ build â†’ unit tests â†’ E2E tests (regtest Docker). Deploy to testnet on `main` push. Deploy to mainnet on tagged release only. Deployment requires passing all tests.
12. **Incident response** â€” Runbook: what to do when LND goes down, mint stops responding, federation loses quorum, backup fails, disk fills up. Alert routing: Grafana â†’ email/SMS. Rollback: `docker compose down && docker compose up` with previous image tag.

### Blocked Items (Waiting on Upstream)

- **Ark SDK**: No production SDK available. `lib/ark-sdk.ts` is stub mode. Track `@arkade-os/sdk` release.
- **CDK maturity**: Monitor cdk-mintd for "ALPHA" warning removal. Triggers migration from Nutshell.
- **Programmable eCash (NUT-XX)**: Cashu protocol hasn't adopted spending conditions yet.
- **ZK reissuance**: Requires Cashu protocol support for ZK proofs in token reissuance.
- **CTV+CSFS for Ark**: Requires Bitcoin soft-fork. Track BIP proposals.

---

## Production Readiness Gate

**Everything below must be true before accepting real mainnet funds.** This is the exit criteria for Phases Aâ€“E. Phase 4 (Citadel) begins after this gate passes.
**Live status tracker:** `docs/operations/pilot-readiness-status.md` (current verification results + remaining blockers)

### Data Safety
- [x] Supabase persists merchant pledges (live). Schema ready for communities, transactions, auth sessions.
- [ ] Cashu proofs stored client-side only in encrypted IndexedDB vault (AES-256-GCM)
- [ ] NUT-13 seed phrase backup + NUT-09 restore verified working
- [ ] Crash recovery saga pattern tested â€” no proofs lost after simulated crash
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
- [ ] L402: 402 challenge â†’ pay invoice â†’ preimage â†’ access (E2E verified on regtest)
- [ ] NUT-24: Cashu token â†’ access; double-spend â†’ rejection (E2E verified)
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
- [ ] All E2E tests pass against regtest (`docs/testing/e2e-testing.md`)
- [x] E2E tests run in CI on every push
- [ ] 7+ days on testnet VPS with zero incidents
- [ ] Disaster recovery drill completed (new VPS, restore backups, verify transactions)

### Operations
- [ ] docs/deployment/deploy.md written and followed for testnet deploy
- [x] Incident response runbook exists
- [ ] Rollback procedure documented and tested
- [x] Single-host federation trust statement published (see `docs/operations/trust-statement.md`)
- [x] Mainnet migration plan documented (when to split guardians)

---

## Phase 0: Fortify â€” Security Hardening

**Goal:** Fix all P0 security issues identified by research. No new features until the foundation is safe.
**Research drivers:** Doc 2 (agent security), Doc 5 (SP misrepresentation), Doc 6 (NUT-13 vulnerability)
**Exit gate:** Every item must satisfy `docs/core/spec.md` Â§10 acceptance criteria and required verification.

### 0.1 â€” Cashu Keyset ID Validation (P0)
**Source:** Doc 6 â€” Jan 2026 Cashu vulnerability disclosure
**File:** `lib/cashu-sdk.ts`
**What:** Add keyset ID verification against mint pubkeys. Prevent NUT-13 deterministic secret collisions.
**Why:** Agent wallets that programmatically accept/swap tokens are especially vulnerable. An adversarial mint can exploit keyset ID collisions to steal proofs via `/restore` endpoint.
**Implementation:**
- Verify keyset IDs are correctly derived from mint pubkeys before accepting
- Add anti-collision detection (check for `keyset_id_int` namespace conflicts across known mints)
- Validate restore endpoint responses before trusting them
- Log and alert on any keyset ID anomalies

### 0.2 â€” Fix Silent Payments Status Display (P0)
**Source:** Doc 1, Doc 5
**File:** `lib/privacy-defaults.ts`
**What:** Show honest per-backend SP support status in privacy dashboard.
**Why:** SP for Fedimint peg-outs requires a federation wallet module (server-side), not a client toggle. Current dashboard implies SP works everywhere â€” it doesn't.
**Implementation:**
- Add `supportedBy` field to privacy layer config: `"all" | "cashu-only" | "on-chain-only" | "requires-federation-module"`
- Update privacy dashboard to show per-backend availability
- Update `computePrivacyScore()` to weight by what's actually usable
- Add tooltip: "Silent Payments for Fedimint requires federation-level support (not yet available)"

### 0.3 â€” Lightning Agent Security Tiers (P0)
**Source:** Doc 2 â€” 3-tier security model
**File:** `lib/lightning-agent.ts`
**What:** Implement tiered access control for agent Lightning connections.
**Why:** Agents currently get full LNC access including signing keys. Doc 2 explicitly warns: "Never give agents admin macaroons."
**Implementation:**
- Define three tiers:
  ```
  Tier 1: WATCH_ONLY  â€” getInfo, getBalance, listChannels (default for exploration)
  Tier 2: PAY_ONLY    â€” createInvoice, payInvoice via remote signer (for agent commerce)
  Tier 3: ADMIN       â€” full access, explicit opt-in with warning banner
  ```
- Add `SecurityTier` type to `lib/types.ts`
- Default all agent connections to `WATCH_ONLY`
- Require explicit user confirmation to upgrade to `PAY_ONLY`
- Show red warning if user selects `ADMIN` for an agent

### 0.4 â€” Remote Signer Integration (P0)
**Source:** Doc 2 â€” key isolation
**File:** `lib/lightning-agent.ts`
**What:** Add `litd` remote signer support so agent processes never hold signing keys.
**Why:** Key compromise in an agent process means loss of all channel funds.
**Implementation:**
- Add remote signer connection config to `.env.example`
- Agent payment requests route through remote signer
- Signing keys stay on a separate, hardened process
- Agent process only holds pay-only macaroon

---

## Phase 1: Keystone â€” Core Architecture Upgrades

**Goal:** Upgrade foundations informed by latest research. Agent commerce + merchant + spend routing.
**Research drivers:** Doc 2 (macaroon bakery), Doc 3 (NUT-24), Doc 4 (spend router), Doc 7 (BCE metrics, merchant onboarding)
**Exit gate:** Every item must satisfy `docs/core/spec.md` Â§10 acceptance criteria and required verification.

### 1.1 â€” NUT-24 Ecash Paywalls (P1)
**Source:** Doc 3 â€” Cashu native HTTP 402
**Files:** New `lib/cashu-paywall.ts`, update `app/api/agent/route.ts`
**What:** Accept Cashu ecash tokens as payment for agent services, alongside Lightning L402.
**Why:** Users who already hold ecash shouldn't have to melt to Lightning just to pay for an agent service. NUT-24 is Cashu's native HTTP 402 â€” it's the ecash equivalent of L402.
**Implementation:**
- New middleware: parse `Cashu` auth header (NUT-24 format)
- Verify ecash token against connected mint
- If valid, grant access (same as L402 preimage verification)
- Agent endpoint returns `WWW-Authenticate: Cashu` alongside `L402` challenge
- Client can pay with either method

### 1.2 â€” Spend Router (P1)
**Source:** Doc 4 â€” privacy-aware spend routing pseudocode
**Files:** New `lib/spend-router.ts`, update `components/wallet-panel.tsx`
**What:** Auto-select optimal payment path based on amount, privacy level, and available backends.
**Why:** Users currently manually choose backend. A privacy-aware router makes the best choice automatically.
**Implementation:**
- Route selection logic (from Doc 4 pseudocode):
  ```
  if amount < 10_000 sats AND ecash available â†’ use ecash (best privacy, instant)
  if amount < 100_000 sats AND Lightning available â†’ use Lightning (fast, good privacy)
  if amount < 1_000_000 sats AND Ark available â†’ use Ark VTXOs (high privacy, off-chain)
  else â†’ on-chain with Silent Payments (if supported) or standard Taproot
  ```
- Privacy score weighting: higher privacy paths preferred when multiple options available
- User override: can always manually select a path
- Display routing decision with privacy rating in wallet UI

### 1.3 â€” BCE Maturity Metrics Dashboard (P1)
**Source:** Doc 7 â€” FBCE maturity tiers, KPI frameworks
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

### 1.4 â€” Merchant Onboarding Flow (P1)
**Source:** Doc 7 â€” merchant directory, BCE patterns
**Files:** Update `app/community/[id]/page.tsx`, new `components/merchant-onboard.tsx`
**What:** Replace placeholder "List Your Business" button with actual onboarding workflow.
**Why:** The merchant directory is the visible proof that a circular economy exists. Without real onboarding, it's just a concept.
**Implementation:**
- Multi-step form: business name, category, location, payment methods accepted
- Generate merchant QR code (Cashu NUT-26 or Lightning invoice)
- POS setup guidance (link to Numo for NFC, manual QR for simple)
- Merchant listed in community directory with status badge
- Payment acceptance tracking (feeds BCE metrics)

### 1.5 â€” Macaroon Bakery (P1)
**Source:** Doc 2 â€” scoped credentials for agents
**File:** `lib/lightning-agent.ts`
**What:** Expose `bakeMacaroon()` function that generates role-specific credentials.
**Implementation:**
- Roles: `pay-only`, `invoice-only`, `read-only`, `agent-commerce` (pay + invoice)
- Expiry: configurable TTL per macaroon
- Caveats: amount limits, endpoint restrictions
- Used by agent marketplace to scope each agent's access

### 1.6 â€” Agent Wallet Pattern (P1)
**Source:** Doc 1 (ecash as bearer value), Doc 6 (transaction independence)
**Files:** `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts`
**What:** Add ephemeral/scoped agent wallet mode.
**Why:** Agents shouldn't use persistent localStorage wallets. Doc 6's "transaction independence" paper argues wallets should be stateless â€” no long-lived secrets.
**Implementation:**
- Agent wallets: in-memory only, no localStorage persistence
- Auto-expire after configurable TTL
- Scoped to specific community/mint
- Balance limits enforced by macaroon caveats
- Clean teardown on agent disconnect

### 1.7 â€” G-Bot Integration (P1)
**Source:** Doc 1 â€” Fedimint official federation setup service
**File:** `lib/community-generator.ts`
**What:** Integrate Fedimint's G-Bot API for guided federation bootstrap instead of raw Docker scripting.
**Why:** G-Bot automates guardian coordination, peer discovery, and consensus setup. Our current approach generates Docker configs that require manual coordination.
**Implementation:**
- Check G-Bot API availability
- If available: use G-Bot for federation setup (fewer manual steps)
- If unavailable: fall back to current Docker generation
- Track G-Bot API maturity â€” may not have public API yet

---

## Phase 2: Spire â€” Full Privacy + Commerce Stack

**Goal:** Complete the privacy layer stack and add production infrastructure.
**Research drivers:** Doc 1 (Fedimint v0.10.0), Doc 3 (CDK, Coco, NUT-26), Doc 4 (Ark), Doc 5 (SP infrastructure)

### 2.1 â€” Fedimint v0.10.0 Upgrade âœ…
**Source:** Doc 1
**File:** `docker-compose.yml`
**Status:** Complete. Root `docker-compose.yml` uses `fedimint/fedimintd:v0.10.0` with Iroh transport and ConnectorRegistry.

### 2.2 â€” Ark SDK Integration
**Source:** Doc 4
**Files:** New `lib/ark-sdk.ts`, update `lib/types.ts`, `lib/store.ts`, `docker-compose.yml`
**What:** Add `SovereignArkClient` wrapper around `@arkade-os/sdk`. Add `arkd` to Docker stack. Track Ark VTXOs in wallet balance.
**Implementation:**
- `SovereignArkClient` class (mirrors Fedimint/Cashu client pattern)
- Methods: `connect()`, `createVTXO()`, `spendVTXO()`, `getBalance()`, `bridge()` (Ark â†’ on-chain)
- Add `arkSats` to `WalletBalance` type
- Add `arkd` service to Docker compose
- Wire into spend router (Phase 1.2)
- Privacy maximum preset: Ark â†’ on-chain â†’ eCash mint (hybrid bridge from Doc 4)

### 2.3 â€” CDK Cloud-Native Mint Upgrade (Deferred)
**Source:** Doc 3 â€” CDK replaces Nutshell for production
**File:** `docker-compose.yml`
**Decision (Research #3):** Keep Nutshell for pilot. CDK still has "ALPHA" warning â€” operator docs say "only with amounts you do not mind losing." Migrate to cdk-mintd when maturity warning drops. Migration is two-mint Lightning swap (not in-place). Provide `docker-compose.cdk.yml` override for testing.
**Includes:** Postgres backend, Prometheus metrics, structured logging, Kubernetes deployment profiles.

### 2.4 â€” Multi-Mint Support (Coco)
**Source:** Doc 3 â€” Coco toolkit
**File:** `lib/cashu-sdk.ts`
**What:** Manage balances across multiple Cashu mints. Enable multi-mint payments.
**Why:** Inter-community commerce requires spending tokens across mints. Coco (funded by OpenSats Wave 16) provides this.

### 2.5 â€” NUT-26 Payment Requests + QR/NFC
**Source:** Doc 3
**Files:** `lib/cashu-sdk.ts`, `components/wallet-panel.tsx`
**What:** Generate `cashu:` URI format for QR codes. Support NUT-18 structured payment requests.
**Why:** Merchant POS needs scannable QR codes, not raw base64 tokens.

### 2.6 â€” Silent Payments Infrastructure
**Source:** Doc 5
**Files:** `docker-compose.yml`, new `lib/silent-payments.ts`
**What:** Add `silent-pay-indexer` to Docker stack. Implement SP address parsing + sending for on-chain transactions. Add scan key delegation for mobile.
**Implementation:**
- Docker: add `silent-pay-indexer` service connected to Bitcoin node
- Parse `sp1q` / `tsp1q` addresses in wallet send flow
- Implement scan scheduling with persistence (last scanned height)
- Scan key delegation: scan key on hot device, spend key cold
- Feature flags: `ARXMINT_SP_ENABLED`, `ARXMINT_SP_SCAN_MODE`, `ARXMINT_SP_INDEXER_URL`

### 2.7 â€” Monitoring Stack (Partially Complete)
**Source:** Doc 3 (CDK Prometheus), Doc 7 (operator-grade monitoring)
**File:** `docker-compose.yml`
**Status:** Prometheus + Grafana services added to root compose. Still needed: `docker/prometheus.yml` scrape config, Grafana dashboard JSON, datasource config.
**Decision (Research #2):** Set scrape interval to 30s (not 10s) for pilot. Add alerts for disk >70%, memory/swap, container restarts, LND health, federation quorum, HTTPS renewal failures.
**Dashboards:** Federation uptime, mint balance, LN channel health, payment success rates, ecash circulation.

### 2.8 â€” Fedimint Gateway â†’ L402 Bridge
**Source:** Doc 2
**Files:** `lib/fedimint-sdk.ts`, `lib/lightning-agent.ts`
**What:** Route L402 invoice payments through Fedimint gateway. Users pay agent services with ecash that auto-melts to Lightning.
**Why:** Users holding Fedimint ecash shouldn't need a separate Lightning wallet to pay L402 endpoints.

---

## Phase 3: Aether â€” Advanced Features

**Goal:** Programmable eCash, advanced privacy, community governance.
**Research drivers:** Doc 5 (advanced SP), Doc 6 (STARK conditions, ZK reissuance), Doc 7 (governance)

### 3.1 â€” Guardian Governance Framework
**Source:** Doc 7
**File:** `lib/community-generator.ts`
**What:** Guardian selection criteria, rotation policy, incident response, quorum management, treasury use policy.

### 3.2 â€” Programmable eCash (STARK/Cairo Spending Conditions)
**Source:** Doc 6 â€” NUT-XX
**What:** Conditional ecash tokens (escrow, subscriptions, proof-of-service). Agent pays token that's only spendable when service is proven delivered.
**Status:** Depends on Cashu protocol adoption of NUT-XX. Track upstream.

### 3.3 â€” ZK Verified Reissuance
**Source:** Doc 6 â€” arXiv paper on stateless agent wallets
**What:** Implement audit-log + ZK reissuance pattern for agent wallets. Ephemeral wallets that can circulate and reissue tokens without centralized mediation.

### 3.4 â€” Hardware Wallet Support (BIP392/BIP376)
**Source:** Doc 5
**What:** SP descriptor support and PSBT spending for hardware signing devices.

### 3.5 â€” Advanced Cashu Features
**Source:** Doc 3
**What:** NUT-28 P2BK, background proof state verification, multi-mint atomic swaps.

### 3.6 â€” Numo NFC Merchant Integration
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
   Trigger to promote: unresolved placeholder citations block P0/P1 closure; follow `docs/research/research-citation-policy.md`.

---

## Phase 4: Citadel â€” Pilot Launch + Growth

**Prerequisite:** Production Readiness Gate passed. All Phases Aâ€“E complete.
**Goal:** Launch the Longmont pilot, secure grants, then replicate.
**Research drivers:** Doc 7 (grant templates, BCE patterns, pilot-to-scale)

### 4.0 â€” Pre-Launch (During Phases Aâ€“E)

Grant applications can begin before the pilot is live â€” prototype + roadmap + research are sufficient for first applications.

**Apply NOW (before pilot):**
- **OpenSats General Grant** ($75Kâ€“$200K) â€” HIGHEST priority. Narrative: "developer-experience + deployment infrastructure for ecash + L402." OpenSats Wave 16 explicitly funds Cashu Dev Kit, cashu-ts/Coco, Nutshell, Minibits. Commit to monthly reports â†’ quarterly public writeups.
- **HRF Bitcoin Development Fund** ($25Kâ€“$100K) â€” Year-round intake, quarterly announcements. Narrative: "freedom-tech deployment for vulnerable communities" + threat model.
- **Spiral** ($50Kâ€“$200K) â€” No fixed deadline, email-based. Narrative: "UX/developer-experience improvement for Bitcoin adoption."

**Preparation:** Shared grant dossier at `docs/grant-reporting/grant-dossier.md` (executive summary, technical scope, budget, team bios, open-source licensing, threat model). Grant files and human task tracking moved to `C:\code\te-btc\internal\docs\arxmint\`.

### 4.1 â€” Pilot Deployment

**Source:** Doc 7, Spec Â§8
**What:** Deploy ArxMint for Colorado Bitcoin circular economy pilot.

**Current status (March 2026):**
- Merchant pledge directory LIVE at https://www.arxmint.com/merchants
- 2 live merchants: Glacier Ice Cream (Fort Collins) + Teneo (Boulder)
- 13 ecosystem merchants in pipeline (admin-only visibility, AI logos generated)
- Nostr NIP-98 admin auth live â€” admin sees pipeline merchants when logged in
- Checkout pages live at `/pay/[merchant-id]` with Lightning QR codes
- Merchant badge + artwork kit live at `/badge`
- `/create` now uses a merchant setup wizard beta instead of the old freeform community prompt
- Public signup form accepting new merchant pledges â†’ Supabase
- Vercel + Supabase production infrastructure working
- **Testnet stack deployed on TE NUC** â€” LND syncing, Cashu standing by
- API endpoints verified: `/api/health-check`, `/api/pledge` (GET + POST), `/api/auth`

**Remaining for full pilot:**
1. ~~Deploy Docker stack to hardware~~ âœ… Running on NUC (testnet)
2. Complete first real testnet payment end-to-end on the NUC (LND â†’ checkout â†’ status update)
3. Replace prototype checkout internals with merchant-local payment plumbing (`lib/payment-sdk.ts`, real invoice verification, no demo fallback on pilot path)
4. Activate pipeline merchants as each service processes its first real transaction
5. Finish `/create` wizard so it provisions or exports a real merchant init path instead of ending at beta signup
6. Switch LND from `--bitcoin.testnet` to `--bitcoin.mainnet` in compose
7. Generate production credentials (run `scripts/generate-secrets.sh`)
8. Verify health checks, monitoring, and backup automation
9. Onboard first 5 merchants (soft launch â€” directory already live)
10. Monitor for 7 days â€” check alerts, backups, payment success rate
11. Open to full community (30 merchant target)
12. **BTCMap.org integration** â€” List live ArxMint merchants on BTCMap.org (free global Bitcoin merchant discovery). Add "Find us on BTCMap" link to `/merchants` page. At 20+ live merchants, embed BTCMap widget filtered to ArxMint network. Only build custom map component (react-leaflet + geocoded lat/lng) if merchant density justifies it.

**KPIs (from Doc 7 template):**
- 30 merchants onboarded by month 6
- 300 monthly active spenders by month 6
- 98%+ payment success rate
- 99.5% federation uptime
- 2+ spend events/user/month

### 4.2 â€” Post-Launch: Monitoring + Iteration
**What:** First 90 days of live operation.
- Daily: Check Grafana dashboards, review alerts, verify backups
- Weekly: Review transaction volumes, payment success rates, error logs
- Monthly: KPI report (feeds grant reporting), balance audit, security review
- Fix bugs in production â€” hotfix process: fix â†’ test on regtest â†’ deploy tagged release
- **Merchant support channel:** Stand up a public Discord or Matrix community for merchant support, bug reports, and feature requests. Not paid support staff â€” community-driven with ArxMint team presence. Pin setup guides, FAQ, and troubleshooting docs. This is the indie-scale equivalent of 24/7 support that enterprise teams provide.

### 4.3 â€” Grant Reporting Dashboard
**Source:** Doc 7 â€” OpenSats reporting requirements
**What:** Built-in export from dashboard: monthly progress notes, KPI snapshots, budget tracking.
**Format:** Matches OpenSats cadence (monthly first 3 months, then quarterly).

**Apply AFTER pilot traction (30+ days live):**
- **FBCE Round 3** (1â€“5M sats) â€” Requires Longmont metrics: merchant onboarding, recurring spend, education. Narrative: "circular economy proof-of-work."

### 4.4 â€” Replication Playbook
**Source:** Doc 7 â€” "BCE in a box"
**What:** Publish open-source deployment playbook for other communities.
**Contents:** Infrastructure setup, guardian recruitment guide, merchant onboarding kit, monitoring runbook, governance template, incident response template.

### 4.5 â€” Multi-City Federation
**Source:** Doc 7 â€” pilot-to-scale timeline
**What:** Extend from Longmont to additional cities. Inter-federation commerce via Coco multi-mint.
**Prerequisite:** Guardian distribution plan (split from single host to independent operators).

### 4.6 â€” Developer Portal & Social Proof
**Source:** Enterprise polish gap analysis â€” Stripe-quality docs are free to build and massively boost adoption.
**Goal:** Make ArxMint as easy to evaluate and integrate as Stripe from a documentation and credibility standpoint.

**Developer documentation portal:**
- Deploy hosted docs site via Docusaurus or GitBook at `docs.arxmint.com`
- Integration quickstart guides: "5 minutes from zero to first test payment" for each merchant type (coffee shop, online store, SaaS, AI agent)
- API reference auto-generated from route handlers
- Code samples: curl, JavaScript, React, Python
- Interactive API explorer (test mode against regtest)

**Case studies & social proof:**
- Package Glacier Ice Cream pilot data into a published case study: "How Glacier Saved $X in Fees with ArxMint"
- Template for future merchant case studies (problem â†’ solution â†’ metrics â†’ quote)
- Merchant testimonial collection as part of post-onboarding flow
- "Powered by ArxMint" badge program (already live at `/badge`) â€” track badge embed adoption

**Content pipeline:**
- Blog at `arxmint.com/blog` â€” publish monthly: pilot updates, technical deep dives, merchant spotlights
- SEO-targeted landing pages for key queries: "accept bitcoin payments no fees", "self-hosted payment processor", "BTCPay alternative"
- RSS feed for grant reporting alignment (OpenSats monthly updates double as blog posts)

**Priority:** High â€” low cost, high impact. Can begin during Phase 4 pilot with existing content. Developer portal is the single biggest credibility gap vs. enterprise competitors.

---

## Phase 5: Bazaar â€” Decentralized Merchant Platform

**Codename:** Bazaar â€” the open marketplace where sovereign commerce happens
**Goal:** Make ArxMint as easy to integrate as Stripe â€” but fully self-hosted, non-custodial, and legally protected. Any merchant runs their own payment node. One Docker command, one script tag, done.
**Prerequisite:** Phase 4 pilot running (real merchants, real payments proving the infrastructure works)
**Vision:** A private, open-source, self-hosted Stripe alternative. Merchants keep 100% of every sale. No payment data sold. No middleman. Customers pay directly to the merchant's own node via ecash (Cashu), Lightning, or Fedimint.
**Legal basis:** Research #7 (`docs/research/Phase5-Bazaar/1-Crypto Payment Infrastructure Legal Analysis.md`)

### OpenBazaar.ai Integration â€” Flagship Store

**Strategy doc:** `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md`
**OpenBazaar.ai repo:** `C:\code\openbazaar-ai` (`github.com/Traviseric/openbazaar-ai`)
**OpenBazaar.ai detailed status:** See "TE-BTC Ecosystem Dependencies â†’ External Project: OpenBazaar.ai" section above.

`arxmint.com/bazaar` is a live ArxMint merch store (branded gear: stickers, shirts, hoodies, signs) built with **OpenBazaar.ai** â€” our open-source marketplace builder that replaces Clickfunnels, Gumroad, and Teachable. Payments flow through ArxMint's existing `/pay/` checkout. The bazaar page prominently displays "Powered by OpenBazaar.ai" with a GitHub link, driving downloads of the tool. New OpenBazaar.ai users adopt ArxMint as their payment provider, creating a flywheel: **tool adoption â†’ payment volume â†’ proof of concept â†’ more tool adoption.**

ArxMint owns the payment rails. OpenBazaar.ai owns the marketplace/storefront builder. The bazaar page is where they meet.

**Current integration state (March 2026):**
- Catalog fetch, payment redirect, and fulfillment webhook are **wired and code-complete**
- HMAC signature verification works on both sides
- L402/Cashu deep integration is **stubbed** in OpenBazaar.ai â€” needs `@arxmint/js` SDK
- Printful/Lulu POD provider code exists but is **not production-tested**
- OpenBazaar.ai is at **Phase 0** â€” needs to prove one real Stripe + one real POD purchase before expanding
- **No real payment has flowed through the ArxMint â†” OpenBazaar.ai pipeline yet** â€” this is the critical missing proof

**Bazaar go-live prerequisites:**
1. ArxMint: first testnet payment on NUC (LND must finish syncing)
2. OpenBazaar.ai: pass Phase 0 gate (real Stripe + POD purchase proof)
3. Integration: test one ArxMintâ†’OpenBazaar.ai fulfillment webhook with real testnet payment
4. Products: at least 3 products in OpenBazaar.ai catalog with images + pricing
5. Fulfillment: one real Printful test order placed and shipped

### Why This Phase Exists

Stripe charges 2.9% + $0.30 per transaction. A local merchant doing $10K/month loses ~$320/month to processing fees. ArxMint's ecash and Lightning payments cost fractions of a penny. But the technology advantage means nothing if the developer experience is worse than `<script src="stripe.js">`. Phase 5 closes that gap.

The core payment loop (create challenge â†’ pay â†’ verify) is already production-quality. What's missing is the merchant-facing developer experience: local auth tokens, webhooks, a checkout page, a client SDK, and a dashboard. This is plumbing, not protocol work â€” the hard crypto is done.

### Architecture Decision: Self-Hosted (BTCPay Server Model)

**Decision locked by Research #7.** ArxMint must be strictly non-custodial open-source software.

Research #7 conclusively establishes that a hosted payment platform (where ArxMint receives customer payments and settles to merchants) constitutes money transmission under US federal law (FinCEN), requires multi-state MSB licensing (up to 49 states under MTMA), EU MiCA CASP authorization, and UK FCA registration. The payment processor exemption explicitly does not apply to CVC processors because blockchain networks are not BSA-regulated clearing systems.

Conversely, non-custodial open-source software providers (BTCPay Server model) are protected under:
- **FinCEN:** Unhosted wallet providers are exempt from BSA obligations (FIN-2019-G001)
- **DOJ:** 2025 safe harbor for "software that is truly decentralized and solely automates peer-to-peer transactions" where "a third party does not have custody and control over user assets"
- **EU MiCA:** Article 2 / Recital 83 explicitly exempts "hardware or software providers of non-custodial wallets"
- **UK FCA:** "Technical service provider" exemption (narrow â€” ArxMint must avoid "arranging" transactions)

**The architecture rule:** ArxMint never touches merchant funds. All payments flow peer-to-peer from customer wallet to the merchant's self-hosted node. API keys are local L402 macaroons that authorize actions on the merchant's own infrastructure. ArxMint provides the software; the merchant runs it.

```
HOSTED MODEL (illegal without MSB licensing):
  Customer â†’ ArxMint (receives payment) â†’ Merchant
                â†‘ ArxMint holds custody, even momentarily

SELF-HOSTED MODEL (legally protected):
  Customer â†’ Merchant's own ArxMint node (peer-to-peer)
  ArxMint (the project) = open-source software + optional non-custodial infra services, zero custody
```

### 5.1 â€” Local Auth Tokens + Scoped Macaroons

**What:** On setup, the merchant's self-hosted node generates local L402 macaroon-based auth tokens. `arx_live_...` (full node access) and `arx_pub_...` (client-side, create invoices only). `arx_test_...` for regtest sandbox mode.
**Why:** Without auth tokens, merchants can't programmatically create payments on their own node. This is the single biggest blocker to adoption.
**Why not hosted API keys:** Research #7 establishes that API keys controlling a remote ArxMint server constitute custodial management. Macaroons scoped to the merchant's own node are non-custodial â€” the merchant holds full control.
**Implementation:**
- On `arxmint setup`, generate HMAC-derived macaroon pairs, store hashed in merchant's local DB
- Macaroons encode: node URL, permission scope (read/invoice/pay/admin), expiry
- `arx_pub_` tokens are safe to embed in client-side code (can only create invoices on the merchant's node)
- Key rotation: `arxmint keys rotate` CLI command
- Rate limits enforced locally per token
- Sandbox mode: `arx_test_` prefix routes to local regtest LND + test Cashu mint

### 5.2 â€” Webhook Engine (Local)

**What:** Webhook engine running on the merchant's node. Watches their own LND/Cashu node for invoice settlements, fires HTTP POST events to configured endpoints. Events: `payment.created`, `payment.completed`, `payment.failed`, `payment.expired`.
**Why:** Merchants can't automate fulfillment without knowing when a payment completes. This runs locally â€” ArxMint (the project) never sees the events.
**Implementation:**
- `WebhookEndpoint` in merchant's local DB: `url`, `secret` (HMAC signing key), `events[]`, `active`
- `arxmint webhooks add <url>` â€” register endpoint via CLI
- LND invoice subscription: `subscribeinvoices` gRPC stream watches for settled invoices
- Cashu: poll mint for proof state changes (NUT-07)
- Delivery: POST to configured URL with JSON body + `X-ArxMint-Signature` (HMAC-SHA256)
- Retry: exponential backoff (1s, 5s, 30s, 5m, 30m) â€” 5 attempts max
- `arxmint webhooks log` â€” delivery history for debugging
- SDK helper: `arxmint.webhooks.verify(body, signature, secret)` for merchant-side verification

### 5.3 â€” Self-Hosted Checkout Page

**What:** A payment page served from the merchant's own node at `https://pay.merchant.com/checkout/:id`. Customer sees amount + QR code, pays via Cashu ecash or Lightning directly to the merchant's node, gets redirected to `successUrl`.
**Why:** Most merchants don't want to build a custom payment UI â€” they want a link that collects money. The page runs on the merchant's infrastructure, so ArxMint never touches the funds.
**Why not hosted at arxmint.com:** Research #7 establishes that hosting a checkout page that routes payments through an ArxMint-controlled node constitutes money transmission. The merchant's own domain + node = peer-to-peer.
**Implementation:**
- `POST /api/v1/checkout` (on merchant's node) â€” create session with `amount`, `description`, `successUrl`, `cancelUrl`, `metadata`
- Returns `checkoutUrl` on the merchant's own domain (e.g., `https://pay.merchant.com/checkout/cs_abc123`)
- Invoice generated from merchant's own LND node or Cashu mint â€” ArxMint software creates it, merchant's node signs it
- Checkout page: shows merchant name + amount, renders QR (NUT-26 for Cashu, BOLT11 for Lightning)
- Real-time status via SSE from merchant's node â€” page auto-redirects on payment completion
- Mobile-responsive, dark theme, merchant logo/name from local config
- Payment links: `POST /api/v1/payment-links` â€” reusable URLs for fixed-price items (no expiry)
- Embeddable: `<iframe src="https://pay.merchant.com/checkout/cs_abc123">` for inline checkout
- One-command setup: `arxmint checkout enable` configures the checkout routes on the merchant's existing web server

### 5.4 â€” Payment Status API + Real-Time Updates

**What:** `GET /api/v1/payments/:id` on the merchant's node to poll payment status. SSE endpoint for real-time push. WebSocket for high-frequency POS use.
**Why:** After creating an invoice, the merchant's system needs to know when the customer paid. All data stays on the merchant's own node.
**Implementation:**
- `GET /api/v1/payments/:id` â€” returns `{ id, status, amount, type, createdAt, completedAt, metadata }`
- `GET /api/v1/payments/:id/events` â€” SSE stream, emits `status_changed` events
- `GET /api/v1/payments` â€” list with filters: `status`, `dateRange`, `type`, cursor pagination
- Status enum: `pending` â†’ `completed` | `expired` | `failed`
- For POS: WebSocket at `wss://pay.merchant.com/ws/payments` â€” real-time payment stream
- All endpoints authenticated via local macaroons (5.1)

### 5.5 â€” Client-Side SDK + React Components

**What:** `@arxmint/js` â€” a client-side JavaScript SDK that connects to the merchant's own node. Plus `@arxmint/react` for React components.
**Why:** Stripe.js lets any website add payments in 10 lines. ArxMint needs the same â€” but pointing at the merchant's own infrastructure, not a central server.
**Implementation:**
- `@arxmint/js` (vanilla JS, <15KB gzipped):
  ```
  // Points to the MERCHANT'S node, not arxmint.com
  const arx = ArxMint('arx_pub_...', { endpoint: 'https://pay.merchant.com' })
  const session = await arx.checkout({ amount: 500, description: 'Coffee' })
  session.on('completed', (payment) => { /* fulfill order */ })
  session.mount('#payment-container')  // renders QR + status
  ```
- `@arxmint/react`:
  ```
  <ArxMintProvider publishableKey="arx_pub_..." endpoint="https://pay.merchant.com">
    <PayButton amount={500} onSuccess={handlePaid} />
  </ArxMintProvider>
  ```
- Components: `<PayButton>`, `<CheckoutForm>`, `<PaymentStatus>`, `<QRPayment>`
- Handles: invoice creation on merchant's node, QR rendering, real-time status polling, success/error callbacks
- Framework-agnostic core with React wrapper (Vue/Svelte wrappers post-launch)
- Key difference from Stripe.js: the `endpoint` param points to the merchant's own domain, not a central API

### 5.6 â€” LNURL-pay + Lightning Address

**What:** Give every self-hosted merchant a Lightning Address (`merchant@pay.merchant.com`) and LNURL-pay endpoint. Scannable QR codes for physical POS.
**Why:** Lightning Address is the most interoperable Bitcoin payment standard. Any Lightning wallet can scan and pay. Runs on the merchant's own domain â€” no ArxMint intermediary.
**Implementation:**
- `/.well-known/lnurlp/:username` â€” LNURL-pay endpoint served from merchant's node
- Resolves to: generate BOLT11 invoice from merchant's own LND node
- Static QR code for each merchant (print-and-display for POS)
- Optional: NFC tag provisioning via existing Numo integration (tap-to-pay)
- Lightning Address format: `name@pay.merchant.com` (merchant's own domain)
- Setup: `arxmint lnurl enable --username storename` â€” one command

### 5.7 â€” Merchant Dashboard (Self-Hosted)

**What:** A dedicated merchant portal at `https://pay.merchant.com/dashboard` with payments, analytics, and configuration. Runs on the merchant's own node â€” no data leaves their infrastructure.
**Why:** After setup, merchants need visibility into their payments. Like BTCPay Server's dashboard, but with the ArxMint UX.
**Implementation:**
- **Payments tab:** Filterable transaction list (status, date, amount, type). CSV/JSON export. Real-time feed via SSE from local node.
- **Analytics tab:** Revenue over time, payment method breakdown, average transaction size, conversion rate (invoices created vs. completed)
- **Settings tab:** Auth token management (view, rotate, revoke), webhook endpoints (add, test, view delivery logs), business info, payment method preferences
- **Developer tab:** Integration guide, code snippets (curl, JS, React), test mode toggle, webhook event log
- **Node status:** LND sync status, Cashu mint health, channel capacity, ecash in circulation
- **Health UX (from Self-Hosting-UX research):** Traffic-light model â€” "Accepting payments" (green) / "Degraded" (yellow) / "Action required" (red). Plain-language diagnoses: "payment receiving paused because wallet locked," "storage low," "liquidity low â€” tap to increase limit." Hide Lightning channel internals behind "max instant payment size" and "payment success rate." Staff roles with spend restrictions (manager password preventing outgoing payments). Push notifications on invoice settlement, health degradation, and wallet-unlock-needed after reboot.
- **Wallet unlock after reboot:** Push notification â†’ merchant taps "Unlock" â†’ app sends unlock secret directly to node (never to ArxMint). Preserves non-custodial posture while achieving near-Stripe recovery.
- **Mobile-responsive + PWA:** Dashboard must be fully functional on mobile as a bridge to eventual native React Native remote control app.
- Protected by local auth â€” accessible only with admin macaroon

### 5.8 â€” One-Command Merchant Deploy

**What:** Replace the old "settlement automation" item with the critical self-hosted UX: a three-question wizard (`arxmint merchant init`) that provisions a complete merchant payment node with LND, Cashu mint, checkout page, webhook engine, dashboard, and LNURL-pay â€” all pre-configured. The merchant never sees Docker, SSH, or infrastructure details.
**Why:** The self-hosted model's biggest risk is setup friction. BTCPay Server's one-click deploy (via LunaNode) solved this. ArxMint needs the same. If deployment takes more than 10 minutes, merchants won't adopt.
**Why this replaces settlement automation:** In the self-hosted model, settlement is instant and peer-to-peer â€” the customer pays the merchant's node directly. There's no settlement loop to automate. The hard problem is now deployment, not settlement.
**Research basis:** `docs/research/Phase5-Bazaar/Self-Hosting-UX/` â€” 11 studies covering competitive benchmarking, DNS friction, operational resilience, managed self-hosting models, and merchant-grade UX.

**Core insight from research:** "Eliminate being a sysadmin, not running a server." The merchant experiences an app-like surface while a server runs invisibly underneath.

**5.8a â€” Provisioning Service (Control Plane)**

The `arxmint merchant init` wizard presents only three choices:
1. "Where will it run?" (Cloud recommended / Existing home node / Advanced)
2. "What is your store name?" (used for default hostname)
3. "Online payments or in-person only?" (determines public URL requirement)

Implementation:
- **BYOC model (primary):** Merchant creates cloud account (DigitalOcean, Hetzner, Vultr). ArxMint provisions via OAuth/API grant (revocable). ArxMint does NOT retain SSH keys after bootstrap. Role = deployment orchestrator + software update channel.
- Provisioning API: create VM, install Docker, pull stack BOM, configure Cloudflare Tunnel, assign managed subdomain, run health checks.
- Cloud deploy buttons: DigitalOcean 1-Click, Vultr Marketplace, LunaNode integration (like BTCPay).
- VPS one-liner: `curl -sSL https://get.arxmint.com/merchant | bash` â€” installs Docker, pulls images, runs setup wizard.
- Regtest mode: `arxmint merchant init --regtest` for local development.

**SLA framework (for managed hosting tier):**
- Define uptime commitment for managed hosting subscribers ($15â€“25/mo): 99.5% monthly uptime target.
- Response time SLA: critical issues (node down, payments failing) â€” 24h response. Non-critical â€” 72h response.
- SLA applies to control plane services (provisioning, DNS, updates, health monitoring) only. Data plane uptime is merchant-owned infrastructure â€” ArxMint provides monitoring and alerting, not an uptime guarantee on merchant's VPS.
- Publish SLA terms on `arxmint.com/sla` before managed hosting exits beta.
- SLA violations: service credit (pro-rated month), not cash refund. Standard indie SaaS approach.

**5.8b â€” Managed DNS + Connectivity**

Research finding: DNS is the single biggest friction point for non-technical merchants.

Implementation:
- **Default:** `storename.arxmint.cloud` â€” ArxMint manages the DNS zone; merchant runs the node. Not custody â€” just publishing a DNS record.
- **DynDNS API:** Merchant node periodically discovers its public IP, authenticates to control plane, updates only its own A/AAAA record.
- **Custom domain:** Optional upgrade. Merchant adds CNAME record pointing to their node.
- **Let's Encrypt rate limit awareness:** 50 certs/registered domain/7 days. Caddy falls back to ZeroSSL. Design as a first-class scaling dimension.

Connectivity tiers (from easiest to most sovereign):
1. **Cloudflare Tunnel (default):** Outbound-only. Eliminates inbound ports, CG-NAT, dynamic IP. Auto-SSL. `storename.arxmint.cloud` instantly exposed. Trade-off: Cloudflare sees checkout traffic (acceptable for payment pages; LND gRPC + seeds stay local + encrypted).
2. **Caddy direct:** For VPS with static IP. Auto-HTTPS via Let's Encrypt + ZeroSSL.
3. **LAN-only:** In-person POS. No public DNS. Customer joins WiFi, scans QR, pays.
4. **Tor:** Privacy backchannel. Not default (56-char addresses, latency, requires Tor browser).

PaaS verdict (Railway, Render, Fly.io): **Rejected.** Research confirms PaaS is too fragile for mission-critical merchant POS. TCP port limitations, volume redeployment downtime, and HTTP-only networking are deal-breakers. Dedicated VPS remains mandatory.

**5.8c â€” LSP Liquidity Bootstrap**

Research finding: a freshly deployed merchant node has zero inbound capacity. Without liquidity, the node can't receive payments. This is a day-0 requirement, not a nice-to-have.

Implementation:
- Integrate against `lsp-spec` unified API for interoperability.
- JIT (Just-In-Time) channel opening on first inbound payment when capacity is insufficient.
- Turbo channels (zero-conf) for instant onboarding, with clear risk language displayed.
- Present inbound liquidity as "max instant payment size" with one-tap "increase limit" action.
- LND autopilot is secondary; LSP/Pool/Loop is the primary liquidity strategy.
- Fee disclosure: show `open_channel_fee` to merchant before channel open (Breez SDK pattern).

**5.8d â€” Merchant Stack Composition**

Minimum viable merchant stack (shipped as single versioned unit):
- LND (Neutrino light client â€” no full Bitcoin node on day 0, avoids 1-7 day chain sync that kills BTCPay onboarding)
- Cashu mint (Nutshell for now; CDK when it drops "ALPHA")
- Checkout UI + webhook engine + dashboard + LNURL-pay
- Caddy reverse proxy (or Cloudflare Tunnel)

Hardware baselines:
| Tier | Spec | Monthly Cost |
|------|------|-------------|
| Minimum (cloud) | 2 vCPU, 2GB RAM, 40GB SSD | Hetzner CPX11 ~$5-7/mo |
| Recommended (cloud) | 2 vCPU, 4GB RAM, 80GB SSD | DigitalOcean $12/mo |
| Home node | RPi 5 / 8GB or x86 mini-PC | One-time hardware cost |

**Warning:** 1GB instances will crash during LND graph sync (OOM). RPi 4 (4GB) is marginal.

Full node mode: available as optional upgrade path for merchants wanting maximum verification. Not default.

### 5.9 â€” Public Merchant Directory + Discovery

**What:** Unauthenticated merchant directory. Can be community-hosted or self-hosted. Searchable by category, location, payment methods. Each merchant gets a public profile page.
**Why:** Customers need to find merchants. A directory also proves the network effect. This is informational only â€” no funds flow through it, so it's legally safe to host centrally.
**Legal note:** Research #7 confirms that an informational directory with no payment routing is not money transmission and carries no custody risk. This is the one Phase 5 item that can be centrally hosted.
**Implementation:**
- `GET /api/v1/directory?category=&location=&paymentMethod=` â€” public, no auth required
- Merchant self-registration: `arxmint directory register` â€” pushes business info + node URL to directory
- Merchant profile pages: `/merchants/:slug` â€” business info, accepted payment methods, QR code, Lightning Address (pointing to merchant's own node)
- Geo-search: store lat/lng coordinates (optional), enable radius queries
- Category filter: food, retail, services, digital, hospitality, health, other
- Map view (optional): merchant pins on OpenStreetMap embed
- Federated directory: communities can run their own directory instance; directories can peer and share listings (like Teneo Marketplace federation)

### 5.10 â€” Idempotency + Production Hardening

**What:** Idempotency keys on all payment creation endpoints. Request deduplication. Comprehensive error codes. Security hardening for self-hosted nodes.
**Why:** Network retries and webhook redelivery mean duplicate requests. Self-hosted nodes need to be hardened against the open internet.
**Implementation:**
- `Idempotency-Key` header on `POST /api/v1/checkout` and `POST /api/v1/payments`
- 24-hour key retention. Same key = return cached response, no new invoice created.
- Structured error codes: `payment_expired`, `invalid_token`, `duplicate_request`, `rate_limited`, `insufficient_amount`
- Request logging: every API call logged with request ID, endpoint, status code, latency (stored locally)
- SDK retry logic: automatic retry with exponential backoff for 5xx errors, no retry for 4xx
- Security hardening: Caddy auto-HTTPS, CSP headers, rate limiting, firewall rules generated by setup wizard
- Health check: `GET /api/v1/health` returns node status (LND synced, mint reachable, disk space)

### 5.10b â€” Scale & Load Testing

**Source:** Enterprise polish gap analysis â€” E2E testing (Phase D) covers correctness but not throughput. Enterprise-grade confidence requires knowing the breaking point.
**What:** Load test merchant nodes to establish capacity baselines and identify bottlenecks before mainnet launch.
**Implementation:**
- **Throughput targets:** 100 concurrent checkout sessions per merchant node, 1,000 transactions/day sustained, 10 webhooks/second delivery rate
- **Load test harness:** k6 or Artillery scripts that simulate realistic merchant traffic patterns: checkout creation â†’ payment â†’ webhook delivery â†’ status poll
- **Stress test:** Ramp beyond targets to find breaking point. Document: "Node handles X concurrent sessions before Y degrades"
- **Resource profiling:** CPU/memory/disk usage under load for each hardware tier (minimum, recommended, home node). Update hardware baselines table with real data.
- **Capacity planning guide:** Add to DEPLOY.md â€” "At X transactions/day, expect Y resource usage. Upgrade when Z."
- **Regtest automation:** Load tests run against regtest stack with simulated Lightning payments (no real sats, full payment flow)
- **CI integration:** Run smoke-level load test (10 concurrent sessions) in CI. Full load test as manual pre-release gate.

### 5.11 â€” Merchant Node Lifecycle (Updates + Backups + Restore)

**Research basis:** `docs/research/Phase5-Bazaar/Self-Hosting-UX/7-Operational Resilience for ArxMint Merchant Nodes.md`
**What:** The operational layer that keeps merchant nodes healthy after initial deployment. Three sub-systems: appliance updates, zero-knowledge backups, and one-click restore.
**Why:** Deployment without lifecycle management is a liability. The research shows that BTCPay Server merchants struggle most with updates and disaster recovery, not initial setup.

**5.11a â€” Appliance Update Engine**

"Appliance update model, not `docker compose pull`."

Implementation:
- Ship a tested **stack BOM** (bill of materials) â€” locked set of container images pinned by digest, updated as a unit.
- **Patch-track auto-update (default on):** ArxMint UI/webhook/dashboard patches applied during merchant-defined maintenance windows. No SSH required.
- **Consent-required updates:** LND major/minor version changes, database migrations, network exposure changes. Dashboard shows "update available" with changelog; merchant clicks "apply."
- **Automatic rollback:** If health checks fail within 5 minutes of update, revert to previous stack BOM automatically.
- **Canary rings:** Internal canary â†’ early adopters â†’ stable merchants. Ring assignment configurable per merchant.
- **Signed manifests:** Stack BOMs signed by ArxMint release key. Node validates signature before applying.
- Pin container images by digest for stable channel; separate edge channel for enthusiasts.

**5.11b â€” Zero-Knowledge Encrypted Backups**

Research finding: LND Static Channel Backup must be event-driven (on channel open/close), NOT nightly cron. Old channel state is "toxic" â€” replaying it can trigger penalty mechanisms and lose all channel funds.

Non-negotiable backup targets:
1. **LND SCB:** Event-driven copy on every channel open/close.
2. **Cashu mint database + `MINT_PRIVATE_KEY`:** System of record for token liabilities.
3. **Merchant config:** Webhooks, API tokens, checkout settings, transaction history.
4. **Audit/event logs:** For reconciliation.

Zero-knowledge encryption:
- Backup payload encrypted locally on the VPS using a key derived from merchant's seed phrase (HKDF-SHA256) before transmission.
- ArxMint stores encrypted blobs in cloud bucket. ArxMint **cannot decrypt** â€” preserves non-custodial legal firewall.
- Backup verification: automatic periodic "restore rehearsal" into disposable environment, validating decryptability, checksums, and database integrity. Dashboard shows "backup verified" with last-success timestamp.

**5.11c â€” One-Click Restore**

1. Provision fresh host (via provisioning service or manual).
2. Install ArxMint stack at known-good version.
3. Merchant enters seed phrase.
4. System derives decryption key, fetches encrypted backup from cloud bucket.
5. Restores Cashu mint DB + config + LND via SCB import.
6. Post-restore health checks verify: mint DB consistent, LND channels recovering, config loaded, checkout reachable.

### 5.12 â€” Home Node Packaging (Umbrel + StartOS)

**Research basis:** `docs/research/Phase5-Bazaar/Self-Hosting-UX/3-Merchant-Grade Self-Hosting Lessons.md`
**What:** Package the merchant stack for Umbrel and StartOS app stores. Secondary distribution channel for sovereignty-first node runners.
**Why:** Umbrel has ~100K+ node operators. StartOS has the best ops UX (health checks, backups, config forms). These users already have the hardware and want to add merchant capability.

Implementation:
- **Umbrel (primary target):** Docker Compose maps directly to Umbrel packaging format (`docker-compose.yml` + `umbrel-app.yml` + optional `exports.sh`). Use Umbrel's App Proxy whitelist/blacklist to make checkout public while keeping admin behind authentication.
- **StartOS (secondary):** More structured packaging (NOT Docker Compose native). Must either consolidate into one container or split into dependent services with health checks and config forms.
- **Citadel:** Low incremental effort to port from Umbrel package format.
- **Priority:** Ship after cloud deploy is stable. Home node users are more technical and tolerant of rough edges.

### 5.13 â€” Mobile Merchant Remote Control (Future)

**Research basis:** `docs/research/Phase5-Bazaar/Self-Hosting-UX/0-Simplifying Self-Hosted Bitcoin Payments.md`
**What:** React Native app acting as remote control for the merchant's VPS node. POS terminal, QR generation, daily sales metrics, push notifications on invoice settlement.
**Why:** Non-technical merchants won't SSH into a VPS. The mobile app is the "real" interface; the VPS is invisible infrastructure.

Implementation:
- Communicates with VPS via macaroon-authenticated WebSocket over Cloudflare Tunnel.
- Features: POS terminal mode, QR generation for in-person payments, daily sales dashboard, push notifications (invoice settled, health alert, wallet unlock needed).
- Wallet unlock: push notification â†’ merchant taps "Unlock" â†’ app sends unlock secret directly to node (never through ArxMint).
- **Near-term substitute:** PWA-capable merchant dashboard (5.7) covers 80% of this. Native app is a Phase 6+ investment.

**"Lite" mode option (no VPS):**
- LDK node running directly on mobile via Breez SDK / LSP. No VPS, no DNS.
- Only works when app is open â€” explicitly not for e-commerce.
- Suitable for pop-up shops, farmers markets, event vendors.
- Separate SKU from full merchant stack.

### 5.14 â€” UX Polish & Conversion Optimization

**Source:** Enterprise polish gap analysis â€” functional UI â‰  converting UI. Professional design polish is the difference between 10% and 50% signup-to-first-payment conversion.
**Goal:** Elevate all merchant-facing surfaces from "functional indie tool" to "enterprise-grade product" without losing the sovereignty ethos.

**Design audit:**
- Professional design pass on the 5 highest-traffic flows: merchant setup wizard, checkout page, merchant dashboard, merchant directory, landing page
- Consistent component library â€” standardize spacing, typography hierarchy, button states, loading skeletons, empty states, and error states across all merchant surfaces
- Accessibility audit: WCAG 2.1 AA compliance on checkout page (merchants' customers include everyone)
- Dark/light theme support for checkout (merchant's customers may not want dark-only)

**Conversion optimization:**
- **Setup funnel analytics:** Track wizard step drop-off rates, time-to-first-payment by merchant type, setup failure reasons (which step, which error)
- **Checkout conversion tracking:** Invoices created vs. completed ratio, time-to-payment, abandonment points
- **A/B testing framework:** Test checkout page variants (QR placement, copy, payment method ordering). Lightweight â€” PostHog or self-hosted Plausible, not enterprise analytics bloat.
- **Onboarding NPS:** Post-setup survey (1 question: "How easy was setup? 1-10") to track polish improvements over time

**Error UX:**
- Every error state gets a plain-language message + actionable next step (not just "something went wrong")
- Checkout errors: "Payment expired â€” tap to generate a new invoice" instead of generic 400
- Setup errors: "LND couldn't sync â€” check your internet connection" with retry button
- Dashboard: "No payments yet â€” share your checkout link to start accepting Bitcoin" instead of empty table

**Priority:** Medium â€” can begin with design audit after Phase 5.7 (dashboard) ships. Conversion tracking should wire in early (during 5.3 checkout). Grant-fundable via bounties ($500-2K per flow redesign) or design-focused grant applications.

### Teneo Marketplace Integration

Phase 5 SDK and API must be compatible with the existing Teneo Marketplace integration layer. Stubs already exist at `C:\code\teneo-marketplace\services\arxmintService.js` with scaffolded methods: `createL402Invoice()`, `verifyL402Payment()`, `acceptCashuToken()`. The cross-reference lives in Teneo's roadmap (Section 5.7: "ArxMint Bazaar Integration â€” Decentralized Stripe for Creators").

**Dependencies:**
- `@arxmint/js` (5.5) must export the same primitives that `arxmintService.js` stubs expect
- Teneo connects to the creator's own ArxMint merchant node via `ARXMINT_API_URL` env var â€” same non-custodial model
- Shared Nostr auth (Phase B) already works across both apps
- Federation revenue share (tracked in Teneo's DB) settles via Cashu ecash minting (Phase B settlement)

**Not a separate deliverable** â€” this is a compatibility constraint on 5.5 (Client SDK). When building the SDK, verify it satisfies the Teneo stub interface. No new roadmap item needed; just test against the stubs.

### Implementation Snapshot â€” Phase 5

| Item | Status | Builds On |
|---|---|---|
| 5.1 Local auth tokens | Complete | Scoped merchant key generation, persistence, listing, revocation, and scope enforcement in `lib/merchant-auth.ts` and `app/api/merchant-keys/route.ts` |
| 5.2 Webhook engine (local) | Complete | Local webhook registration, signing, retry delivery, and CRUD routes in `lib/webhook-engine.ts`, `app/api/v1/webhooks/route.ts`, `app/api/webhooks/route.ts`, and `tests/webhook-engine.test.ts` |
| 5.3 Self-hosted checkout | Partial | Public checkout exists today at `/pay/[merchant-id]` backed by `/api/checkout`; route works, but the app still mixes centralized app assumptions, Lightning-first behavior, and dev demo fallback instead of a fully stabilized merchant-node contract |
| 5.4 Payment status API | Partial | Checkout status poll + SSE exist under `/api/checkout/status/[id]` and `/stream`; merchant payment listing exists at `/api/v1/payments`; remaining work is consolidating these into one stable merchant-node API contract |
| 5.5 Client-side SDK | Partial | `packages/js` and `packages/react` exist with usable package code, but they currently target unfinished `v1` checkout/status routes and need contract alignment before being treated as stable |
| 5.6 LNURL-pay / Lightning Address | Complete | LNURL and merchant registry surfaces are implemented in `app/api/lnurlp/[username]/invoice`, `lib/lnurl-merchant-registry.ts`, and tests |
| 5.7 Merchant dashboard (self-hosted) | Partial | `app/merchant/page.tsx` ships overview, payments, webhooks, API keys, and node status; analytics/settings still contain stubbed sections |
| 5.8a Provisioning service (control plane) | Partial | Merchant setup wizard and community/deployment generation exist, but full cloud provisioning is not yet the default path |
| 5.8b Managed DNS + connectivity | Partial | `lib/managed-dns.ts` and tests implement Cloudflare Tunnel + DNS provisioning logic; rollout/integration still needs real deployment verification |
| 5.8c LSP liquidity bootstrap | Partial | `lib/lsp-bootstrap.ts` and tests implement JIT channel bootstrap logic; real merchant-node validation is still required |
| 5.8d Merchant stack composition | Partial | `/create` and merchant setup wizard generate deployment intent/config and merchant-first UX, but do not yet complete the final export/provision appliance flow |
| 5.9 Public directory | Partial | `/merchants` is live with public signup, two live merchants, admin-only pipeline merchants, checkout links, and merchant badge CTA; search, merchant self-service activation, and CLI registration remain |
| 5.10 Idempotency + hardening | Partial | Idempotency, validation, rate limit, health, logging, and related hardening surfaces are in repo; remaining work is operational verification and rollout discipline |
| 5.10b Scale & load testing | Complete | Artillery smoke/full/webhook suites and CI load-test coverage are in repo |
| 5.11a Appliance update engine | Partial | Signed-manifest update engine and `/api/update/check` are in repo; production rollout/rollback discipline still needs verification |
| 5.11b Zero-knowledge encrypted backups | Partial | Backup engine, scripts, and encrypted backup primitives are implemented; restore-drill validation still remains |
| 5.11c One-click restore | Partial | Restore docs, validators, and UI building blocks exist; full fresh-host recovery verification is still pending |
| 5.12 Home node packaging (Umbrel/StartOS) | Partial | `umbrel/` and `start9/` packaging assets are in repo; packaging/distribution and real install verification remain |
| 5.13 Mobile merchant remote control | Partial | PWA/mobile-control direction is represented in the app shell and supporting client surfaces, but it is not yet fully productized |
| 5.14 UX polish & conversion optimization | Partial | Large amounts of landing, checkout, nav, and accessibility polish are shipped; remaining work is conversion instrumentation and verification against the merchant flow |

**Live Phase 5-adjacent prototype surfaces (March 2026):**
- `/badge` is live as a merchant acquisition + branding kit (embed badge, referral link, printable assets)
- `/create` is live as a merchant-first beta wizard, but still stops short of actual one-command deploy

### Phase 5 Priority Order

Current execution order from the repo state:

1. **Contract alignment first**
   - Unify `/api/checkout`, checkout status, merchant `v1` routes, and package SDK expectations.
   - Agents should extend the existing surfaces, not create parallel ones.
2. **Promote `/create` from beta generator to real merchant init/export path**
   - Keep the existing wizard.
   - Add the missing export/provision behavior instead of replacing the flow.
3. **Finish the merchant dashboard with real data or explicit deferrals**
   - Replace stub analytics/settings or remove them from the active surface until real.
4. **Run the Phase 5 verification gate on the code already in repo**
   - testnet payment
   - webhook delivery
   - DNS/tunnel bootstrap
   - LSP bootstrap
   - backup and restore drill
5. **Then move to audit/distribution work**
   - external audit
   - plugin publishing
   - compliance packaging refinement

Historical dependency order remains below for reference. Do not treat it as "start from zero."

Build in this order â€” deployment must come first in the self-hosted model:

```
5.8d Stack Composition â”€â”€â†’ 5.8a Provisioning â”€â”€â†’ 5.8b DNS/Connectivity â”€â”€â†’ 5.8c LSP Bootstrap
                                    â”‚
                                    â”œâ”€â”€â†’ 5.1 Local Auth â”€â”€â†’ 5.4 Status API â”€â”€â†’ 5.2 Webhooks
                                    â”‚                                              â”‚
                                    â”œâ”€â”€â†’ 5.3 Self-Hosted Checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ 5.5 Client SDK
                                    â”‚
                                    â”œâ”€â”€â†’ 5.6 LNURL-pay
                                    â”‚
                                    â”œâ”€â”€â†’ 5.7 Merchant Dashboard (parallel, grows with each feature)
                                    â”‚
                                    â””â”€â”€â†’ 5.11a Updates â”€â”€â†’ 5.11b Backups â”€â”€â†’ 5.11c Restore

5.9    Public Directory: independent, can ship early (only centrally-hostable item)
5.10   Idempotency: weave in throughout, harden before mainnet launch
5.10b  Scale/Load Testing: weave in with 5.10, complete before mainnet merchant launch
5.12   Umbrel/StartOS: ship after cloud deploy is stable
5.13   Mobile app: PWA bridge via 5.7 first; native app is future
5.14   UX Polish: design audit after 5.7; conversion tracking wires in during 5.3 checkout
```

**Key change from pre-research design:** Deployment (5.8) is now first priority, not API keys. In the self-hosted model, nothing works until the merchant has a running node. The old design assumed a hosted platform where merchants could onboard instantly via API keys â€” the self-hosted model inverts this.

**Key change from Self-Hosting-UX research:** 5.8 is no longer a single item â€” it's four sub-items (provisioning, DNS, liquidity, stack composition) reflecting the research finding that "one-command deploy" requires solving infrastructure orchestration, DNS friction, and liquidity bootstrap simultaneously. The research also added 5.11 (lifecycle), 5.12 (home node), and 5.13 (mobile) as new items that didn't exist in the pre-research design.

### Phase 5 Production Readiness Gate

**Everything below must be true before merchant nodes accept mainnet funds.** This is the exit criteria for Phase 5 core items (5.1â€“5.8) plus required lifecycle controls (5.11aâ€“5.11c). Parallels the Phase Aâ€“E gate but scoped to merchant infrastructure.

#### Merchant Node Safety
- [ ] Merchant holds seed phrase and admin macaroons â€” ArxMint provisioning service retains neither after bootstrap
- [ ] Local auth tokens (5.1) enforce permission scopes â€” `arx_pub_` cannot pay, only create invoices
- [ ] Macaroon rotation works without downtime (`arxmint keys rotate`)
- [ ] Webhook signatures (5.2) verified by independent test client
- [ ] Idempotency keys (5.10) prevent duplicate invoice creation under retry storms

#### Payment Correctness
- [ ] Self-hosted checkout (5.3) generates invoices from merchant's own LND node â€” verified by tracing invoice pubkey
- [ ] Payment status API (5.4) returns correct state transitions (pending â†’ completed/expired/failed)
- [ ] LNURL-pay (5.6) resolves and pays successfully from 3+ external wallets (Phoenix, Zeus, Breez)
- [ ] Client SDK (5.5) completes end-to-end payment flow against merchant's endpoint (not arxmint.com)

#### Infrastructure
- [ ] `arxmint merchant init` produces a running node with health checks passing in < 15 minutes on fresh VPS
- [ ] Managed subdomain (`storename.arxmint.cloud`) resolves and serves HTTPS checkout
- [ ] LSP opens JIT channel on first inbound payment â€” verified on regtest and testnet
- [ ] LND Neutrino syncs and accepts payments without full chain sync
- [ ] Cloudflare Tunnel mode works for home deployments behind CG-NAT

#### Lifecycle
- [ ] Stack BOM update applies and rolls back automatically on health check failure (5.11a)
- [ ] LND SCB backup fires on every channel open/close â€” NOT on cron (5.11b)
- [ ] Zero-knowledge backup round-trip: deploy â†’ transact â†’ destroy â†’ restore from seed â†’ verify balances (5.11c)
- [ ] Backup encryption key derived from seed â€” ArxMint cannot decrypt stored blobs

#### Operational
- [ ] Merchant dashboard (5.7) shows traffic-light health status with plain-language diagnoses
- [ ] Wallet unlock after reboot works via push notification (non-custodial â€” secret goes to node, not ArxMint)
- [ ] 7+ days on testnet with simulated merchant traffic and zero incidents
- [ ] Disaster recovery drill: fresh VPS + seed phrase â†’ full restore â†’ payments resume

### What This Makes Possible

| Merchant Type | Integration | Time to First Payment |
|---|---|---|
| Coffee shop (no code) | `arxmint merchant init` + print QR | < 15 minutes |
| Online store (low code) | Self-hosted checkout link in "Buy" button | 30 minutes |
| SaaS app (full code) | Client SDK + webhooks on own node | 1-2 hours |
| AI agent (programmatic) | L402 macaroons + local node API | 30 minutes |
| Marketplace | Teneo integration + federation directory | 2-3 hours |
| Pop-up / farmers market (Lite) | Mobile LDK via Breez SDK, no VPS | < 10 minutes |

### Competitive Benchmarking (Self-Hosting-UX Research)

| Solution | Custody | Time to First Payment | Primary Blocker |
|---|---|---|---|
| Square Bitcoin | Custodial | < 5 min | KYC verification |
| Strike (Shopify) | Custodial | < 10 min | Business verification |
| OpenNode | Custodial | < 10 min | KYB/KYC |
| Breez SDK (Liquid) | Non-custodial | < 10 min | None (receive after init) |
| BTCPay (LunaNode) | Self-hosted | 2-12 hours | Full chain sync (1-7 days) |
| BTCPay (Manual Docker) | Self-hosted | 12-48 hours | Chain sync + DNS + SSH |
| **ArxMint (Target)** | **Self-hosted** | **< 15 min** | **Infrastructure fee (credit card)** |

ArxMint's target: match Breez SDK speed while maintaining full self-hosted sovereignty. The Neutrino light client (no full chain sync) + managed subdomain (no DNS setup) + LSP liquidity (no channel management) eliminate the three blockers that push BTCPay to 2-48 hours.

### Stripe vs. ArxMint â€” Target Comparison

| | Stripe | ArxMint (Phase 5) |
|---|---|---|
| **Transaction fee** | 2.9% + $0.30 | 0% (ecash) or ~0.1% (Lightning routing) |
| **Settlement time** | T+2 days | Instant â€” customer pays merchant's node directly |
| **Customer KYC** | Card + billing address required | None â€” bearer ecash is anonymous |
| **Merchant KYC** | Full identity verification | None â€” Nostr pubkey optional |
| **Data sold** | Yes (Stripe Radar, analytics) | Impossible â€” no central entity holds the data |
| **Chargebacks** | Yes (merchant liability) | Impossible â€” ecash is bearer, Lightning is final |
| **Open source** | No | Yes â€” MIT license |
| **Self-hosted** | No | Yes â€” required by design (legally protected) |
| **Censorship** | Platform can freeze funds | Impossible â€” merchant controls their own node |
| **Custody** | Stripe holds funds T+2 | Never â€” peer-to-peer, instant settlement |
| **Regulatory burden** | Stripe handles compliance | None for merchant â€” self-hosted software is exempt |

### Legal Architecture Summary

| Component | Custody? | Regulatory Status | Research #7 Basis |
|---|---|---|---|
| ArxMint open-source software | No | Exempt (unhosted wallet provider) | FinCEN FIN-2019-G001; DOJ 2025 safe harbor; MiCA Art. 2/Recital 83 |
| Merchant's self-hosted node | Self-custody | Merchant is a "user" accepting payment for own goods | FinCEN "user" exemption â€” not money transmission |
| Local L402 macaroons (5.1) | No | Local auth token, not custodial trigger | Macaroon scoped to merchant's own node |
| Self-hosted checkout (5.3) | No | Invoice generated by merchant's own LND | Peer-to-peer; ArxMint provides software only |
| Public merchant directory (5.9) | No | Informational only â€” no funds flow | No custody, no transmission, no regulatory trigger |
| Client SDK (5.5) | No | Connects to merchant's endpoint, not ArxMint's | Stripe.js analogue but self-hosted |

### API Versioning Strategy

All merchant-facing endpoints use `/api/v1/` prefix. Once merchants integrate, breaking changes require a version bump.

**Rules:**
- **Additive changes** (new fields, new endpoints) â€” ship in `v1`. No version bump needed.
- **Breaking changes** (removed fields, changed semantics, renamed endpoints) â€” require `/api/v2/` with minimum 6-month `v1` deprecation window.
- **Stack BOM updates** (5.11a) must declare API version compatibility. A BOM that ships a breaking API change must also ship the new version prefix.
- **SDK versioning** â€” `@arxmint/js` follows semver. Major version = breaking API change. SDK and node API versions must be compatible (SDK v2.x requires node API v2).
- **Changelog** â€” every stack BOM includes a human-readable changelog. Breaking changes highlighted with migration guide.

**Not needed yet** â€” this becomes enforced when the first external merchant integrates. Until then, `v1` is the only version and the API is in flux. Lock the versioning policy before Phase 5 exits beta.

---

## Phase 6: Enterprise Polish â€” Credibility, Reach & Trust

**Codename:** Enterprise Polish â€” the layer that turns an indie tool into a platform merchants trust with real money at scale
**Prerequisite:** Phase 5 core items (5.1â€“5.8) stable and merchant nodes running on mainnet. Phase 4.6 (Developer Portal) ideally shipped first.
**Goal:** Close the remaining gaps between ArxMint and what a $10M-funded, 10-person team would produce â€” without the team or the dilution. Prioritize the items that build trust and expand reach with the lowest cost.

### 6.1 â€” External Security Audit

**Source:** Enterprise polish gap analysis â€” the single strongest signal to enterprise merchants that the code is safe. No amount of internal testing replaces a third-party audit report.
**What:** Engage a reputable security firm to audit the ArxMint merchant node stack (LND integration, Cashu mint interaction, macaroon auth, webhook engine, checkout flow, encrypted backup system).
**Why:** Merchants (especially small chains, franchises, or merchants with compliance teams) will ask "has this been audited?" before running it with real money. An audit report is also a powerful grant deliverable (OpenSats/HRF fund audits).

**Implementation:**
- **Target firms:** Least Authority (Bitcoin-focused, audited BTCPay Server), Trail of Bits, NCC Group, or Cure53 (web/API focus)
- **Scope:** Merchant node data plane (LND config, Cashu mint interaction, macaroon generation/validation, webhook HMAC, checkout flow, encrypted backup/restore, key derivation). NOT the full Next.js marketing site.
- **Budget:** $10Kâ€“$50K depending on scope. Fund from OpenSats/HRF grants â€” both explicitly fund security audits for Bitcoin infrastructure.
- **Deliverables:** Public audit report (redact critical vulns until fixed, then publish full). Fix all critical/high findings before mainnet merchant launch. Medium/low findings tracked in GitHub issues.
- **Timeline:** Engage after Phase 5 core stabilizes. Audit takes 2â€“6 weeks. Fix cycle adds 2â€“4 weeks. Target: audit complete before Phase 5 exits beta.
- **Ongoing:** Annual re-audit on major releases. Budget as recurring grant line item.

### 6.2 â€” E-Commerce Platform Plugins

**Source:** Enterprise polish gap analysis â€” the `@arxmint/js` SDK enables custom integrations, but pre-built plugins for existing platforms remove the biggest adoption barrier for non-technical merchants.
**What:** Ship plugins for the top e-commerce platforms that connect to the merchant's own ArxMint node. Each plugin is a thin wrapper around `@arxmint/js` (5.5).
**Why:** A WooCommerce shop owner shouldn't need to write code to accept Bitcoin. "Install plugin â†’ enter your node URL â†’ done" matches the Stripe/PayPal plugin experience they already know.

**Implementation:**

- **WooCommerce plugin (primary target):**
  - WordPress is ~40% of e-commerce. WooCommerce is the dominant payment plugin ecosystem.
  - Plugin settings: ArxMint node URL (`https://pay.merchant.com`), publishable key (`arx_pub_...`), payment methods (Lightning, ecash, both)
  - Checkout: redirects to merchant's self-hosted checkout page (5.3) or inline iframe embed
  - Webhook receiver: listens for `payment.completed` from merchant's node â†’ marks WooCommerce order as paid
  - Ship on WordPress.org plugin directory for discoverability
  - **Non-custodial:** Plugin connects to merchant's own node. ArxMint never touches funds.

- **Shopify app (secondary â€” evaluate feasibility):**
  - Shopify's payment app ecosystem is more restrictive. Evaluate whether a self-hosted payment provider can pass Shopify's review.
  - If Shopify blocks: ship as "manual payment method" integration guide instead of app store listing.
  - Alternative: Shopify Buy Button + ArxMint checkout page (external redirect flow)

- **Zapier integration:**
  - Triggers: `payment.completed`, `payment.created`, `payment.failed`
  - Actions: create payment link, check payment status
  - Enables non-technical merchants to wire ArxMint into existing workflows (payment â†’ Google Sheets, payment â†’ email notification, payment â†’ inventory update)
  - Connects to merchant's own node via webhook (5.2) â€” Zapier receives events, ArxMint doesn't route them

- **Priority order:** WooCommerce â†’ Zapier â†’ Shopify. Ship after `@arxmint/js` SDK (5.5) is stable. Each plugin is 1â€“2 weeks of work since they're SDK wrappers.

### 6.3 â€” Compliance Documentation Kit

**Source:** Enterprise polish gap analysis â€” even with a non-custodial model, merchants with compliance teams need documentation to justify adoption internally.
**What:** A downloadable compliance package that merchants can hand to their legal/compliance team, IT department, or franchise HQ to answer "is this safe and legal to use?"
**Why:** This is not ArxMint's own compliance (non-custodial model is exempt). This is helping merchants pass their own internal procurement review. The content already exists across Research #7 and the legal architecture section â€” it just needs packaging.

**Contents:**
- **Legal position paper** (2â€“3 pages): Summarizes the non-custodial architecture, cites FinCEN FIN-2019-G001, DOJ 2025 safe harbor, MiCA Art. 2/Recital 83, and UK FCA "technical service provider" exemption. Explains why the merchant is a "user" accepting payment for their own goods, not a money transmitter.
- **Security architecture overview** (2â€“3 pages): Split-plane design, encryption standards (AES-256-GCM, PBKDF2-SHA256), no central custody, macaroon auth model, zero-knowledge backups. Reference external audit report (6.1) when available.
- **Data handling statement** (1 page): What data ArxMint (the software) stores locally, what leaves the merchant's node (nothing except DNS updates and encrypted backup blobs), what ArxMint (the project) can and cannot access (nothing â€” no keys, no funds, no transaction data).
- **FAQ for compliance teams:** "Does ArxMint hold our funds?" (No), "Is ArxMint a money transmitter?" (No â€” software provider exemption), "Where is customer payment data stored?" (On your node only), "Has the code been audited?" (Yes â€” link to 6.1 report), "What happens if ArxMint (the company) disappears?" (Software is MIT-licensed, self-hosted, runs independently).
- **Format:** PDF download at `arxmint.com/compliance` + markdown in repo at `docs/compliance-kit/`
- **Priority:** Low engineering cost (writing, not code). High value for merchant procurement. Can draft immediately from existing Research #7 content.

---

## Dependency Graph

```
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  TE-BTC ECOSYSTEM (sibling projects ArxMint depends on)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@te-btc/cashu-l402 (DONE)           @te-btc/cashu-mint (IN PROGRESS)
  265 tests, P2PK+DLEQ               NUT-00..07, 59% feature gate
  Ready for npm publish               Needs: LND fee, NUT-08, rotation
        â”‚                                    â”‚
        â”œâ”€â†’ swap into ArxMint               â”œâ”€â†’ replace Nutshell in Docker
        â”‚   (lib/cashu-paywall.ts)          â”‚   (when 90% feature gate)
        â”‚                                    â”‚
        â””â”€â†’ OpenBazaar.ai stubs            â””â”€â†’ agent-wallet consumes
            (arxmintService.js)                  â”‚
                                                 â–¼
                                    @te-btc/agent-wallet (SPEC ONLY)
                                      Budget engine, policy, NIP-60/61
                                      Replaces ArxMint inline agent wallets
                                                 â”‚
                                                 â–¼
                                    @te-btc/multi-mint-router (DEFERRED)
                                      Cross-mint swaps, MCP server
                                      Trigger: 2+ live community mints

OpenBazaar.ai (PHASE 0 â€” PRODUCTION PROOF MISSING)
  517 tests green, 42 routes, 51 services
  Catalog/redirect/webhook wired to ArxMint
  Needs: real Stripe purchase, real POD purchase, auth flow, Supabase proof
  Blocks: ArxMint Bazaar go-live

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  PRODUCTION PATH (Phases Aâ€“E â†’ Gate â†’ Pilot)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

Phase A (Foundation)      Phase B (Payments)      Phase C (Infrastructure)
  DB + Vault + Auth    â†’   L402 + NUT-24 + SDK  â†’  Caddy + Monitoring + Backup
        â”‚                        â”‚                        â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
                          Phase D (E2E Testing)
                                 â”‚
                          Phase E (Production Hardening)
                           Rate limit, health checks,
                           value caps, CI/CD, testnet
                                 â”‚
                    â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
                    â•‘  PRODUCTION READINESS GATE â•‘
                    â•‘  (all checkboxes pass)     â•‘
                    â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                                 â”‚
                          Phase 4: Citadel
                     Longmont pilot + grants

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  FEATURE PATH (Phases 0â€“3, parallel to production path)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

Phase 0 (Fortify) â”€â”€â”€ must complete before â”€â”€â†’ Phase 1 (Keystone)
                                                    â”‚
                                                    â”œâ”€â”€ 1.1 NUT-24 â”€â”€â†’ 2.8 Gateway Bridge
                                                    â”œâ”€â”€ 1.2 Spend Router â”€â”€â†’ 2.2 Ark SDK
                                                    â”œâ”€â”€ 1.3 BCE Metrics â”€â”€â†’ 4.1 Pilot
                                                    â”œâ”€â”€ 1.4 Merchant Flow â”€â”€â†’ 4.1 Pilot
                                                    â””â”€â”€ 1.6 Agent Wallets â”€â”€â†’ 3.2 Programmable eCash

Phase 2 (Spire) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ Phase 3 (Aether)
    â”‚                                               â”‚
    â”œâ”€â”€ 2.1 Fedimint v0.10.0 âœ…                     â”œâ”€â”€ 3.1 Governance (post-pilot)
    â”œâ”€â”€ 2.2 Ark SDK â”€â”€â†’ 2.6 SP Infra                â”œâ”€â”€ 3.2 STARK â”€â”€â†’ depends on upstream
    â”œâ”€â”€ 2.3 CDK (deferred) â”€â”€â†’ 2.7 Monitoring       â””â”€â”€ 3.3 ZK Reissuance â”€â”€â†’ depends on upstream
    â”œâ”€â”€ 2.4 Coco â”€â”€â†’ 4.5 Multi-City
    â””â”€â”€ 2.5 NUT-26 â”€â”€â†’ 3.6 Numo NFC

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  ECOSYSTEM INTEGRATION (cross-project dependencies)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

@te-btc/cashu-l402 published â”€â”€â†’ ArxMint swaps lib/cashu-paywall.ts
                               â”€â”€â†’ OpenBazaar.ai replaces arxmintService.js stubs
                               â”€â”€â†’ Teneo marketplace stubs satisfied

@te-btc/cashu-mint 90% gate â”€â”€â”€â†’ ArxMint Docker swaps Nutshell for cashu-mint
                               â”€â”€â†’ agent-wallet can test against own mint

@te-btc/agent-wallet Phase 1 â”€â”€â†’ ArxMint replaces inline agent wallet code
                               â”€â”€â†’ Agent commerce SDK (@te-code/agent-commerce) uses it

OpenBazaar.ai Phase 0 gate â”€â”€â”€â†’ ArxMint Bazaar go-live (real products + fulfillment)
                               â”€â”€â†’ ArxMint â†” OpenBazaar.ai webhook proof

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  PHASE DEPENDENCIES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

Phase 4 (Citadel) depends on:
    - Production Readiness Gate passed (Phases Aâ€“E)
    - Phase 0 complete (security)
    - Phase 1.3 + 1.4 (metrics + merchants)
    - Phase 2.7 (monitoring config)
    NOT blocked by: Phase 3 (advanced features are post-pilot)

Phase 5 (Bazaar) depends on:
    - Phase 4 running (real merchant validation of self-hosting UX assumptions)
    - Phase A (DB + auth)
    - Phase B (payment SDK)
    - Phase E (production hardening)
    - @te-btc/cashu-l402 published (replaces inline L402 code)
    - OpenBazaar.ai Phase 0 gate (for Bazaar storefront go-live)
    Phase 5 internal ordering:
    - 5.8d (stack) â†’ 5.8a (provisioning) â†’ 5.8b (DNS) â†’ 5.8c (LSP) â†’ all other 5.x items
    - 5.10b (scale testing) weaves in with 5.10 hardening, before mainnet launch
    - 5.11 (lifecycle) starts after 5.8a; grows in parallel with feature items
    - 5.12 (Umbrel/StartOS) after cloud deploy stable
    - 5.13 (mobile) is future (PWA via 5.7 is the bridge)
    - 5.14 (UX polish) starts after 5.7 dashboard; conversion tracking wires in during 5.3
    NOT blocked by: Phase 3 (Aether) or Phase 4 completion
    CAN start in parallel with Phase 4 once pilot is live

Phase 6 (Enterprise Polish) depends on:
    - Phase 5 core (5.1â€“5.8) stable on mainnet
    - 6.1 (security audit) â†’ after Phase 5 stabilizes; feeds 6.3 compliance kit
    - 6.2 (e-commerce plugins) â†’ after 5.5 SDK stable; WooCommerce first
    - 6.3 (compliance kit) â†’ can draft anytime from Research #7; finalize after 6.1 audit
    Phase 4.6 (dev portal) is a precursor â€” ideally ships during Phase 4
    NOT blocked by: Phase 3 (Aether)
    CAN start 6.3 drafting in parallel with Phase 5
```

---

## Research â†’ Roadmap Traceability

Every roadmap item traces back to at least one research document.
**Original research:** Docs 1â€“7 cross-referenced in `docs/research/research-crossref.md`
**Deep research (Feb 2026):** 6 studies in `docs/research/` that locked architecture decisions
**Self-Hosting-UX research (Mar 2026):** 11 studies in `docs/research/Phase5-Bazaar/Self-Hosting-UX/` that expanded Phase 5 scope (SH-UX column below)

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
| 2.1 Fedimint v0.10.0 âœ… | X | | | | | | | |
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
| **Hardening: Rate limiting** | | | | | | | | â€” |
| **Hardening: Health checks** | | | | | | | | â€” |
| **Hardening: Value caps** | | | | | | | | â€” |
| **Hardening: CI/CD** | | | | | | | | â€” |
| **Hardening: Incident response** | | | | | | | | #2 |
| **5.8a Provisioning service** | | | | | | | | SH-UX #0, #2, #4 |
| **5.8b Managed DNS + connectivity** | | | | | | | | SH-UX #6 |
| **5.8c LSP liquidity bootstrap** | | | | | | | | SH-UX #1, #5 |
| **5.8d Merchant stack composition** | | | | | | | | SH-UX #5, #8 |
| **5.11a Appliance update engine** | | | | | | | | SH-UX #4, #7 |
| **5.11b Zero-knowledge backups** | | | | | | | | SH-UX #7 |
| **5.11c One-click restore** | | | | | | | | SH-UX #7 |
| **5.12 Umbrel/StartOS packaging** | | | | | | | | SH-UX #3 |
| **5.13 Mobile remote control** | | | | | | | | SH-UX #0, #2 |

---

## Version Naming

Following the positioning doc's Tartarian builder theme:

| Phase | Codename | Meaning |
|---|---|---|
| Phase 0 | **Fortify** | Harden the foundation before building higher |
| Phase 1 | **Keystone** | The critical stone that holds the arch together |
| Phase 2 | **Spire** | The structure rises â€” full stack visible |
| Phase 3 | **Aether** | Advanced capabilities, reaching higher |
| Phase 4 | **Citadel** | The complete sovereign fortress â€” deployed and defended |
| Phase 5 | **Bazaar** | The open marketplace â€” sovereign commerce for all |
