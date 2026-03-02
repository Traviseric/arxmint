# ArxMint: A Unified Framework for Human and AI Agent Commerce in Sovereign Bitcoin Circular Economies

**Version 1.0 — February 2026**

**Authors:** ArxMint Contributors

---

## Abstract

Bitcoin was designed as a peer-to-peer electronic cash system. Fifteen years later, the dominant usage pattern is buy-and-hold: users acquire bitcoin through KYC exchanges, move it to cold storage, and continue transacting in fiat. The infrastructure required to spend bitcoin privately at local merchants does not exist in most communities.

Simultaneously, AI agents are becoming economic actors — buying data, selling compute, paying for API access — but every existing payment system requires human identity. Credit cards, bank accounts, and payment processors all assume a human at the other end. There is no native payment rail for machines.

ArxMint addresses both problems with a single architecture. It generates private Bitcoin circular economies from a natural language prompt, deploying Fedimint federations, Cashu ecash mints, Lightning payment channels, and L402 agent commerce rails as a unified Docker stack. Humans transact in ecash at local merchants. AI agents sell services through Lightning paywalls. Both operate on the same infrastructure, use the same sats, and benefit from the same privacy guarantees.

This paper describes the architecture, privacy model, agent commerce protocol, economic incentives, security analysis, and deployment plan for ArxMint — including a six-month pilot targeting 30 merchants and 300 monthly active users in the Boulder-Longmont corridor of Colorado.

---

## Table of Contents

