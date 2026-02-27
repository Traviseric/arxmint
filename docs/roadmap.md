# ArxMint — Implementation Roadmap

**Version:** 1.0 — February 27, 2026
**Informed by:** 7 research documents cross-referenced in `docs/research-crossref.md`
**Canonical spec:** `docs/spec.md` (all `Spec §X` references point here)
**Codename convention:** Phase names follow the brand versioning from positioning doc (Keystone → Spire → Aether)

---

## Roadmap Overview

```
Phase 0: Fortify     (Security hardening)           ✅ COMPLETE
Phase 1: Keystone    (Core architecture upgrades)   ✅ COMPLETE
Phase 2: Spire       (Full privacy + commerce stack) ← NEXT
Phase 3: Aether      (Advanced features + scale)
Phase 4: Citadel     (Production + grant deployment)
```

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

## Phase 4: Citadel — Production + Grant Deployment

**Goal:** Production hardening, Longmont pilot, grant applications, replication.
**Research drivers:** Doc 7 (grant templates, BCE patterns, pilot-to-scale)

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
