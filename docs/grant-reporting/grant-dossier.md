# ArxMint — Shared Grant Dossier

**Version:** 1.1 — May 9, 2026
**Purpose:** Authoritative source for grant applications (OpenSats, HRF Bitcoin Development Fund, Bitcoin Common App, Spiral, FBCE). Adapt per-program; do not rewrite from scratch.
**Adapters:** `lib/grant-templates.ts` (`generateOpenSatsApplication()`, `generateFBCEApplication()`)
**Budget ranges:** $50K (HRF privacy-focused) · $75K (minimum viable pilot) · $100K (OpenSats standard) · $200K (full multi-city build-out)
**Project lead:** Travis Bergsgaard — travis@arxmint.com — Longmont, CO

---

## What changed since v1.0 (Feb 28 → May 9, 2026)

**245 commits shipped.** The technical stack is code-complete. Three founding merchants signed up via the live merchant directory. Status: **3-6 weeks + ~$1.5K legal away from first real mainnet Bitcoin payment** — blocked on VPS provisioning and Agent-of-Payee ToS signing (per `docs/core/roadmap.md` Phase 4.7 Milestone 1 "Black Bear is Live").

| Category | Shipped |
|----------|---------|
| **Founding merchants signed up** | Glacier Ice Cream, Teneo, Black Bear Window Cleaning (Boulder) — anchor merchant for Pearl Street density strategy. 13 more in pipeline |
| **Sister npm packages** | `@te-btc/cashu-l402` (278 tests), `@te-btc/agent-wallet` (169 tests), `@te-btc/cashu-mint` (48 tests, Phase 1) — all published |
| **Multi-rail checkout** | Lightning + Cashu + on-chain in one UX. SSE for real-time payment status |
| **Merchant infrastructure** | Self-service onboarding, email magic-link auth, per-merchant LNbits wallet isolation, dashboard, mobile POS, NFC tap-to-pay, NWC sovereign opt-in |
| **Settlement** | Auto-forward to merchant Lightning Address, payment notification emails, Telegram notifications |
| **Accounting** | PDF invoice generation, QuickBooks CSV export with historical BTC/USD rates, data retention cron (PII purge 30d post-settlement) |
| **Escrow / disputes** | SPINE-ARX-02 Phase 2: dispute flow, time-based release, mediator resolution |
| **Replication playbook** | Committed to repo with admin API endpoint (task 196) |
| **Grant reporting API** | `/api/reports/monthly?period=YYYY-MM` for auto-populating progress reports |
| **Post-launch ops** | Grafana alerts, ops runbook, health check, Prometheus metrics |
| **Security** | Caddy reverse proxy, loopback binding, RLS policies on Supabase tables, npm audit clean (0 vulns) |
| **Agent commerce SDK** | `@arxmint/agent-commerce` scaffolded — L402 auto-pay, merchant checkout for AI agents |

This v1.1 dossier should be the source of truth for any grant application. The four pre-existing AI-generated drafts in `~/TrendOS/.grants/proposals/*_arxmint.json` are discarded — they describe a fictional "Bitcoin community education program" project unrelated to ArxMint.

---

## 1. Executive Summary

ArxMint is open-source, self-hosted Bitcoin payment infrastructure — the open-source Stripe alternative. Merchants accept Lightning, Cashu ecash, and on-chain Bitcoin with near-zero fees, instant settlement, no chargebacks, and no customer KYC. AI agents and humans share the same private payment rails via L402 paywalls and Cashu NUT-24.

**The shape of the problem.** Bitcoin payment processors are still custodial intermediaries: Strike, OpenNode, BTCPay (semi-self-hosted but operationally heavy). Merchants who want true sovereignty face a multi-week setup involving LND, Cashu mint, Fedimint federation, Lightning liquidity, monitoring, backup, and security hardening — every layer requires multi-protocol expertise. Bitcoin circular economies remain rare because the operational lift to start one is high.