1. [Introduction: The Holding Trap](#1-introduction-the-holding-trap)
2. [Problem Statement](#2-problem-statement)
3. [Architecture Overview](#3-architecture-overview)
4. [Ecash Layer: Fedimint and Cashu](#4-ecash-layer-fedimint-and-cashu)
5. [Agent Commerce: L402 and NUT-24](#5-agent-commerce-l402-and-nut-24)
6. [Privacy Model](#6-privacy-model)
7. [Spend Router](#7-spend-router)
8. [Economic Model](#8-economic-model)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Security Analysis](#10-security-analysis)
11. [Pilot Plan: Boulder-Longmont](#11-pilot-plan-boulder-longmont)
12. [Development Roadmap](#12-development-roadmap)
13. [Related Work](#13-related-work)
14. [Conclusion](#14-conclusion)

---

## 1. Introduction: The Holding Trap

Most Bitcoiners share the same daily experience: earn fiat, spend fiat, buy bitcoin on an exchange, move it to cold storage, repeat. The entire financial life still runs on legacy rails. Bitcoin functions as a savings account that users convert *out of* — not money they live on.

Cold storage was the right first step. But it was supposed to be step one, not the endgame.

The original Bitcoin whitepaper described "a purely peer-to-peer version of electronic cash." Cash means circulation. Cash means merchants and customers and services flowing through a real economy. The gap between Bitcoin's promise and its daily reality is not a protocol problem — it is an infrastructure problem.

Three specific barriers prevent Bitcoin from functioning as money:

1. **Fiat dependency.** Rent, groceries, and gas are paid in dollars. Every purchase requires converting out of bitcoin, undoing the accumulation.

2. **Surveillance by default.** Every exchange, every on-ramp, and every compliant service builds a map of the user's financial life. Privacy is opt-in and expensive — the opposite of what electronic cash should be.

3. **No local infrastructure.** Most communities have no ecash mint, no private payment rails, no merchant directory. The "parallel economy" remains a conference talking point, not a lived reality.

ArxMint exists to close this gap. It generates the complete infrastructure stack required for a community to transact in bitcoin privately — and it does so from a single natural language prompt.

---

## 2. Problem Statement

### 2.1 The Human Problem

A Bitcoiner in Boulder, Colorado who wants to spend sats at a local coffee shop today faces the following:

- No merchant in town accepts bitcoin privately
- Setting up a Fedimint federation requires Docker expertise, guardian coordination, and weeks of configuration
- Cashu mints require running server infrastructure and understanding ecash protocols
- Lightning channels must be opened, balanced, and maintained
- Privacy tools (CoinJoin, Silent Payments, Tor) must be configured individually

Each component — Fedimint, Cashu, Lightning, privacy tools — exists as a separate project with its own documentation, Docker configuration, and operational requirements. Stitching them into a working economy takes weeks of DevOps expertise. Most communities never start.

### 2.2 The Agent Problem

AI agents are economic actors. They perform real work — analyzing data, monitoring markets, running computations — and need to be compensated. But every traditional payment system has a human gatekeeper:

| System | Requirement | Agent Compatible? |
|---|---|---|
| Credit cards | KYC, identity verification | No |
| Bank transfers | Bank account, SSN | No |
| Stripe | Business entity, tax ID | No |
| PayPal | Phone number, identity | No |

AI agents are not humans. They do not have IDs, bank accounts, or business registrations. They need payment rails that work without identity — rails that already exist in the Bitcoin protocol but lack the integration layer to be useful.

### 2.3 The Integration Gap

The technology for private Bitcoin commerce exists. Fedimint provides federated ecash with Chaumian blind signatures. Cashu provides lightweight single-operator ecash. Lightning enables instant payments globally. L402 turns any API endpoint into a pay-per-request service. MCP (Model Context Protocol) connects AI agents to payment infrastructure.

What does not exist is the integration. No system combines these protocols into a deployable, operable economy that serves both humans and machines on the same rails.

ArxMint is that integration layer.

---

## 3. Architecture Overview

### 3.1 Design Thesis

ArxMint's core architectural thesis is that **humans and AI agents can share the same private commerce infrastructure**. An ecash token spent at a coffee shop and an ecash token paying for a privacy audit API call are the same token, on the same mint, backed by the same bitcoin.

This convergence is not incidental — it is the primary design constraint. Every architectural decision flows from the requirement that a single deployment serves both human and agent commerce.

### 3.2 System Pipeline

The canonical ArxMint pipeline converts natural language into live infrastructure:

```
Natural Language Prompt
  → parsePrompt()         // Extract community parameters
  → generateConfig()      // Build CommunityConfig
  → generateDockerCompose()  // Multi-service YAML
  → generateApertureConfig() // L402 proxy routes
  → docker compose up -d     // Deploy
  → Live sovereign economy
```

A user types: *"Create a Bitcoin community for 50 people in Boulder with merchant directory and agent marketplace, maximum privacy."*

ArxMint parses the intent, selects appropriate backends (Fedimint for 50+ members, CDK mint for cloud-native operation), configures privacy defaults (Silent Payments, CoinJoin, PayJoin enabled), generates L402 agent routes, and outputs a Docker Compose file that deploys the entire stack with one command.

### 3.3 Component Map

| Layer | Protocol | Role |
|---|---|---|
| Settlement | Bitcoin (on-chain) | Final settlement, peg-in/peg-out |
| Routing | Lightning Network | Instant payments, inter-mint bridging |
| Privacy (ecash) | Fedimint | Federated ecash with multi-guardian custody |
| Privacy (ecash) | Cashu | Lightweight single-operator ecash |
| Privacy (on-chain) | BIP-352 Silent Payments | Stealth addresses for peg-outs |
| Privacy (off-chain) | Ark | VTXO-based off-chain transfers |
| Agent Commerce | L402 | HTTP 402 + Lightning invoice paywalls |
| Agent Commerce | NUT-24 | HTTP 402 + Cashu ecash paywalls |
| Agent Integration | MCP | AI agent tool interface to Lightning |
| Observability | Prometheus + Grafana | Service metrics, BCE health KPIs |

### 3.4 The Sovereign Loop

ArxMint creates a closed economic loop — the "Sovereign Loop" — where sats circulate without touching fiat:

1. **Earn** — Community members earn sats for real work: workshops, freelance services, merchant sales.
2. **Spend** — Private ecash payments at local merchants. Scan a QR, pay in sats.
3. **Agent Revenue** — AI agents earn sats by selling data, compute, and analytics through L402 paywalls, 24/7.
4. **Reinvest** — Agent earnings flow back into the local economy as the operator spends them at the same merchants.

The loop is self-reinforcing: more merchants attract more users; more users generate more agent revenue; more revenue funds more infrastructure.

---

## 4. Ecash Layer: Fedimint and Cashu

### 4.1 Fedimint: Federated Ecash

Fedimint is a federated e-cash protocol where a group of trusted community members (guardians) jointly custody bitcoin and issue ecash tokens using Chaumian blind signatures. Transactions within the federation are invisible to the guardians — they can confirm that the total supply is correct but cannot link specific payments to specific users.

**ArxMint's Fedimint integration:**

- **Client-side WASM SDK** (`@fedimint/core`): Joins existing federations via invite code. Runs in a Web Worker to isolate cryptographic computation from the UI thread.
- **Guardian scaling**: Guardian count scales with community size — `ceil(memberCount / 10)`, clamped to [3, 7]. Minimum 3 ensures Byzantine fault tolerance with f=1.
- **Mnemonic management**: BIP39 mnemonic auto-generated on first join, stored in WASM context.
- **Full operation surface**: Ecash (spend/redeem), Lightning (create/pay invoices via federation gateway), on-chain (deposit addresses), federation management (config, invite codes, operation history).

Fedimint is recommended for communities of 50+ members where the trust can be distributed across multiple guardians.

### 4.2 Cashu: Lightweight Ecash

Cashu is a lightweight ecash protocol optimized for simplicity. A single operator runs the mint, issues tokens, and handles redemption. The privacy model is identical to Fedimint's — Chaumian blind signatures make transactions unlinkable — but the trust model is simpler: users trust one operator rather than a federation.

**ArxMint's Cashu integration:**

- **cashu-ts v3 API**: Mint quotes (`createMintQuoteBolt11`), proof minting (`mintProofs`), melt quotes and execution, token send/receive.
- **Keyset validation (NUT-13)**: Defense against keyset ID collision attacks. Both full ID and 31-bit integer collisions are detected. Cryptographic verification confirms keyset IDs match the hash of the mint's public keys.
- **Proof sanitization**: Restored proofs are validated for required fields, duplicate secrets, cross-mint injection, and unknown keyset IDs.
- **Multi-mint (Coco)**: `MultiMintManager` tracks multiple Cashu clients. Cross-mint transfers use Lightning as the atomic bridge — source mint melts to Lightning invoice, destination mint mints from Lightning payment.

Cashu is recommended for communities under 50 members, for rapid prototyping, or where a single trusted operator is acceptable.

### 4.3 Backend Selection Logic

ArxMint automatically selects the appropriate ecash backend:

| Condition | Backend | Rationale |
|---|---|---|
| > 50 members | Fedimint | Distributed trust across guardians |
| > 30 members, mainnet | CDK mint (Cashu) | Cloud-native, Postgres-backed, metrics |
| ≤ 30 members, testnet | Nutshell (Cashu) | Lightweight, minimal infrastructure |
| Explicit "federation" in prompt | Fedimint | User preference override |

### 4.4 Agent Wallets

Both Fedimint and Cashu support ephemeral agent wallets — in-memory-only wallets designed for autonomous processes:

```
AgentWallet Properties:
  TTL:          Auto-destroy after N seconds
  Balance Cap:  Reject deposits exceeding limit
  Scope:        Bound to a specific community
  Storage:      In-memory only, no persistence
  Teardown:     Clean WASM/proof destruction
```

The agent wallet pattern provides a principled answer to "how do AI agents hold money safely?" Agents cannot accumulate unlimited funds, wallets expire automatically, and no secrets persist to disk.

### 4.5 ZK-Auditable Reissuance

The `AuditedAgentWallet` extends the agent wallet with a hash-chained audit log. Every operation (receive, send, reissue, expire, destroy) appends an entry with a state hash linked to the previous entry. The chain is anchored at genesis and can be verified by walking the hash chain forward.

Reissuance performs a proof swap — the mint receives old proofs and issues new ones that are cryptographically unlinkable from the originals. The audit log records that reissuance happened at a specific state, resolving the tension between ecash's privacy (unlinkable tokens) and accountability (provable spending history).

---

## 5. Agent Commerce: L402 and NUT-24

### 5.1 L402: Lightning-Native Machine Payments

L402 is an HTTP protocol extension that turns any API endpoint into a pay-per-request service. The protocol flow:

1. **Request**: Agent sends `GET /api/agent/privacy-audit`
2. **Challenge**: Server returns `HTTP 402` with `WWW-Authenticate: L402 macaroon="...", invoice="..."`
3. **Payment**: Agent pays the Lightning invoice, receives preimage
4. **Access**: Agent retries with `Authorization: L402 <macaroon>:<preimage>`
5. **Response**: Server validates payment proof, returns data

No accounts. No API keys. No billing departments. No identity. The agent proves payment, not identity.

### 5.2 NUT-24: Ecash-Native Machine Payments

NUT-24 extends the same 402 pattern to Cashu ecash tokens. ArxMint implements dual paywall support — a single endpoint accepts both Lightning (L402) and ecash (NUT-24) payments:

```
WWW-Authenticate: Cashu mint="...", amount="100", unit="sat",
                  L402 macaroon="...", invoice="..."
```

Clients choose their preferred payment method:
- Lightning-native agents use `Authorization: L402 <macaroon>:<preimage>`
- Ecash-native agents use `Authorization: Cashu <token>`

This dual support is critical because it allows community members who hold ecash to access the same services as agents who hold Lightning balances — without requiring either party to convert.

### 5.3 Payment Verification

Cashu payment verification follows a four-step process:

1. Decode the token and validate the mint URL matches the expected mint
2. Sum proof amounts and confirm total meets the required price
3. Call `checkProofsStates()` — all proofs must be unspent
4. Call `receive()` — atomic proof swap prevents double-spend

### 5.4 Agent Marketplace

ArxMint ships with four L402-gated agent services:

| Service | Price | Function | Human Value |
|---|---|---|---|
| Privacy Audit | 500 sats | Analyze wallet privacy score, identify leaks | Security checkup for financial privacy |
| Cycle Signals | 200 sats | On-chain cycle positioning (MVRV, NUPL, supply-in-profit) | Market monitoring and alerts |
| Data Market | 1,000 sats | Aggregated community metrics, merchant data, flow analysis | Community health metrics for organizers |
| Compute | 2,000 sats | Batch token operations, ZK verifications | Back-end infrastructure operations |

These services demonstrate the agent commerce model and generate revenue that flows back into the community economy.

### 5.5 MCP Integration

The Model Context Protocol (MCP) connects AI agent runtimes to Lightning infrastructure. ArxMint generates MCP configuration that exposes 18 Lightning tools via stdio transport, enabling agents built on any framework (Claude, GPT, LangChain) to:

- Create and pay Lightning invoices
- Check balances and monitor channels
- Open, close, and rebalance channels
- Operate with scoped credentials (pay-only, read-only, invoice-only)

### 5.6 Gateway Bridge

The Fedimint Gateway Bridge enables ecash holders to pay for L402 services without maintaining a separate Lightning wallet. When a user holding Fedimint ecash encounters an L402 paywall:

1. Parse the Lightning invoice from the 402 challenge
2. Decode invoice amount with safety limit enforcement
3. Route payment through the Fedimint federation's Lightning gateway
4. Cache the credential for repeated access to the same domain

This bridge collapses the distinction between "ecash user" and "Lightning user" — anyone holding ecash can access any L402-gated service.

---

## 6. Privacy Model

### 6.1 Design Philosophy

Privacy in ArxMint is a default, not an option. The architecture assumes that financial transactions should be private unless the user explicitly chooses otherwise. This is not about evasion — it is about building infrastructure that makes Bitcoin work as money.

### 6.2 Privacy Layers

ArxMint implements six privacy layers, each addressing a different attack surface:

**Layer 1: Ecash (Fedimint/Cashu)**
Chaumian blind signatures make transactions within a mint invisible. The mint can verify total supply correctness but cannot link payer to payee. Privacy score: 95/100.

**Layer 2: Lightning + Tor**
Lightning payments route through multiple hops, and Tor integration prevents network-level surveillance. Channel graph analysis remains a theoretical concern. Privacy score: 70/100.

**Layer 3: Silent Payments (BIP-352)**
Non-interactive stealth addresses for on-chain transactions. Each payment creates a unique address derived from the recipient's public key and the sender's inputs. No address reuse, no public address exposure. Privacy score: 60/100.

**Layer 4: Ark VTXOs**
Virtual UTXOs enable off-chain transfers via an Ark Service Provider. Batch settlement rounds (every 10 seconds) provide high privacy through aggregation. Privacy score: 85/100.

**Layer 5: CoinJoin**
Multi-party transaction mixing breaks the common-input-ownership heuristic. Integrated as a default for on-chain operations. Privacy score: +15 points when active.

**Layer 6: PayJoin**
Co-signed transactions between sender and receiver break amount analysis heuristics. Privacy score: +10 points when active.

### 6.3 Privacy Score Computation

ArxMint computes a composite privacy score per community configuration:

```
Base score:                  40  (using any ecash backend)
+ Silent Payments:          +15  (if available for backend)
+ CoinJoin:                 +15  (if enabled)
+ PayJoin:                  +10  (if enabled)
+ Ark:                      +20  (if available)
Maximum possible:           100
```

Critically, the scoring function gates additions on *actual backend availability*, not configuration flags. Silent Payments for Fedimint peg-outs returns false (requires server-side federation module changes). Ark returns false when the upstream SDK is not yet production-ready. The privacy dashboard shows honest, per-backend status — not aspirational claims.

### 6.4 Privacy Presets

| Preset | Silent Payments | CoinJoin | PayJoin | Ark |
|---|---|---|---|---|
| Standard | On | Off | On | Off |
| High | On | On | On | Off |
| Maximum | On | On | On | On |

### 6.5 Silent Payments Infrastructure

BIP-352 Silent Payments require a dedicated indexer service to scan the blockchain for payments to a given scan key. ArxMint deploys this as a Docker service (`sp-indexer`) that:

- Continuously scans new blocks for matching outputs
- Supports incremental scanning (only new blocks since last scan)
- Enables scan key delegation: the scan private key runs on a hot device (phone, desktop) while the spend key remains on cold storage or a hardware wallet

This separation means a mobile wallet can detect incoming payments without ever exposing the spend key.

### 6.6 Hardware Wallet Considerations

ArxMint includes infrastructure for BIP-392 output descriptors and BIP-376 PSBT extensions required for hardware wallet signing of Silent Payment transactions. As of February 2026, no major hardware wallet vendor (ColdCard, BitBox02, Ledger, Trezor, SeedSigner, Jade) has shipped firmware support for Silent Payments. The infrastructure is ready; the ecosystem is not.

---

## 7. Spend Router

### 7.1 Design

The spend router automatically selects the optimal payment path based on amount, available balances, and privacy preference. Users do not need to understand the underlying protocols — they specify an amount and optionally a privacy preference, and the router handles path selection.

### 7.2 Routing Logic

**Privacy-first mode** (when preference is "maximum" or "high"):
Sort all viable paths by privacy score descending. Select the highest-scoring available path regardless of amount.

**Auto mode** (default, amount-based heuristics):

| Amount Range | Preferred Path | Fallback | Rationale |
|---|---|---|---|
| < 10,000 sats | Ecash (Cashu/Fedimint) | Lightning | Zero fees, maximum privacy for small amounts |
| 10,000 – 100,000 sats | Lightning | Ecash | Fast routing, good privacy for medium amounts |
| 100,000 – 1,000,000 sats | Ark VTXOs | Lightning | Batch settlement privacy for large transfers |
| ≥ 1,000,000 sats | Silent Payments (on-chain) | Standard on-chain | Stealth addresses for large on-chain amounts |

### 7.3 Fee Estimation

| Path | Estimated Fee |
|---|---|
| Ecash (Cashu/Fedimint) | 0 sats (free within mint) |
| Lightning | ~0.1% (max(1, ceil(amount × 0.001))) |
| Ark | ~0.05% (max(1, ceil(amount × 0.0005))) |
| On-chain | ~250 sats (1 vByte × 250 sat/vB estimate) |

### 7.4 Path Privacy Scores

| Path | Score | Rating |
|---|---|---|
| Cashu ecash | 95 | Maximum |
| Fedimint ecash | 95 | Maximum |
| Ark VTXOs | 85 | High |
| Lightning | 70 | High |
| On-chain (Silent Payments) | 60 | Medium |
| On-chain (standard) | 30 | Low |

---

## 8. Economic Model

### 8.1 Circular Flow

The ArxMint economic model creates a closed loop of sats circulation:

```
Community Members
    │
    ├─ Earn sats: workshops, freelance, merchant sales
    ├─ Spend sats: ecash at local merchants (0 fees)
    │
    ├─ Agent Revenue: L402 services earn sats 24/7
    │     ├─ Privacy audits: 500 sats/request
    │     ├─ Cycle signals: 200 sats/request
    │     ├─ Data market: 1,000 sats/request
    │     └─ Compute: 2,000 sats/request
    │
    └─ Mint Fee: 0.2% on ecash operations
          └─ Funds community infrastructure
```

### 8.2 Revenue Streams

**Mint fees (0.2% default):** Every ecash mint/melt operation generates a small fee that accrues to the mint operator. For a community processing 10M sats/month in ecash, this generates ~20,000 sats/month in operational revenue.

**Agent services:** L402-gated services generate per-request revenue. A cycle-signals agent serving 100 requests/day at 200 sats each generates 600,000 sats/month (~$180 at $30k/BTC).

**Zero merchant fees:** Ecash payments at merchants carry no processing fee — a significant advantage over the 2-3% charged by credit card processors.

### 8.3 BCE Health Metrics

ArxMint includes a Bitcoin Circular Economy (BCE) metrics framework aligned with the Free Bitcoin Circular Economies (FBCE) grant reporting standards. Five key performance indicators are tracked:

| KPI | Weight | Full Marks At |
|---|---|---|
| Uptime (30-day) | 25% | ≥ 99.5% |
| Payment success rate | 25% | ≥ 98% |
| Spend velocity (tx/user/month) | 20% | ≥ 5 |
| Monthly active users | 20% | ≥ 300 |
| Active merchants | 10% | ≥ 30 |

### 8.4 Maturity Tiers

Communities progress through five tiers:

| Tier | Merchants | MAU | Description |
|---|---|---|---|
| Nascent | 0–10 | < 50 | Early stage, founding merchants |
| Emerging | 10–30 | 50–200 | Growing adoption, circular patterns forming |
| Growing | 30–100 | 200–1,000 | Regular circular spending |
| Established | 100+ | 1,000+ | Self-sustaining economy |
| Thriving | 100+ | 1,000+ | Multi-community federation |

### 8.5 Grant Reporting

ArxMint generates grant-ready reports in three formats:

- **JSON**: Structured KPI snapshot for OpenSats/FBCE automated reporting
- **CSV**: Spreadsheet-compatible single-row format
- **Markdown**: Full narrative report with KPI tables, milestone checklists, progress notes, challenges, and budget sections

Reports follow the OpenSats cadence: monthly for the first three months, quarterly thereafter. Progress tracking uses linear interpolation against 6-month targets.

---

## 9. Deployment Architecture

### 9.1 Full Stack Topology

A maximum-configured ArxMint deployment:

```
                      ┌──────────────┐
                      │   LND Node   │
                      │  v0.18.0     │
                      │  Neutrino    │
                      └──────┬───────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
    ┌──────┴───────┐  ┌─────┴──────┐  ┌───────┴──────────┐
    │  CDK Mint    │  │   arkd     │  │  SP Indexer      │
    │  (Postgres)  │  │  (VTXOs)   │  │  (BIP-352 scan)  │
    │  Port 3338   │  │  Port 7070 │  │  Port 8100       │
    └──────┬───────┘  └────────────┘  └──────────────────┘
           │
    ┌──────┴──────────────────────┐
    │  Fedimint Guardians (3–7)  │
    │  Iroh transport            │
    │  v0.10.0 "Lighthouse"      │
    └──────┬─────────────────────┘
           │
    ┌──────┴───────┐
    │   Aperture   │    L402 reverse proxy
    │   Port 8081  │    Routes: /api/agent, /api/cycle, /api/privacy
    └──────┬───────┘
           │
    ┌──────┴────────────┐     ┌──────────────┐
    │    Prometheus      │────→│   Grafana    │
    │    15s scrape      │     │   Port 3001  │
    │    30-day retain   │     └──────────────┘
    └───────────────────┘
```

All services share a `sovereign` Docker bridge network. Each service has dedicated persistent volumes.

### 9.2 Service Configuration

**LND**: Neutrino light client mode (no full node required), testnet by default. Wumbo channels enabled for large capacity. Keysend accepted for spontaneous payments. SQLite backend.

**Cashu Mint**: Backend selection by community size:
- CDK (`cashubtc/cdk-mintd`) for >30 members or mainnet — Postgres-backed, Prometheus metrics, Kubernetes-ready
- Nutshell (`cashubtc/nutshell`) for ≤30 members on testnet — lightweight, minimal infrastructure

**Fedimint**: One `fedimintd` container per guardian. Iroh peer-to-peer transport with DNS-based discovery. No direct Bitcoin RPC — relies on the federation's LND gateway for chain data.

**Aperture**: L402 reverse proxy with pre-configured routes for agent services. Token duration and pricing per endpoint.

**Prometheus**: Scrapes all enabled services at 15-second intervals. Dynamically configured based on which services are deployed.

### 9.3 One-Command Deploy

```bash
# Lightweight (LND + Cashu only)
npm run setup:cashu

# Full stack (LND + Cashu + Fedimint + Aperture)
npm run setup:full

# Custom from prompt
npm run create -- "50-person Boulder community, maximum privacy, agents enabled"
```

### 9.4 Guardian Governance

For Fedimint deployments, ArxMint generates a governance framework:

**Quorum thresholds** (Byzantine fault tolerant):
- Consensus: `ceil(guardianCount × 2/3)`
- Emergency: `min(guardianCount, consensus + 1)`
- Treasury: Same as consensus

**Guardian requirements**: Minimum 3 months community involvement, verified identity (Nostr/PGP), technical competence, community stake, geographic diversity for 5+ guardians.

**Rotation policy**: 12-month maximum terms, 6-month cooldown, 14-day handover, maximum `floor(guardianCount/3)` simultaneous rotations.

**Incident response SLAs**:

| Severity | Description | Response Time |
|---|---|---|
| Critical | Federation down, funds at risk, key compromise | 1 hour |
| High | Service degraded, >5% failures | 4 hours |
| Medium | Elevated error rates | 24 hours |
| Low | Minor issues, documentation | 72 hours |

---

## 10. Security Analysis

### 10.1 Threat Model

| Threat | Attack Surface | Mitigation |
|---|---|---|
| Keyset ID collision | Malicious mint redirects ecash | NUT-13 validation: full ID + 31-bit integer collision detection |
| Cross-mint token injection | Attacker sends tokens from rogue mint | Proof validation against trusted keyset registry |
| Agent fund accumulation | Compromised agent hoards sats | Balance caps, TTL expiry, in-memory-only storage |
| Agent key exposure | Agent process leaks signing keys | Remote signer architecture: agents never hold keys |
| Privilege escalation | Agent attempts admin operations | Three-tier enforcement: watch-only → pay-only → admin, checked per operation |
| Macaroon theft | Stolen credentials enable unauthorized payments | Scoped macaroons with role-based permissions, time expiry, amount limits |
| Double-spend (ecash) | Token reuse | Mint-side proof state verification + atomic swap on receive |
| Guardian collusion | Federation operators steal funds | BFT quorum (2/3 consensus), governance framework, rotation policy |
| Privacy dashboard dishonesty | Claims privacy features that don't work | Per-backend availability gating, honest status reporting |

### 10.2 Security Tiers

All Lightning operations are governed by a three-tier security model:

| Tier | Operations | Use Case |
|---|---|---|
| watch-only | getInfo, getBalance, listChannels | Default for all agents |
| pay-only | + createInvoice, payInvoice | Agent commerce (requires remote signer) |
| admin | + bakeMacaroon, full access | Human operators only, never for agents |

Tier is set at connection time and cannot be upgraded at runtime. The `pay-only` tier requires a `RemoteSignerConfig` pointing to a separate `litd` process — the agent process never holds signing keys.

### 10.3 Ecash Security

**Keyset validation**: Every keyset is cryptographically verified (keyset ID = hash of public keys) on connection. Collisions at both the string and integer level are rejected. This defends against the January 2026 keyset collision vulnerability.

**Proof sanitization**: All proofs loaded from storage or received from peers are validated for:
- Required fields (id, secret, C, amount)
- Duplicate secrets within batch (replay detection)
- Keyset ownership (proof belongs to current mint)
- Keyset recognition (proof's keyset is in trusted set)

### 10.4 Agent Wallet Security Envelope

```
Property          Enforcement
──────────────────────────────────
TTL               setTimeout → destroy()
Balance Cap       Checked on every receive()
Scope             Bound to specific community
Persistence       In-memory only, no localStorage
Teardown          WASM cleanup + reference nulling
Audit             Hash-chained operation log
```

---

## 11. Pilot Plan: Boulder-Longmont

### 11.1 Overview

ArxMint's first production deployment targets the Boulder-Longmont corridor in Colorado — a community with 70+ active Bitcoiners, regular meetups, and an existing Signal group discussing circular economy development.

### 11.2 Six-Month KPI Targets

| KPI | Month 1 | Month 3 | Month 6 |
|---|---|---|---|
| Active merchants | 5 | 15 | 30 |
| Monthly active users | 20 | 100 | 300 |
| Payment success rate | 95% | 97% | 98%+ |
| Federation uptime | 95% | 99% | 99.5% |
| Spend velocity | 1 tx/user/mo | 1.5 tx/user/mo | 2+ tx/user/mo |

### 11.3 Timeline

**Pre-Launch (Month -1 to 0)**
- Deploy Docker stack to production server
- Complete guardian distributed key generation (DKG) ceremony
- Recruit 3–5 founding merchants
- Configure monitoring (Prometheus + Grafana)
- Fund Lightning channels (minimum 1M sats inbound liquidity, 3+ channels)
- Form guardian council, adopt governance policy

**Soft Launch (Month 1)**
- 5 merchants live and accepting ecash payments
- 20 users with active wallets
- Host first meetup demonstration event
- Achieve 95%+ payment success rate
- Deliverable: First grant progress report

**Merchant Expansion (Months 2–3)**
- 15 merchants onboarded with POS setup (QR + NFC)
- 100 monthly active users
- First cross-merchant circular spend tracked and celebrated
- Agent marketplace live with 4 services
- Deliverable: Quarterly grant report

**Growth (Months 4–5)**
- 25 merchants, 200 MAU
- Spend velocity reaches 2+ events/user/month
- BCE maturity tier: Emerging → Growing
- First community members earning primary income in sats

**Target Achievement (Month 6)**
- 30 merchants, 300 MAU, 98%+ success, 99.5% uptime
- Deliverables: Full KPI achievement report, replication playbook draft, grant final report

**Evaluation and Scale (Months 7–9)**
- Evaluate pilot outcomes against targets
- Plan multi-city expansion
- Apply for follow-on grants
- Publish "BCE in a Box" replication playbook

### 11.4 Pre-Launch Checklist

**Infrastructure**: Docker stack deployed, LND synced, Lightning channels funded (min 1M sats, 3+ channels), DNS/TLS configured, backup strategy tested.

**Security**: Agent security tiers configured, remote signer deployed, Cashu keyset validation active.

**Commerce**: 3–5 founding merchants recruited, POS hardware set up (QR terminals + Numo NFC cards), end-to-end payment tested.

**Governance**: Guardian council formed (3+ members), governance policy adopted (quorum rules, rotation schedule, incident response), communication channel established.

**Monitoring**: Prometheus scraping all services, Grafana dashboards configured, alert rules for downtime and low liquidity.

### 11.5 Grant Alignment

ArxMint is designed for compatibility with three grant programs:

**Free Bitcoin Circular Economies (FBCE)**: FBCE Round 1 deployed 50M sats. Round 2 supported 42 BCEs in 19 countries. ArxMint's BCE metrics framework directly maps to FBCE reporting requirements. The pilot targets align with FBCE's emphasis on merchant count, active users, and spend velocity.

**OpenSats**: ArxMint's CDK integration, cashu-ts compatibility, and monitoring stack align with OpenSats Wave 16 priorities (which funded CDK, cashu-ts/Coco, and Nutshell).

**Fedi Grants**: ArxMint's Community Generator integration and Fedimint SDK usage align with Fedi's ecosystem development goals.

### 11.6 Multi-City Federation

After the Boulder-Longmont pilot proves the model, ArxMint supports multi-city expansion via the Coco multi-mint protocol:

```
City A User                                    City B User
    │                                              │
    └─ Melt ecash → Lightning invoice ────────→ Mint ecash
                    (~10 sats fee)
                    (~3 seconds)
```

Each city operates its own federation with local guardians. Cross-city payments route through Lightning. The "BCE in a Box" replication playbook enables any community to deploy without starting from scratch.

---

## 12. Development Roadmap

### Phase 0: Fortify — Security Hardening
*"Your sats and data are protected before anything else gets built."*

Cashu keyset ID validation, honest privacy status display, Lightning agent security tiers, remote signer integration. All four tasks complete.

### Phase 1: Keystone — Core Architecture
*"Merchants can accept payments, wallet auto-picks the best way to pay."*

NUT-24 ecash paywalls, spend router, BCE metrics dashboard, merchant onboarding, macaroon bakery, ephemeral agent wallets, G-Bot federation bootstrap. All seven tasks complete.

### Phase 2: Spire — Full Privacy and Commerce Stack
*"Ecash across multiple mints, tap-to-pay, real-time monitoring."*

Fedimint v0.10.0 upgrade, Ark SDK integration, CDK mint upgrade, multi-mint (Coco), NUT-26 QR/NFC payments, Silent Payments infrastructure, monitoring stack, Gateway bridge. All eight tasks complete.

### Phase 3: Aether — Advanced Features
*"Programmable payments, hardware wallet support, community governance."*

Guardian governance framework, programmable ecash (STARK/Cairo spending conditions), ZK-verified reissuance, hardware wallet support (BIP-392/BIP-376), advanced Cashu (NUT-28 P2BK), Numo NFC merchant integration. All six tasks complete.

### Phase 4: Citadel — Production Deployment
*"Live pilot with 30 Boulder-area merchants, replication playbook."*

Longmont pilot deployment, grant applications (FBCE, OpenSats, Fedi), grant reporting dashboard, replication playbook ("BCE in a Box"), multi-city federation.

### Phase 5: Bazaar — Decentralized Merchant Platform
*"Any merchant accepts sats with one API key — zero Stripe fees."*

Phase 5 transforms ArxMint from community infrastructure into a full merchant payment platform — a private, open-source, decentralized alternative to Stripe. The core payment loop (create challenge, pay, verify) is already production-quality from Phases A-E. Phase 5 adds the merchant-facing developer experience on top.

**The problem:** Stripe charges 2.9% + $0.30 per transaction. A merchant doing $10K/month loses ~$320 to processing fees. Chargebacks add more. Customer payment data gets sold to advertisers. And Stripe can freeze your funds at any time.

**The solution:** ArxMint ecash and Lightning payments cost fractions of a penny. Settlement is instant. Chargebacks are impossible (bearer ecash is final). No payment data leaves the system. The merchant controls their own infrastructure.

Ten deliverables: Merchant API keys with sandbox mode (5.1), webhook system for automated fulfillment (5.2), hosted checkout page with payment links (5.3), payment status API with real-time SSE (5.4), client-side JavaScript SDK and React components (5.5), LNURL-pay and Lightning Address for physical POS (5.6), merchant dashboard with analytics (5.7), settlement automation with configurable payout schedules (5.8), public merchant directory with search (5.9), and idempotency with production hardening (5.10).

**Target integration times:** Coffee shop with a printed QR code: 5 minutes. Online store with hosted checkout: 15 minutes. SaaS app with SDK and webhooks: 1 hour. AI agent with L402 API keys: 30 minutes.

### Dependency Graph

```
Phase 0 (Security) ──→ Phase 1 (Core)
    Phase 1.1 (NUT-24) ──→ Phase 2.8 (Gateway Bridge)
    Phase 1.2 (Spend Router) ──→ Phase 2.2 (Ark SDK)
    Phase 1.3 (BCE Metrics) ──→ Phase 4.1 (Pilot)
    Phase 1.4 (Merchant Flow) ──→ Phase 4.1 (Pilot)
Phase 2 (Privacy) ──→ Phase 3 (Advanced)
    Phase 2.4 (Coco Multi-Mint) ──→ Phase 4.5 (Multi-City)
Phase 4 depends on: Phase 0 + 1.3/1.4 + 2.7 + 3.1
Phase 5 depends on: Phase 4 (pilot validation) + Phase A-E (production infrastructure)
    Phase 5.1 (API Keys) ──→ 5.3 (Checkout) + 5.4 (Status) + 5.6 (LNURL) + 5.7 (Dashboard)
    Phase 5.2 (Webhooks) ──→ 5.5 (Client SDK) + 5.8 (Settlement Auto)
```

---

## 13. Related Work

### 13.1 Bitcoin Circular Economies

**Bitcoin Beach (El Zonte, El Salvador)**: The first Bitcoin circular economy, demonstrating that a small community can operate on Bitcoin rails with sufficient education and merchant onboarding. ArxMint builds on this model by adding privacy (ecash), automation (agents), and deployment simplicity (one-prompt generation).

**Bitcoin Indonesia / Fedi**: Demonstrated Fedimint federation deployment at scale (10–20K users). Validates the federated custody model for emerging markets. ArxMint's Community Generator draws directly from this deployment pattern.

**FBCE Grant Program**: Two rounds funding 42+ BCEs in 19 countries. ArxMint's metrics framework is designed for FBCE reporting compatibility.

### 13.2 Ecash Protocols

**Fedimint**: Federated e-cash with multi-guardian custody and Chaumian blind signatures. ArxMint uses the client-side WASM SDK for wallet operations and generates `fedimintd` Docker configurations for federation creation.

**Cashu**: Lightweight ecash with a single-operator trust model. ArxMint uses cashu-ts v3 and supports both Nutshell (lightweight) and CDK (cloud-native) mint implementations.

### 13.3 Agent Commerce

**Lightning Labs Agent Tooling**: The Lightning Agent Kit and MCP server provide the foundation for ArxMint's agent commerce layer. L402 is confirmed as the standard for machine-to-machine payments.

**ProxyGPT**: A circular economy where AI agents earn and spend bitcoin alongside human users. Directly validates ArxMint's human-agent convergence thesis.

### 13.4 Privacy Protocols

**BIP-352 (Silent Payments)**: Non-interactive stealth addresses. ArxMint includes scan infrastructure and hardware wallet preparation.

**Ark Protocol**: VTXO-based off-chain transfers with batch settlement rounds. ArxMint includes client integration and Docker deployment, pending upstream SDK maturity.

---

## 14. Conclusion

Bitcoin's promise was peer-to-peer electronic cash. Fifteen years later, most Bitcoin is held, not spent. The infrastructure gap is real: no local mints, no private payment rails, no merchant directories, no way for AI agents to participate in the economy. And the existing payment infrastructure — Stripe, Square, PayPal — extracts 2.9%+ from every transaction while selling customer data.

ArxMint closes both gaps. For communities, it generates complete sovereign economy infrastructure from a single natural language prompt. For merchants, it provides a Stripe-like developer experience with near-zero fees, instant settlement, and no customer KYC. Fedimint and Cashu provide private ecash. Lightning provides instant routing. L402 and NUT-24 enable machine commerce. The spend router optimizes for privacy. The governance framework ensures community control. The metrics dashboard proves economic health to grant funders.

The thesis is simple: **humans and AI agents can share the same private commerce infrastructure — and merchants can accept payments on it as easily as adding a Stripe script tag.** The same sats that pay for coffee at a local shop can pay an AI agent for a privacy audit. The same mint that issues ecash to a community member issues ecash to an autonomous process. The same API key that powers a hosted checkout page powers a programmatic settlement between federated marketplaces.

The Boulder-Longmont pilot will be the first test. Thirty merchants. Three hundred users. Six months. If the model works — and the technology says it should — the replication playbook and merchant platform make it available to every community and every merchant in the world.

Build the citadel. Open the bazaar.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **BCE** | Bitcoin Circular Economy — a community where bitcoin circulates as money |
| **Cashu** | Lightweight ecash protocol with single-operator mint |
| **CDK** | Cashu Development Kit — cloud-native Cashu mint implementation |
| **Chaumian blind signatures** | Cryptographic scheme where the signer (mint) signs a message without seeing its content, enabling unlinkable tokens |
| **DKG** | Distributed Key Generation — ceremony where Fedimint guardians jointly create signing keys |
| **Ecash** | Electronic cash — bearer tokens that can be transferred without identity |
| **FBCE** | Free Bitcoin Circular Economies — grant program funding BCEs globally |
| **Fedimint** | Federated e-cash protocol with multi-guardian custody |
| **Guardian** | A trusted community member operating a Fedimint federation node |
| **L402** | HTTP 402 Payment Required protocol using Lightning invoices for access control |
| **Macaroon** | Capability-based credential used in Lightning/L402 authentication |
| **MAU** | Monthly Active Users |
| **MCP** | Model Context Protocol — standard interface connecting AI agents to tools |
| **NUT-13** | Cashu protocol specification for deterministic keyset ID derivation |
| **NUT-24** | Cashu protocol specification for ecash-based HTTP 402 paywalls |
| **NUT-26** | Cashu protocol specification for QR/NFC payment requests |
| **P2BK** | Pay-to-Blinded-Key — conditional ecash transfer requiring recipient's key |
| **Silent Payments** | BIP-352 stealth address scheme for non-interactive recipient privacy |
| **Spend velocity** | Average number of spend transactions per user per month |
| **VTXO** | Virtual UTXO — off-chain Bitcoin output in the Ark protocol |

## Appendix B: Research Traceability

Every architectural decision in ArxMint traces to published research and protocol specifications. The full cross-reference mapping 7 research documents to 25 roadmap items and 36 identified gaps is maintained in `docs/research-crossref.md`.

Key research validations:
- L402 as agent commerce standard (Lightning Labs Agent Tooling documentation)
- Fedimint client-side WASM architecture (Fedimint SDK documentation)
- cashu-ts v3 API surface (Cashu Development Kit documentation)
- BCE metrics framework (FBCE grant program reports)
- Human-agent commerce convergence (ProxyGPT circular economy analysis)
- Privacy-by-default philosophy (all 7 source documents)

## Appendix C: License

ArxMint is open-source software. See repository for license terms.
