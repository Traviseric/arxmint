# ArxMint — Implementation Roadmap

**Version:** 1.1 — February 27, 2026 (audited)
**Informed by:** 7 research documents cross-referenced in `docs/research-crossref.md`
**Canonical spec:** `docs/spec.md` (all `Spec §X` references point here)
**Codename convention:** Phase names follow the brand versioning from positioning doc (Keystone → Spire → Aether)

---

## Roadmap Overview

```
Phase 0: Fortify     (Security hardening)            ✅ COMPLETE (code-verified)
Phase 1: Keystone    (Core architecture upgrades)    ✅ COMPLETE (code-verified)
Phase 2: Spire       (Full privacy + commerce stack) 🟡 MOSTLY COMPLETE (6/8 real, Ark=stub, SP crypto=placeholder)
Phase 3: Aether      (Advanced features + scale)     🟠 PARTIAL (2/6 built, 3 not implemented, 1 unverified)
Phase 4: Citadel     (Production + grant deployment) ✅ COMPLETE (planning/tooling layer — no real deployment yet)
```

---

## Implementation Snapshot (Current Codebase)

Status key:
- `Complete` = implemented, wired into UX/runtime, uses real SDK calls
- `Complete (needs infra)` = code is real but requires running backend (mint, LND, federation)
- `Partial` = real infrastructure + placeholder crypto or incomplete integration
- `Stub` = in-memory mock, upstream SDK unavailable
- `Not implemented` = code does not exist despite earlier claims