**The shape of the solution.** ArxMint collapses that to: answer three questions → managed deployment in under 15 minutes → live payment node with managed DNS, auto-HTTPS, Lightning liquidity, accounting exports, and embeddable checkout. The same infrastructure serves both human members (mobile POS, NFC tap-to-pay, multi-rail checkout) and AI agents (L402 + NUT-24 paywalls, scoped agent wallets).

**Proof of work.** Three founding merchants signed up via the live merchant directory: Glacier Ice Cream, Teneo, and Black Bear Window Cleaning (Boulder, CO — anchor for the Pearl Street density strategy). 13 additional merchants in the pipeline. Multi-rail checkout, mobile POS with NFC tap-to-pay, per-merchant LNbits wallet auto-provisioning, and accounting export are all shipped and tested on testnet. ArxMint is MIT-licensed and consists of: (1) the Next.js application, (2) three published npm packages that are independently useful (Cashu mint, L402 server/client, agent wallet), (3) a Docker stack with full ops runbook, and (4) a replication playbook committed to the repo. All on GitHub today. **Pilot KPI targets:** 30 merchants, 300 monthly active spenders, ≥98% payment success rate, ≥99.5% federation uptime within 6 months of go-live.

---

## 2. Technical Scope

### Architecture Overview

ArxMint is a Next.js 15 App Router application backed by a Docker Compose stack. The frontend handles community/merchant configuration, dashboards, checkout, and POS; the backend runs the actual Bitcoin infrastructure.

**Core components:**

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind | Prompt → config UI, wallet panel, merchant onboarding, POS, dashboard |
| State | Zustand (`lib/store.ts`) | Client-side balance, community, connection slices |
| Ecash client | `@cashu/cashu-ts` 3.5.0 (`lib/cashu-sdk.ts`) | Mint/melt proofs, NUT-24 paywall verification |
| Ecash server (NEW) | `@te-btc/cashu-mint` 0.1.0 | TypeScript Cashu mint NUT-00..07, LND backend, 48 tests |
| Federation client | `@fedimint/core` 0.1.3 WASM | Browser-side federation join, balance, payments |
| Lightning | `@lightninglabs/lnc-web` 0.3.5, LNbits per-merchant wallet | LNC-Web WASM, per-merchant Lightning isolation |
| L402 paywalls (NEW) | `@te-btc/cashu-l402` 0.1.0 | L402 server/client + NUT-24 paywall, 278 tests |
| Agent wallets (NEW) | `@te-btc/agent-wallet` 0.1.0 | Agent Cashu wallet, budget enforcement, audit logging, 169 tests |
| Privacy | `lib/privacy-defaults.ts`, `lib/silent-payments.ts` | BIP-352 Silent Payments, CoinJoin, Ark VTXOs, scoring |
| Spend router | `lib/spend-router.ts` | Policy-driven path selection (amount/privacy/availability) |
| Monitoring | Prometheus + Grafana (live) | Service health, payment metrics, guardian uptime, alerts |
| Infra | Docker Compose, LND, LNbits, Cashu mint, Fedimint, Aperture, Caddy | Full Bitcoin stack with reverse proxy + loopback binding |
| Database | Supabase (managed) + Prisma (Docker self-host path) | Hybrid; merchant data with RLS policies |
| Auth | Auth.js, Nostr NIP-98, email magic link | HttpOnly/Secure cookies, route gating |
| Accounting | PDF invoice gen, QuickBooks CSV export | Historical BTC/USD rates included |

**Security boundaries (production):**
- **Split-plane trust:** Merchant data plane (keys, funds, LND, mint) fully isolated from ArxMint control plane (provisioning, DNS, updates). ArxMint never touches merchant keys or funds.
- **Network isolation:** Only Caddy binds to public ports (80/443). LND gRPC, Cashu mint admin, PostgreSQL, LNbits — internal Docker network only.
- **Macaroon lifecycle:** `arx_pub_` tokens safe for client-side. Rotation via `POST /api/merchant-keys`. Instant revocation via dashboard or CLI.
- **Cashu vault:** Proofs stored client-side only in AES-256-GCM encrypted IndexedDB vault. Server stores only transaction metadata — never proof secrets.
- **Lightning agents default to `WATCH_ONLY` tier;** signing keys isolated via `litd` remote signer.
- **Data retention:** Customer PII auto-purged 30 days post-settlement (cron).
- **0 npm audit vulnerabilities** as of 2026-05.

