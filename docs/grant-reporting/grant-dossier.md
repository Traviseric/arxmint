# ArxMint â€” Shared Grant Dossier

**Version:** 1.0 â€” February 28, 2026
**Purpose:** Authoritative source for grant applications (OpenSats, HRF Bitcoin Development Fund, Spiral). Adapt per-program; do not rewrite from scratch.
**Adapters:** `lib/grant-templates.ts` (`generateOpenSatsApplication()`, `generateFBCEApplication()`)
**Budget ranges:** $75K (minimum viable) Â· $200K (full build-out)

---

## 1. Executive Summary

ArxMint is open-source infrastructure that lets anyone create a private Bitcoin circular economy from a single natural-language prompt. Type a description of your community â€” ArxMint generates Fedimint federation configs, Cashu ecash mint settings, Lightning L402 commerce rails, and privacy defaults â€” all deployable with one Docker command.

**The problem it solves:** Bitcoin communities that want to run local circular economies face three hard blockers. First, setting up Fedimint, Cashu, and Lightning together requires deep multi-protocol expertise that most community builders lack. Second, existing custodial wallets expose users to deplatforming risk and strip away financial privacy. Third, AI agents â€” the fastest-growing participants in digital commerce â€” have no shared private payment infrastructure with the humans they work alongside.

**The solution:** ArxMint collapses weeks of infrastructure work into minutes. A community builder describes their needs in plain language; ArxMint generates the complete deployment config and hands back a single Docker command. The same infrastructure serves human members (ecash, Lightning) and AI agents (L402 paywalls, NUT-24 ecash HTTP 402). Privacy is on by default: ecash proofs never leave the client, Silent Payments and Ark VTXOs are pre-wired when available, and no user data is stored server-side.

**Proof of work:** The Longmont, CO Bitcoin meetup is the first pilot target â€” 30 merchant target, 300 monthly active spenders within 6 months, 98%+ payment success rate. All code is MIT-licensed and live on GitHub today.

---

## 2. Technical Scope

### Architecture Overview

ArxMint is a Next.js 15 App Router application backed by a Docker Compose stack. The frontend generates community configurations from natural language prompts; the backend stack runs the actual Bitcoin infrastructure.

**Core components:**

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 15, React 19, TypeScript | Prompt â†’ config UI, wallet panel, merchant onboarding |
| State | Zustand (`lib/store.ts`) | Client-side balance, community, connection slices |
| Ecash client | `@cashu/cashu-ts` 3.5.0 (`lib/cashu-sdk.ts`) | Mint/melt proofs, NUT-24 paywall verification |
| Federation client | `@fedimint/core` 0.1.3 WASM (`lib/fedimint-sdk.ts`) | Browser-side federation join, balance, payments |
| Lightning | `@lightninglabs/lnc-web` 0.3.5 (`lib/lightning-agent.ts`) | LNC-Web WASM, L402 challenge/response, tiered security |
| Privacy | `lib/privacy-defaults.ts`, `lib/silent-payments.ts` | BIP-352 Silent Payments, CoinJoin, Ark VTXOs, scoring |
| Spend router | `lib/spend-router.ts` | Policy-driven path selection (amount/privacy/availability) |
| Monitoring | Prometheus + Grafana | Service health, payment metrics, guardian uptime |
| Infra | Docker Compose, LND, Nutshell/CDK, Fedimint, Aperture | Full Bitcoin stack |

**Security boundaries:**
- Cashu proofs stored client-side only in AES-256-GCM encrypted IndexedDB vault â€” never in the database
- Lightning agents default to `WATCH_ONLY` tier; signing keys isolated via `litd` remote signer
- Auth.js with Nostr NIP-98 + email magic link; HttpOnly/Secure cookies; route gating

### Roadmap Phases

ArxMint follows a structured production path (Phases Aâ€“E â†’ Production Gate) and a parallel feature path (Phases 0â€“4).

**Production path** (must complete before accepting mainnet funds):

| Phase | Codename | Scope |
|-------|---------|-------|
| Phase A | Foundation | Postgres + Auth.js + Nostr NIP-98 + client-side encrypted vault |
| Phase B | Payments | Wire L402 to real LND, wire NUT-24 to real mint, Payment SDK for marketplace |
| Phase C | Infrastructure | Caddy reverse proxy, network hardening, Prometheus/Grafana, backup automation |
| Phase D | E2E Testing | Regtest Docker stack, 22 test flows across payment/vault/auth/failure paths |
| Phase E | Hardening | Rate limiting, input validation, structured logging, security headers, pilot value caps |

**Feature path** (parallel development, brand codenames):

| Phase | Codename | Scope | Status |
|-------|---------|-------|--------|
| Phase 0 | **Fortify** | Security hardening: keyset ID validation, SP status honesty, Lightning security tiers, remote signer | In progress |
| Phase 1 | **Keystone** | Core upgrades: NUT-24 ecash paywalls, spend router, BCE maturity metrics, merchant NFC | In progress |
| Phase 2 | **Spire** | Full privacy + commerce stack: CDK integration, multi-mint (Coco), programmable ecash, ZK reissuance | In progress |
| Phase 3 | **Aether** | Advanced features + scale: Ark SDK, multi-city federation network, grant reporting exports | Post-pilot |
| Phase 4 | **Citadel** | Pilot launch + growth: Longmont deployment, grant-funded scale, replication playbook | Planning |