| Item | Status | Evidence |
|---|---|---|
| 0.1 Cashu keyset hardening | Complete | Real NUT-13 validation, dual registry (full ID + 31-bit int), collision detection, proof filtering on restore. `lib/cashu-sdk.ts:24-273`, `tests/cashu-security.test.ts` |
| 0.2 Honest SP backend status + scoring | Complete | `isLayerAvailable()` returns false for SP on Fedimint. Privacy score excludes unavailable layers. `lib/privacy-defaults.ts:116-173`, `components/privacy-dashboard.tsx` |
| 0.3 Lightning security tiers | Complete | `SecurityTier` type, `requireTier()` enforcement, tier-gated operations (invoice/pay/bake). `lib/types.ts:138-197`, `lib/lightning-agent.ts:172-435` |
| 0.4 Remote signer isolation | Complete | Real `litd` probe to `/v1/state` (5s timeout, fail-closed), signing delegation via LNC→LND→litd. `lib/lightning-agent.ts:372-406`, `lib/lightning-validator.ts:18-105` |
| 1.1 NUT-24 dual paywall | Complete (needs infra) | Real `verifyCashuPayment()` — decodes token, validates mint URL, calls `wallet.checkProofsStates()`, claims via `wallet.receive()`. `lib/cashu-paywall.ts:77-145`, `app/api/agent/route.ts` |
| 1.2 Spend router | Complete | Amount/privacy-based routing, fee estimation, viable path validation, alternatives. `lib/spend-router.ts:98-262` |
| 1.3 BCE metrics dashboard + export | Complete (needs infra) | Real API pipeline at `/api/bce-metrics` queries DB for merchant count, 30d transactions, success rate, MAU. Falls back to `getDemoBCEMetrics()` when no DB. `lib/bce-metrics.ts`, `app/api/bce-metrics/route.ts` |
| 1.4 Merchant onboarding flow | Complete (needs infra) | Multi-step form with DB persistence via `/api/merchants` POST→`db.merchant.create()`. QR code generation. `components/merchant-onboard.tsx`, `app/api/merchants/route.ts` |
| 1.5 Macaroon bakery | Complete (needs infra) | Real LND RPC `bakeMacaroon()`, role→permission mapping, TTL/amount caveats. Requires ADMIN tier. `lib/lightning-agent.ts:308-350` |
| 1.6 Ephemeral agent wallets | Complete | In-memory only, real TTL enforcement, balance limits, clean lifecycle. `AgentCashuWallet` in `lib/cashu-sdk.ts:630-748`, `AgentFedimintWallet` in `lib/fedimint-sdk.ts:264-370` |
| 1.7 G-Bot fallback integration | Complete (needs infra) | Real fetch to `gbot.fedimint.org/api/v1`, POST to `/federation/create`, returns invite code. Docker fallback if unreachable. `lib/community-generator.ts:980-1100` |
| 2.1 Fedimint v0.10.0 | Complete | Root `docker-compose.yml` uses `fedimint/fedimintd:v0.10.0` (3 guardians), Iroh transport. Generator matches. `docker-compose.yml:72-136`, `lib/community-generator.ts:270` |
| 2.2 Ark integration | Stub | Attempts real `/v1/info` connect but falls back to in-memory. VTXO IDs are client-generated, no server round coordination. Blocked on upstream `@arkade-os/sdk`. `lib/ark-sdk.ts:80-238` |
| 2.3 CDK production mint | Complete | Generator uses `cashubtc/cdk-mintd` + Postgres for production (>30 members or mainnet). Root compose uses Nutshell for local dev (correct behavior). `lib/community-generator.ts:137-206` |
| 2.4 Multi-mint (Coco) | Complete | Real `MultiMintManager` — creates real Cashu clients, real cross-mint routing via `receiveOn()`. `lib/cashu-sdk.ts:1142-1241` |
| 2.5 NUT-26 QR flow | Complete | Real `cashu://pay?` URI generation + parsing with proper URLSearchParams. `lib/cashu-sdk.ts:1018-1085` |
| 2.6 Silent Payments infra | Partial | Real indexer API (POST to `/api/v1/scan`), localStorage persistence, scan scheduling. BUT: address parsing uses placeholder keys, ECDH tweak is zero-filled. Needs libsecp256k1. `lib/silent-payments.ts` |
| 2.7 Monitoring stack | Complete | Root `docker-compose.yml` has Prometheus v2.51.0 + Grafana 11.0.0. Real scrape configs in `docker/prometheus.yml`. Generator also produces per-service configs. `docker-compose.yml:138-172` |
| 2.8 Fedimint gateway bridge | Complete (needs infra) | Real L402 flow: parse challenge → `fedimintClient.payInvoice()` → `wallet.lightning.waitForPay()` → real preimage from SDK. Token caching. `lib/fedimint-sdk.ts:412-552` |
| 3.1 Governance framework | Complete | Real BFT quorum (2f+1), guardian rotation checks (term limits, uptime, liveness), governance doc generator. `lib/community-generator.ts:644-970` |
| 3.2 Programmable eCash | Not implemented | No SpendCondition types, no evaluateConditions(), no createAgentEscrow() in codebase. Blocked on Cashu NUT-XX upstream. |
| 3.3 ZK reissuance | Not implemented | No AuditedAgentWallet class, no reissue() method, no verifyAuditChain() in codebase. Blocked on Cashu protocol support. |
| 3.4 HW wallet BIP392 | Complete | Real SP descriptor generation with functional checksum. Honest HW status matrix (all devices: "not yet supported"). `lib/silent-payments.ts:468-632` |
| 3.5 Advanced Cashu | Not implemented | No P2BKToken, no ProofStateVerifier, no executeAtomicSwap() in codebase. Blocked on Cashu protocol evolution. |
| 3.6 Numo NFC | Unverified | Component references exist in `merchant-onboard.tsx`. Full NFC integration not confirmed by code audit. |
| 4.1 Longmont pilot | Complete (planning) | Real KPI targets (30/300/98%/99.5%), 6-month timeline, 21-item pre-launch checklist, KPI evaluation. No actual deployment. `lib/pilot-deployment.ts:33-461` |
| 4.2 Grant applications | Complete | 3 substantive generators (FBCE/OpenSats/Fedi) with real budgets, milestones, content. `lib/grant-templates.ts:71-529` |
| 4.3 Grant reporting | Complete (needs infra) | Report generation, OpenSats cadence (monthly→quarterly), Markdown export. Needs real KPI data. `lib/bce-metrics.ts:249-523` |
| 4.4 Replication playbook | Complete | 10-section actionable guide with real Docker commands, DKG ceremony steps, Prometheus setup. `lib/replication-playbook.ts:39-553` |
| 4.5 Multi-city federation | Complete (planning) | Real CityNode networking, cross-city Lightning routing, KPI aggregation, expansion plan. `lib/pilot-deployment.ts:494-762` |