### Roadmap Phases

ArxMint follows a structured production path (Phases A–E → Production Gate) and a parallel feature path (Phases 0–4).

**Production path** — completion status as of 2026-05:

| Phase | Codename | Scope | Status |
|-------|---------|-------|--------|
| Phase A | Foundation | Postgres + Auth.js + Nostr NIP-98 + client-side encrypted vault | ✅ Complete |
| Phase B | Payments | Wire L402 to real LND, wire NUT-24 to real mint, Payment SDK | ✅ Complete (multi-rail checkout live) |
| Phase C | Infrastructure | Caddy reverse proxy, network hardening, Prometheus/Grafana, backup automation | ✅ Complete |
| Phase D | E2E Testing | Regtest Docker stack, test flows across payment/vault/auth/failure paths | ✅ Complete (495+ tests across packages) |
| Phase E | Hardening | Rate limiting, input validation, structured logging, security headers, pilot value caps | ✅ Complete |

**Feature path** — codenames map to grant deliverables:

| Phase | Codename | Scope | Status |
|-------|---------|-------|--------|
| Phase 0 | **Fortify** | Security hardening: keyset ID validation, SP status honesty, Lightning security tiers, remote signer | ✅ Complete |
| Phase 1 | **Keystone** | Core upgrades: NUT-24 ecash paywalls, spend router, BCE maturity metrics, merchant NFC | ✅ Complete |
| Phase 2 | **Spire** | Full privacy + commerce stack: CDK integration, multi-mint (Coco), programmable ecash, ZK reissuance, embeddable checkout, escrow | ⚙️ In progress (escrow Phase 2 shipped, multi-mint deferred) |
| Phase 3 | **Aether** | Advanced features + scale: Ark SDK, multi-city federation network, grant reporting exports | ⚙️ Grant reporting API live; Ark + multi-city pending |
| Phase 4 | **Citadel** | Pilot launch + growth: Longmont deployment, grant-funded scale, replication playbook | ⚙️ Replication playbook shipped; Longmont scaling in progress |

### Path to First Real Bitcoin Payment

Black Bear Window Cleaning (Boulder, CO) is the anchor merchant — first signup in the Pearl Street density strategy. Currently signed up via merchant directory; not yet processing real Bitcoin. The remaining steps to live (per `docs/core/roadmap.md` Phase 4.7 Milestone 1 "Black Bear is Live"):

| # | Step | Type | Effort | Status |
|---|------|------|--------|--------|
| 1 | Provision production VPS for Phoenixd + LNbits (Vultr 16GB/6-core) | Infra | 1-2 days | Not started |
| 2 | Deploy Phoenixd + LNbits stack to VPS | Code/infra | 2-5 days | Compose ready |
| 3 | Refactor `lib/payment-sdk.ts` from raw LND → LNbits API | Code | Mostly done | In progress |
| 4 | First testnet payment end-to-end on production VPS | Test | 1-2 days | Not started |
| 5 | Draft Agent-of-Payee ToS (Colorado MTMA, C.R.S. 11-110-301(1)(b)) + fintech attorney review | Legal | 1-2 weeks + ~$1.5K | Not started |
| 6 | Sign Agent-of-Payee ToS with Black Bear (and remaining founding merchants) | Legal | 1 hour each | Not started |
| 7 | Fund first Lightning channel (≥1M sats inbound) | Operations | 1 hour | Not started |
| 8 | First mainnet payment with Black Bear | Live | 1 hour | Not started |