### Current Implementation Status

All foundational components are built and running. The community generator (`lib/community-generator.ts`) produces valid Docker Compose configs from prompts. The wallet panel (`components/wallet-panel.tsx`) supports send/receive across Fedimint, Cashu, and Lightning. The privacy dashboard scores configurations against 10+ privacy dimensions. The agent API (`app/api/agent/route.ts`) serves L402-gated endpoints.

**Production gate items** (Phases Aâ€“E) are in active development. The project has a clear Production Readiness Gate with explicit checkboxes across data safety, auth, payment correctness, infrastructure, and testing â€” no real funds accepted until all pass.

### What the Grant Funds

Grant funding accelerates three areas:

1. **Production hardening** â€” Phases Aâ€“E (database, vault, payments, infrastructure, testing). Currently built on mock data; grant funds wiring to real Bitcoin infrastructure.
2. **Pilot deployment** â€” Longmont, CO: server costs, merchant onboarding, NFC cards, community events, 6-month operation.
3. **Replication playbook** â€” Open-source documentation so any community can deploy their own ArxMint from the playbook.

---

## 3. Budget Template

### $75K Scenario â€” Minimum Viable Pilot

Focus: one pilot city (Longmont), production hardening, and replication playbook.

| Category | Description | Amount |
|----------|-------------|--------|
| Infrastructure | Vultr 16GB/6-core VPS ($80/mo Ã— 12), backup storage, domain, SSL, initial Lightning channel funding (1M+ sats) | $6,000 |
| Development | Travis: Phase Aâ€“E completion, pilot deployment (approx. 600 hrs @ $100/hr effective) | $40,000 |
| Community | Merchant onboarding kit, Numo NFC cards (30 merchants), community events, printed materials | $12,000 |
| Operations | Monitoring maintenance, guardian coordination, user support (6 months) | $12,000 |
| Contingency | Unexpected costs, Lightning liquidity top-ups | $5,000 |
| **Total** | | **$75,000** |

**Milestone spend breakdown:**
- Q1 (Months 1â€“3): 50% â€” Infrastructure + Phase Aâ€“E completion + first merchant cohort
- Q2 (Months 4â€“6): 30% â€” Growth phase, full merchant target, community events
- Q3 (Months 7â€“8): 20% â€” Evaluation, replication playbook, grant reporting

### $200K Scenario â€” Full Build-Out

Focus: Longmont pilot + two additional city pilots + full feature path (Spire + Aether) + Payment SDK for marketplace integration.

| Category | Description | Amount |
|----------|-------------|--------|
| Infrastructure | 3 cities Ã— VPS + backup + channels ($240/mo Ã— 18 months), CDN, monitoring stack | $15,000 |
| Development | Travis + 1 contributor: Phase Aâ€“E + Spire + Aether + Payment SDK (approx. 1,600 hrs total) | $120,000 |
| Community | 3 cities Ã— merchant programs, NFC cards (90 merchants), events, ambassador stipends | $35,000 |
| Operations | 18 months Ã— multi-city guardian coordination, monitoring, support | $20,000 |
| Research & Travel | Conference presentations, in-person guardian/merchant training | $7,000 |
| Contingency | 15% buffer for upstream SDK changes (CDK, Ark) | $3,000 |
| **Total** | | **$200,000** |

**Milestone spend breakdown:**
- Q1: 30% â€” Production hardening + Longmont soft launch
- Q2: 25% â€” Longmont full launch + City 2 pre-launch
- Q3: 25% â€” City 2 launch + City 3 pre-launch, Spire features
- Q4: 20% â€” City 3 launch, Aether features, evaluation, replication playbook

---

## 4. Team Bios Template

### Travis [Last Name] â€” Lead Developer & Project Founder

_[Fill in: 2â€“3 sentences on Bitcoin/Lightning background. Example structure below.]_

Background in [discipline], focused on Bitcoin infrastructure since [year]. Built [relevant prior work]. Active contributor to [Fedimint / cashu-ts / LNC-Web / relevant OSS]. Organized the Longmont Bitcoin meetup since [year] and identified the need for accessible circular economy tooling firsthand.

**Relevant contributions:**
- ArxMint (this project) â€” full-stack, all phases
- [Other OSS contributions â€” link to GitHub PRs or repos]
- [Community work â€” Longmont meetup, BTCPay/Fedimint deployments, etc.]

**Grant/pilot ties:** Direct operator of the Longmont pilot. Responsible for guardian coordination, merchant onboarding, and all grant reporting.

---

### Contributors

_[Add as the project grows. Template per contributor:]_

**[Name] â€” [Role]**
Background: [2 sentences]. Contributions: [specific files or features]. Community ties: [location, meetup, etc.].