---

## Known Gaps (Code Written ≠ Verified Working)

**Code written is not code verified.** Most items have real SDK calls, but
to honestly mark something "production-ready" requires real-world verification:
connect to a real mint, make a real payment, see real metrics.

### Critical Gaps (Infrastructure / Auth)

| Gap | Impact | Current State |
|-----|--------|---------------|
| **No user auth** | No accounts, no login, no API keys. Anyone can access everything. | Nostr NIP-07 login exists for identity but no session persistence to DB, no API key management. |
| **No full database** | Wallet balances in-memory (Zustand), lost on refresh. | Some API routes have DB persistence (`/api/merchants`, `/api/bce-metrics`, `/api/transactions`). Cashu proofs persisted via localStorage. But no unified Prisma schema. |
| **No wallet recovery** | No seed backup, no encrypted proof export/restore flow. | Cashu proofs in localStorage. Fedimint ecash not persisted. |
| **Agent API responses** | Agent services return demo data (except cycle-signals which is real CoinGecko). | Paywall verification is real; service implementations behind the paywall are demo. |

### Integration Gaps (Stubbed or Partial)

| Gap | Current State | What's Needed |
|-----|--------------|---------------|
| **Ark SDK** | Stub — in-memory VTXOs. Attempts real `/v1/info` connect, falls back to no-op. Upstream `@arkade-os/sdk` doesn't exist. | Wait for upstream SDK release, then replace stubs |
| **Silent Payments crypto** | Real indexer API integration + scan scheduling. But address parsing uses placeholder keys, ECDH tweak is zero-filled. | Real BIP-352 ECDH via libsecp256k1 (JS binding or backend service) |
| **HW wallet SP** | Honest status matrix — all 6 devices show "not yet supported". Descriptor generation works. | Wait for ColdCard/BitBox02/etc. to ship BIP-352 support |
| **Programmable eCash (3.2)** | NOT IMPLEMENTED — no code exists. Blocked on Cashu NUT-XX protocol adoption. | Track upstream, implement when NUT-XX lands |
| **ZK reissuance (3.3)** | NOT IMPLEMENTED — no code exists. Blocked on Cashu protocol support for ZK proofs. | Track upstream, build when protocol supports it |
| **Advanced Cashu (3.5)** | NOT IMPLEMENTED — no P2BK, no ProofStateVerifier, no atomic swaps. | Track upstream NUT-28 and Cashu protocol evolution |
| **Numo NFC (3.6)** | Component references exist but full integration unverified by code audit. | Verify NFC payload generation and card provisioning flow |

### Resolved (Previously Listed as Gaps)

These were listed as gaps but have since been fixed:

| Item | Resolution |
|------|------------|
| ~~Remote signer transport~~ | Complete — real `litd` probe to `/v1/state`, fail-closed, signing delegation via LNC→LND→litd |
| ~~Fedimint v0.10.0 parity~~ | Complete — root `docker-compose.yml` uses v0.10.0 with Iroh transport (3 guardians) |
| ~~Monitoring not in root compose~~ | Complete — Prometheus v2.51.0 + Grafana 11.0.0 in root compose with real scrape configs |
| ~~Gateway bridge preimage~~ | Complete — real preimage from `wallet.lightning.waitForPay()`, not placeholder |
| ~~L402 invoice generation~~ | Complete — real HMAC-SHA256 preimage verification, real LND REST invoice generation |
| ~~BCE metrics data pipeline~~ | Complete — `/api/bce-metrics` queries DB for real merchant/transaction data, demo fallback |
| ~~Merchant backend~~ | Complete — `/api/merchants` POST persists to DB via `db.merchant.create()` |
| ~~CDK vs Nutshell~~ | Complete — generator correctly uses CDK for production, Nutshell for dev (intended behavior) |
| ~~Grant templates~~ | Complete — substantive content generation, not placeholder text |

### Verification Checklist (Code-Verified → Infra-Verified)

Code audit (Feb 27, 2026) confirmed real SDK calls and logic. Next step: verify against running infrastructure.

- [ ] **0.1 Keyset validation**: Connect to a real Cashu mint. Intentionally feed a bad keyset ID. Confirm rejection.
- [ ] **0.3 Security tiers**: Connect LNC to a real Lightning Terminal. Confirm watch-only can't pay. Confirm pay-only routes through remote signer.
- [ ] **0.4 Remote signer**: Connect to real `litd` instance. Confirm probe succeeds. Confirm payment signing delegated.
- [ ] **1.1 NUT-24 paywall**: Send a real Cashu token to `/api/agent`. Confirm access granted. Confirm invalid/spent token rejected.
- [ ] **1.2 Spend router**: With real balances across Cashu + Lightning, confirm auto-routing picks correct path.
- [ ] **1.3 BCE metrics**: With DB connected, confirm `/api/bce-metrics` returns real merchant/transaction data.
- [ ] **1.4 Merchant onboarding**: Complete full flow. Confirm merchant persists in DB via `/api/merchants`. Generate QR. Make real payment.
- [ ] **1.5 Macaroon bakery**: Connect to real LND. Bake a pay-only macaroon. Confirm it can pay but not bake.
- [ ] **1.7 G-Bot**: Test against real G-Bot API (if available). Confirm Docker fallback works when unreachable.
- [ ] **2.1 Fedimint**: Join a real federation via invite code. Send and receive ecash.
- [ ] **2.5 NUT-26 QR**: Generate a QR, scan it with a Cashu wallet, complete payment.
- [ ] **2.7 Monitoring**: Run `docker compose up`. Confirm Prometheus scrapes all services. Confirm Grafana shows data.
- [ ] **2.8 Gateway bridge**: Pay an L402 endpoint using Fedimint ecash. Confirm preimage returned and token cached.
- [ ] **4.1 Longmont pilot**: Real merchants. Real payments. Real KPIs tracked.

---

## Path to Working MVP

What's needed to go from "code-verified prototype" to "actually works end-to-end".

**Already done** (confirmed by Feb 27 audit): L402 has real HMAC verification + LND invoice generation. NUT-24 verifies tokens against real mint. Merchants persist to DB. BCE metrics has real DB pipeline. Root compose is v0.10.0 with monitoring. Gateway bridge gets real preimage from SDK.

### Phase A: Data Persistence (Week 1-2)
1. Add Postgres + Prisma ORM — unified schema for all entities
2. ~~Persist merchant listings~~ DONE — `/api/merchants` route exists
3. ~~Add localStorage backup for Cashu proofs~~ DONE — Cashu proofs in localStorage
4. Persist: community configs, wallet balance snapshots, Fedimint ecash state
5. Migrate Zustand store to hydrate from DB on load

### Phase B: Auth & Wallet Recovery (Week 2-3)
1. ~~Add Nostr login~~ DONE — NIP-07 browser extension auth exists (no DB session yet)
2. Persist Nostr sessions to DB (currently localStorage only)
3. Wallet backup/restore flow (encrypted proof export)
4. API key management for agent access
5. Session management