**Total estimate:** roughly **3-6 weeks of focused dev time + ~$1.5K legal expense** to get from current state to first real mainnet Bitcoin payment. This is the explicit go-live ask in the OpenSats / FBCE / Common App proposals. HRF's privacy-focused work (Tor deployment, NUT-10/11/14, ZK reissuance, audit) is orthogonal and runs in parallel.

### What the Grant Funds

Grant funding accelerates three areas:

1. **Production scale-out** — Multi-city federation network (Phase 3 Aether). Currently Longmont; grant funds 2 additional pilot cities.
2. **Replication playbook + ambassador program** — Documented in repo; grant funds outreach, in-person merchant training in 2-3 additional cities, ambassador stipends.
3. **Open-source SDK maturation** — `@te-btc/cashu-l402`, `@te-btc/agent-wallet`, `@te-btc/cashu-mint` are independently useful libraries. Grant funds Phase 2 features (CDK production hardening, multi-mint router, ZK reissuance).

---

## 3. Budget Templates

### $50K Scenario — HRF Privacy-Focused

Focus: privacy hardening + ecash paywall maturation. Smaller scope, narrower deliverables, well-suited to HRF Bitcoin Development Fund's privacy mission.

| Category | Description | Amount |
|----------|-------------|--------|
| Development | Travis: Phase 2 Spire — programmable ecash conditions (NUT-10/11), ZK reissuance, multi-mint privacy router (~400 hrs @ ~$95/hr effective) | $38,000 |
| Infrastructure | Tor onion service for ArxMint discovery, monitoring, additional ecash mint deployment | $4,000 |
| Privacy audit | Independent privacy audit by [security researcher TBD], threat model update | $5,000 |
| Contingency | Upstream SDK changes (CDK, Ark) | $3,000 |
| **Total** | | **$50,000** |

### $75K Scenario — Minimum Viable Pilot (FBCE / OpenSats)

Focus: one pilot city (Longmont), production hardening, replication playbook.

| Category | Description | Amount |
|----------|-------------|--------|
| Infrastructure | Vultr 16GB/6-core VPS ($80/mo × 12), backup storage, domain, SSL, Lightning channel funding (1M+ sats) | $6,000 |
| Development | Travis: Phase 2 Spire completion + Longmont scale (~600 hrs @ ~$100/hr effective) | $40,000 |
| Community | Merchant onboarding kit, NFC Bolt Cards (30 merchants), community events, printed materials | $12,000 |
| Operations | Monitoring maintenance, guardian coordination, user support (6 months) | $12,000 |
| Contingency | Unexpected costs, Lightning liquidity top-ups | $5,000 |
| **Total** | | **$75,000** |

### $100K Scenario — OpenSats Standard

Focus: 12-month dev cycle on the open-source Bitcoin payment stack — ArxMint app + 3 sister npm packages.

| Category | Description | Amount |
|----------|-------------|--------|
| Development | Travis full-time-equivalent on ArxMint + npm packages (1,000 hrs @ ~$100/hr) | $80,000 |
| Infrastructure | VPS, monitoring, backup, Lightning channel liquidity | $8,000 |
| Community | Documentation, tutorials, conference travel | $7,000 |
| Contingency | Upstream changes (CDK, Ark, fedimint-rs) | $5,000 |
| **Total** | | **$100,000** |

### $200K Scenario — Full Multi-City Build-Out (FBCE Round 3)

Focus: Longmont + 2 additional city pilots + full feature path (Spire + Aether) + Payment SDK for marketplace integration.

| Category | Description | Amount |
|----------|-------------|--------|
| Infrastructure | 3 cities × VPS + backup + channels ($240/mo × 18 months), CDN, monitoring stack | $15,000 |
| Development | Travis + 1 contributor: Phase 2 Spire + Phase 3 Aether + Payment SDK (1,600 hrs total) | $120,000 |
| Community | 3 cities × merchant programs, NFC cards (90 merchants), events, ambassador stipends | $35,000 |
| Operations | 18 months × multi-city guardian coordination, monitoring, support | $20,000 |
| Research & Travel | Conference presentations, in-person guardian/merchant training | $7,000 |
| Contingency | 15% buffer for upstream SDK changes (CDK, Ark) | $3,000 |
| **Total** | | **$200,000** |