---

## 5. Open-Source Licensing Statement

ArxMint is released under the **MIT License**. All source code, deployment configurations, governance templates, monitoring configs, merchant onboarding materials, and the replication playbook are publicly available on GitHub.

**Bitcoin ethos commitments:**
- **Non-custodial:** No server ever holds user funds. Cashu proofs live in the user's encrypted local vault (IndexedDB, AES-256-GCM). Server stores only transaction metadata â€” never proof secrets.
- **No VC capture:** ArxMint is not VC-funded and will not accept funding that requires fee extraction, data monetization, or control over user wallets.
- **Protocol-first:** ArxMint builds on and contributes back to open-source Bitcoin infrastructure: Fedimint, cashu-ts, LNC-Web, Aperture. We do not fork protocols to create proprietary lock-in.

**Upstream dependencies (all open-source):**

| Component | License | Repository |
|-----------|---------|-----------|
| Fedimint | MIT | github.com/fedimint/fedimint |
| cashu-ts | MIT | github.com/cashubtc/cashu-ts |
| LNC-Web | MIT | github.com/lightninglabs/lnc-web |
| Aperture (L402) | MIT | github.com/lightninglabs/aperture |
| CDK (Cashu Development Kit) | MIT | github.com/cashubtc/cdk |

Grant recipients (OpenSats, HRF, Spiral) will receive monthly progress reports. All deliverables will be published before the grant period closes.

---

## 6. Threat Model Overview

### Non-Custodial Architecture

ArxMint's security model is built around one principle: **the server never has what it cannot lose on the user's behalf.**

| Asset | Where it lives | Server access |
|-------|---------------|--------------|
| Cashu ecash proofs | Client â€” AES-256-GCM IndexedDB vault | None â€” proofs never transmitted to server |
| Cashu seed phrase | Client â€” user-controlled, NUT-13 backup | None |
| LND signing keys | Hardened signer process (`litd` remote signer) | No agent process holds keys |
| Fedimint guardian keys | Distributed across guardians (BFT quorum) | No single point of control |
| User payment metadata | Postgres â€” amount, backend, status only | No proof secrets in DB |
| Auth sessions | HttpOnly/Secure/SameSite cookies | Server-side session token only |

### Pilot Value Caps (Longmont)

The Longmont pilot enforces conservative caps to limit blast radius during the engineering phase:

- **Maximum wallet balance per user:** 50,000 sats (configurable)
- **Maximum single transaction:** configurable per community
- **Maximum daily volume per user:** configurable per community
- Caps are enforced server-side, not just in the UI
- Prominently disclosed to users before wallet setup

These caps are not permanent â€” they are pilot-phase safeguards while the system is validated on testnet and then mainnet with real but bounded funds.

### Single-Host Pilot â€” Honest Disclosure

**The Longmont pilot runs 3 Fedimint guardians on a single Vultr VPS.** This is a deliberate engineering choice and an honest limitation:

- **What it means:** The 3-guardian federation provides the software guarantee of BFT quorum (2-of-3), but since all guardians share one physical server, the actual trust assumption collapses to single-server trust.
- **Why we do it anyway:** The engineering pilot validates the full software stack â€” community config generation, Docker deployment, merchant onboarding, L402 + NUT-24 payment flows, monitoring â€” before distributing guardians to multiple operators.
- **Guardian distribution timeline:** Once the pilot validates the software (target: Month 6), the production path calls for distributing guardians to at least 3 separate operators in different physical locations before accepting general public funds.
- **Mainnet migration plan:** Detailed in `docs/mainnet-migration-docs/reference/archives/root/plan.md` (see task 144). Short version: freeze pilot, distribute guardians, re-DKG, reopen with production trust assumptions and appropriate value caps removed.

This is consistent with Fedimint's own guidance for engineering pilots and is disclosed in all grant applications and community communications.

### Privacy Architecture â€” What Is and Is Not Claimed

| Privacy feature | Fedimint | Cashu | On-chain |
|----------------|---------|-------|---------|
| Ecash (no payment graph) | Yes | Yes | No |
| Silent Payments (BIP-352) | Requires federation wallet module | Client-side | Yes |
| CoinJoin | No | No | Yes (Whirlpool/JoinMarket) |
| Ark VTXOs | Stub (awaiting Ark SDK) | No | Pending soft-fork |
| Lightning (partial graph privacy) | Yes | Yes | N/A |

ArxMint's privacy dashboard shows per-backend support status honestly. Silent Payments for Fedimint peg-outs requires a federation-level module change â€” it is not a client toggle, and the dashboard labels it accordingly (Phase 0.2 Fortify fix).

---

*This dossier was generated from codebase artifacts by the ArxMint agent pipeline on 2026-02-28. All figures drawn from `lib/pilot-deployment.ts` (KPI targets), `lib/grant-templates.ts` (narratives), `docs/core/roadmap.md` (phases), and `docs/core/spec.md` (architecture). Update this file when pilot data, team bios, or budget figures change.*