### Phase C: Real Agent Services (Week 3-4)
1. ~~Wire L402 to real LND~~ DONE — real HMAC-SHA256 + LND REST invoice generation
2. ~~Wire NUT-24 to verify against real mint~~ DONE — `verifyCashuPayment()` checks proof states + claims
3. Replace demo agent responses (privacy-audit, compute, data) with real service implementations
4. Wire Aperture reverse proxy for production L402 flow
5. End-to-end test: user pays L402/Cashu → agent returns real data

### Phase D: Deployment (Week 4-5)
1. ~~Update root docker-compose.yml to Fedimint v0.10.0~~ DONE
2. ~~Add Prometheus + Grafana to root compose~~ DONE
3. ~~CDK option for production~~ DONE — generator uses CDK for >30 members/mainnet
4. Write `DEPLOY.md` — step-by-step VPS deployment guide
5. Test full `docker compose up` → connect wallet → make payment flow

### Phase E: Real Data Pipeline (Week 5-6)
1. ~~Connect BCE metrics to real DB~~ DONE — `/api/bce-metrics` queries merchant count + 30d transactions
2. ~~Wire merchant directory to backend~~ DONE — `/api/merchants` persists to DB
3. Connect grant reporting to real KPI snapshots (currently uses demo metrics when no DB)
4. Prometheus scrape targets verified against running services

### Phase F: Testing & Hardening (Week 6-8)
1. E2E tests: prompt → generate config → deploy Docker → connect → transact
2. Integration tests with real Cashu mint (regtest)
3. Integration tests with real Fedimint federation (regtest)
4. Security audit of L402/NUT-24 auth paths
5. Load testing for multi-user scenarios

### Blocked Items (Waiting on Upstream)
- **Ark SDK**: No production SDK available. Track `@arkade-os/sdk` release.
- **Programmable eCash (3.2)**: NOT IMPLEMENTED. Cashu NUT-XX not adopted. No code to enable.
- **ZK reissuance (3.3)**: NOT IMPLEMENTED. Requires Cashu protocol support.
- **Advanced Cashu (3.5)**: NOT IMPLEMENTED. P2BK, atomic swaps pending upstream.
- **SP crypto**: Placeholder ECDH. Needs libsecp256k1 JS binding or backend service.
- **CTV+CSFS for Ark**: Requires Bitcoin soft-fork. Track BIP proposals.

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

### 2.1 — Fedimint v0.10.0 Upgrade
**Source:** Doc 1
**File:** `docker-compose.yml`
**What:** Upgrade from `fedimintd:v0.5.0` to `v0.10.0` ("Lighthouse").
**Includes:** ConnectorRegistry transport config, Iroh networking, updated SDK compatibility.

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

### 2.3 — CDK Cloud-Native Mint Upgrade
**Source:** Doc 3 — CDK replaces Nutshell for production
**File:** `docker-compose.yml`
**What:** Replace `cashubtc/nutshell` with CDK-based mint for production deployments.
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

### 2.7 — Monitoring Stack
**Source:** Doc 3 (CDK Prometheus), Doc 7 (operator-grade monitoring)
**File:** `docker-compose.yml`
**What:** Add Prometheus + Grafana to Docker stack. Expose mint/federation/LN metrics.
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
**Honest status:** 2 of 6 items implemented. 3 items NOT BUILT (blocked on upstream). 1 unverified.

### 3.1 — Guardian Governance Framework ✅
**Source:** Doc 7
**File:** `lib/community-generator.ts`
**What:** Guardian selection criteria, rotation policy, incident response, quorum management, treasury use policy.
**Status:** Complete. Real BFT quorum scaling (2f+1), `checkGuardianRotation()` with uptime/liveness enforcement, governance document generator.