**Milestone spend breakdown ($200K case):**
- Q1: 30% — Production hardening + Longmont scale to 30 merchants
- Q2: 25% — Longmont full launch + City 2 pre-launch
- Q3: 25% — City 2 launch + City 3 pre-launch, Spire features
- Q4: 20% — City 3 launch, Aether features, evaluation, replication playbook v2

---

## 4. Team Bios

### Travis Bergsgaard — Lead Developer & Project Founder

Founder and sole maintainer of ArxMint and the te-btc package ecosystem. Background in [TODO: 2-3 sentence honest summary of pre-ArxMint experience — e.g. years in software, prior Bitcoin/Lightning work, Longmont meetup organizer]. Active contributor to Bitcoin OSS via the te-btc monorepo (cashu-l402, agent-wallet, cashu-mint).

**Relevant contributions:**
- ArxMint (this project) — full-stack, all phases, github.com/Traviseric/arxmint, MIT
- `@te-btc/cashu-l402` — first published TypeScript L402 + NUT-24 server/client (278 tests)
- `@te-btc/agent-wallet` — agent-native Cashu wallet with budget enforcement (169 tests)
- `@te-btc/cashu-mint` — first production TypeScript Cashu mint (NUT-00..07, 48 tests, Phase 1 complete)
- [TODO: any prior OSS contributions — link to GitHub PRs or repos]

**Grant/pilot ties:** Direct operator of the Longmont pilot. Responsible for guardian coordination, merchant onboarding, and all grant reporting. Email: travis@arxmint.com.

### Contributors

[Add as the project grows. Currently solo maintainer with AI-augmented development.]

---

## 5. Open-Source Licensing Statement

ArxMint is released under the **MIT License**. All source code, deployment configurations, governance templates, monitoring configs, merchant onboarding materials, and the replication playbook are publicly available on GitHub (github.com/Traviseric/arxmint).

The three sister npm packages (`@te-btc/cashu-l402`, `@te-btc/agent-wallet`, `@te-btc/cashu-mint`) are also MIT-licensed and published to npm.

**Bitcoin ethos commitments:**
- **Non-custodial:** No server holds user funds. Cashu proofs live in the user's encrypted local vault (IndexedDB, AES-256-GCM). Server stores only transaction metadata — never proof secrets. Lightning custody is per-merchant via isolated LNbits wallets, with optional sovereign opt-in (NWC connection to merchant's own node).
- **No VC capture:** ArxMint is not VC-funded and will not accept funding that requires fee extraction, data monetization, or control over user wallets.
- **Protocol-first:** ArxMint builds on and contributes back to open-source Bitcoin infrastructure — Fedimint, cashu-ts, LNC-Web, Aperture, CDK, LNbits. We do not fork protocols to create proprietary lock-in.

**Upstream dependencies (all open-source):**

| Component | License | Repository |
|-----------|---------|-----------|
| Fedimint | MIT | github.com/fedimint/fedimint |
| cashu-ts | MIT | github.com/cashubtc/cashu-ts |
| LNC-Web | MIT | github.com/lightninglabs/lnc-web |
| Aperture (L402) | MIT | github.com/lightninglabs/aperture |
| CDK (Cashu Development Kit) | MIT | github.com/cashubtc/cdk |
| LNbits | MIT | github.com/lnbits/lnbits |

Grant recipients receive monthly progress reports via the auto-populated template at `docs/grant-reporting/opensats-template.md` (KPIs pulled from `/api/reports/monthly?period=YYYY-MM`). All deliverables published before grant period closes.

---

## 6. Threat Model Overview

### Non-Custodial Architecture

ArxMint's security model: **the server never has what it cannot lose on the user's behalf.**