### 3.2 — Programmable eCash (STARK/Cairo Spending Conditions) ❌ NOT IMPLEMENTED
**Source:** Doc 6 — NUT-XX
**What:** Conditional ecash tokens (escrow, subscriptions, proof-of-service). Agent pays token that's only spendable when service is proven delivered.
**Status:** No code exists. No SpendCondition types, no evaluateConditions(), no createAgentEscrow(). Blocked on Cashu NUT-XX protocol adoption.

### 3.3 — ZK Verified Reissuance ❌ NOT IMPLEMENTED
**Source:** Doc 6 — arXiv paper on stateless agent wallets
**What:** Implement audit-log + ZK reissuance pattern for agent wallets. Ephemeral wallets that can circulate and reissue tokens without centralized mediation.
**Status:** No code exists. No AuditedAgentWallet class, no reissue() method, no verifyAuditChain(). Blocked on Cashu protocol support for ZK proofs.

### 3.4 — Hardware Wallet Support (BIP392/BIP376) ✅
**Source:** Doc 5
**What:** SP descriptor support and PSBT spending for hardware signing devices.
**Status:** Complete. Real descriptor generation with functional checksum. Honest HW wallet support matrix (all 6 devices: "not yet supported" — accurate as of Feb 2026). PSBT field structure real but ECDH tweak placeholder.

### 3.5 — Advanced Cashu Features ❌ NOT IMPLEMENTED
**Source:** Doc 3
**What:** NUT-28 P2BK, background proof state verification, multi-mint atomic swaps.
**Status:** No code exists. No P2BKToken, no ProofStateVerifier, no executeAtomicSwap(). Blocked on Cashu protocol evolution.

### 3.6 — Numo NFC Merchant Integration ❓ UNVERIFIED
**Source:** Doc 3
**What:** Tap-to-pay for merchants using Numo NFC cards. Deep integration with merchant directory.
**Status:** Component references exist in `merchant-onboard.tsx`. Full NFC integration not confirmed by code audit.

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

## Phase 4: Citadel — Production + Grant Deployment

**Goal:** Production hardening, Longmont pilot, grant applications, replication.
**Research drivers:** Doc 7 (grant templates, BCE patterns, pilot-to-scale)
**Honest status:** All 5 items have real, substantive code. But this is planning/tooling — no actual pilot deployment has happened.

### 4.1 — Longmont Pilot Deployment
**Source:** Doc 7, Spec §8
**What:** Deploy full ArxMint stack for Longmont Bitcoin meetup.
**KPIs (from Doc 7 template):**
- 30 merchants onboarded by month 6
- 300 monthly active spenders by month 6
- 98%+ payment success rate
- 99.5% federation uptime
- 2+ spend events/user/month

### 4.2 — Grant Applications
**Source:** Doc 7
**Targets:**
- **FBCE Round 3** (if announced): Use Doc 7 template. Emphasize working pilot, BCE maturity metrics, open-source playbook.
- **OpenSats**: Emphasize CDK integration, cashu-ts/Coco compatibility, operator-grade monitoring. Align with Wave 16 priorities.
- **Fedi grants**: Emphasize Community Generator integration, Fedimint SDK usage.

### 4.3 — Grant Reporting Dashboard
**Source:** Doc 7 — OpenSats reporting requirements
**What:** Built-in export from dashboard: monthly progress notes, KPI snapshots, budget tracking.
**Format:** Matches OpenSats cadence (monthly first 3 months, then quarterly).

### 4.4 — Replication Playbook
**Source:** Doc 7 — "BCE in a box"
**What:** Publish open-source deployment playbook for other communities.
**Contents:** Infrastructure setup, guardian recruitment guide, merchant onboarding kit, monitoring runbook, governance template.

### 4.5 — Multi-City Federation
**Source:** Doc 7 — pilot-to-scale timeline
**What:** Extend from Longmont to additional cities. Inter-federation commerce via Coco multi-mint.

---

## Dependency Graph

```
Phase 0 (Fortify) ─── must complete before ──→ Phase 1 (Keystone)
                                                    │
                                                    ├── 1.1 NUT-24 ──→ 2.8 Gateway Bridge
                                                    ├── 1.2 Spend Router ──→ 2.2 Ark SDK
                                                    ├── 1.3 BCE Metrics ──→ 4.1 Pilot
                                                    ├── 1.4 Merchant Flow ──→ 4.1 Pilot
                                                    └── 1.6 Agent Wallets ──→ 3.2 Programmable eCash

Phase 2 (Spire) ─────────────────────────────→ Phase 3 (Aether)
    │                                               │
    ├── 2.1 Fedimint v0.10.0                        ├── 3.1 Governance ──→ 4.1 Pilot
    ├── 2.2 Ark SDK ──→ 2.6 SP Infra                ├── 3.2 STARK ──→ depends on upstream
    ├── 2.3 CDK ──→ 2.7 Monitoring                  └── 3.3 ZK Reissuance ──→ depends on upstream
    ├── 2.4 Coco ──→ 4.5 Multi-City
    └── 2.5 NUT-26 ──→ 3.6 Numo NFC

Phase 4 (Citadel) depends on:
    - Phase 0 complete (security)
    - Phase 1.3 + 1.4 (metrics + merchants)
    - Phase 2.7 (monitoring)
    - Phase 3.1 (governance)
```

---

## Research → Roadmap Traceability

Every roadmap item traces back to at least one research document:
Spec references for these items are in `docs/spec.md`.

| Roadmap Item | Doc 1 | Doc 2 | Doc 3 | Doc 4 | Doc 5 | Doc 6 | Doc 7 |
|---|---|---|---|---|---|---|---|
| 0.1 Keyset ID validation | | | | | | X | |
| 0.2 SP status fix | X | | | | X | | |
| 0.3 Security tiers | | X | | | | | |
| 0.4 Remote signer | | X | | | | | |
| 1.1 NUT-24 paywalls | | | X | | | | |
| 1.2 Spend router | | | | X | | | |
| 1.3 BCE metrics | | | | | | | X |
| 1.4 Merchant onboarding | | | | | | | X |
| 1.5 Macaroon bakery | | X | | | | | |
| 1.6 Agent wallets | X | | | | | X | |
| 1.7 G-Bot integration | X | | | | | | |
| 2.1 Fedimint v0.10.0 | X | | | | | | |
| 2.2 Ark SDK | | | | X | | | |
| 2.3 CDK upgrade | | | X | | | | |
| 2.4 Coco multi-mint | | | X | | | | |
| 2.5 NUT-26 QR/NFC | | | X | | | | |
| 2.6 SP infrastructure | | | | | X | | |
| 2.7 Monitoring | | | X | | | | X |
| 2.8 Gateway bridge | | X | | | | | |
| 3.1 Governance | | | | | | | X |
| 3.2 STARK eCash | | | | | | X | |
| 3.3 ZK reissuance | | | | | | X | |
| 3.4 HW wallet (BIP392) | | | | | X | | |
| 3.5 Advanced Cashu | | | X | | | | |
| 3.6 Numo NFC | | | X | | | | |
| 4.1 Longmont pilot | | | | | | | X |
| 4.2 Grant applications | | | | | | | X |
| 4.3 Reporting dashboard | | | | | | | X |
| 4.4 Replication playbook | | | | | | | X |
| 4.5 Multi-city | | | X | | | | X |

---

## Version Naming

Following the positioning doc's Tartarian builder theme:

| Phase | Codename | Meaning |
|---|---|---|
| Phase 0 | **Fortify** | Harden the foundation before building higher |
| Phase 1 | **Keystone** | The critical stone that holds the arch together |
| Phase 2 | **Spire** | The structure rises — full stack visible |
| Phase 3 | **Aether** | Advanced capabilities, reaching higher |
| Phase 4 | **Citadel** | The complete sovereign fortress — deployed and defended |