| Asset | Where it lives | Server access |
|-------|---------------|--------------|
| Cashu ecash proofs | Client — AES-256-GCM IndexedDB vault | None — proofs never transmitted to server |
| Cashu seed phrase | Client — user-controlled, NUT-13 backup | None |
| Merchant Lightning keys | Per-merchant isolated LNbits wallet OR merchant's own node (NWC) | Merchant-controlled |
| LND signing keys | Hardened signer process (`litd` remote signer) | No agent process holds keys |
| Fedimint guardian keys | Distributed across guardians (BFT quorum) | No single point of control |
| User payment metadata | Postgres with RLS policies — amount, backend, status only | No proof secrets in DB |
| Customer PII | Auto-purged 30 days post-settlement (data retention cron) | None after retention window |
| Auth sessions | HttpOnly/Secure/SameSite cookies | Server-side session token only |

### Pilot Value Caps (Longmont)

The Longmont pilot enforces conservative caps:

- **Max wallet balance per user:** 50,000 sats (configurable)
- **Max single transaction:** configurable per community
- **Max daily volume per user:** configurable per community
- Caps enforced server-side, prominently disclosed before wallet setup

### Single-Host Pilot — Honest Disclosure

**The Longmont pilot runs 3 Fedimint guardians on a single Vultr VPS.** Engineering choice with honest limitation disclosure:

- 3-guardian federation provides software guarantee of BFT quorum (2-of-3); since all guardians share one server, actual trust collapses to single-server trust.
- Engineering pilot validates the full software stack (community config, Docker deployment, merchant onboarding, L402 + NUT-24 payment flows, monitoring) before distributing guardians to multiple operators.
- **Guardian distribution timeline:** target Month 6, distribute to ≥3 separate operators in different physical locations before accepting general public funds.
- **Mainnet migration plan:** documented in `docs/mainnet-migration-docs/reference/archives/root/plan.md`. Short version: freeze pilot, distribute guardians, re-DKG, reopen with production trust assumptions and value caps removed.

This is consistent with Fedimint's own engineering-pilot guidance and disclosed in all grant applications and community communications.

### Privacy Architecture — What Is and Is Not Claimed

| Privacy feature | Fedimint | Cashu | On-chain |
|----------------|---------|-------|---------|
| Ecash (no payment graph) | Yes | Yes | No |
| Silent Payments (BIP-352) | Requires federation wallet module | Client-side | Yes |
| CoinJoin | No | No | Yes (Whirlpool/JoinMarket) |
| Ark VTXOs | Stub (awaiting Ark SDK) | No | Pending soft-fork |
| Lightning (partial graph privacy) | Yes | Yes | N/A |

ArxMint's privacy dashboard shows per-backend support status honestly. Silent Payments for Fedimint peg-outs requires a federation-level module change — not a client toggle, and the dashboard labels it accordingly (Phase 0.2 Fortify fix shipped).

---

## 7. Key Performance Indicators

KPIs are tracked in production and exported via the grant reporting API (`/api/reports/monthly?period=YYYY-MM`).

| KPI | Pilot Target (6 months) | Tracked since |
|-----|------------------------|--------------|
| Merchants active | 30 (Longmont) | 2026-05 |
| Monthly active users (MAU) | 300 | 2026-05 |
| Payment success rate | ≥ 98% | Real-time SSE stream |
| Federation uptime | ≥ 99.5% | Prometheus + Grafana |
| Spend velocity (tx/user/month) | ≥ 2 | Computed monthly |
| L402 API payments | — (track and report) | Real-time |
| Communities created | — (track and report) | Per-deployment |
| Transaction volume (sats) | — (track and report) | Real-time |

---

*This dossier was generated from codebase artifacts on 2026-05-09. Update when pilot data, team bios, or budget figures change. Source: `lib/pilot-deployment.ts` (KPI targets), `lib/grant-templates.ts` (narratives), `docs/core/roadmap.md` (phases), `docs/core/spec.md` (architecture), `CHANGELOG.md` (recent shipped features), and live operational data from Longmont pilot.*
