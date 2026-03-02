<p align="center">
  <img src="public/images/logo.png" alt="ArxMint" width="80" />
</p>

<h1 align="center">ArxMint</h1>

<p align="center">
  <strong>Private, open-source Bitcoin payments for merchants and AI agents.</strong><br/>
  <em>A decentralized Stripe alternative — near-zero fees, no KYC, self-hosted.</em>
</p>

<p align="center">
  <a href="https://arxmint.com">arxmint.com</a> &middot;
  <a href="https://arxmint.com/roadmap">Roadmap</a> &middot;
  <a href="https://arxmint.com/agents">Agent Commerce</a> &middot;
  <a href="https://arxmint.com/why">Why ArxMint</a>
</p>

<p align="center">
  <a href="https://github.com/Traviseric/arxmint/actions/workflows/ci.yml"><img src="https://github.com/Traviseric/arxmint/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/Traviseric/arxmint/issues"><img src="https://img.shields.io/github/issues/Traviseric/arxmint" alt="Issues" /></a>
</p>

> **Part of the open creator economy.** ArxMint is the payment network. [Teneo Marketplace](https://github.com/Traviseric/teneo-marketplace) is the storefront — courses, books, funnels, email marketing. Together: a complete creator platform that can't be shut down.

---

ArxMint is sovereign Bitcoin payment infrastructure for local merchants, online stores, and AI agents. Accept ecash ([Cashu](https://cashu.space)), Lightning, and [Fedimint](https://fedimint.org) federation payments — with near-zero fees, instant settlement, and no customer KYC.

Spin up a private circular economy from a natural language prompt. Or integrate the merchant API into any app with a few lines of code. Deploy with one Docker command. Humans and agents share the same sovereign infrastructure.

**One prompt. One command. Your economy is live.**

## Why ArxMint?

Stripe charges 2.9% + $0.30 per transaction. A merchant doing $10K/month loses ~$320 to processing fees. Chargebacks add more. Customer payment data gets sold.

ArxMint flips this: ecash payments cost fractions of a penny. Settlement is instant. Chargebacks are impossible (bearer ecash is final). No payment data leaves the system. And it's open source — you own the infrastructure.

| | Stripe | ArxMint |
|---|---|---|
| **Transaction fee** | 2.9% + $0.30 | 0% (ecash) or ~0.1% (Lightning routing) |
| **Settlement** | T+2 days | Instant — customer pays your node directly |
| **Customer KYC** | Card + billing address | None — ecash is anonymous |
| **Chargebacks** | Yes (merchant liability) | Impossible — payments are final |
| **Data sold** | Yes | Impossible — no central entity holds the data |
| **Open source** | No | Yes — MIT license |
| **Self-hosted** | No | Required by design (legally protected) |
| **Censorship risk** | Platform can freeze funds | Impossible — you control your own node |
| **Custody** | Stripe holds funds T+2 | Never — peer-to-peer, you hold your keys |

## How It Works

### For Merchants (Self-Hosted, Non-Custodial)

```
1. arxmint merchant init → one Docker command, your payment node is live
2. Create a checkout session or payment link on YOUR node
3. Customer pays via ecash QR, Lightning, or your self-hosted checkout page
4. Webhook fires from YOUR node → fulfill order
5. Sats arrive directly in YOUR wallet — no middleman, no settlement delay
```

### For Communities (Prompt-Driven)

1. **Describe your community** — _"Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data."_
2. **ArxMint generates everything** — Fedimint federation config, Lightning agent integration, privacy defaults, Docker deployment
3. **One-command deploy** — `docker compose up` → private ecash mint, Lightning node, L402 endpoints, cycle dashboard
4. **Humans + agents join the same loop** — Community members transact in private ecash. AI agents sell services for sats via L402. Same rails.

## Features

### Merchant Payments
- **Payment SDK** — `createL402Challenge()`, `verifyL402Token()`, `routePayment()` — server-side TypeScript SDK for any backend
- **L402 paywalls** — HTTP 402 challenge → Lightning invoice → preimage → access. HMAC-signed macaroons with timing-safe verification
- **Cashu NUT-24 paywalls** — Ecash token → access. Double-spend rejection via NUT-07 proof state checks
- **Spend router** — Auto-selects ecash → Lightning → Ark → on-chain based on amount and privacy score
- **Merchant onboarding** — 4-step flow with QR codes, NFC (Numo) support, and payment method selection
- **Settlement** — Referral fee settlement with idempotency, Cashu ecash minting, federation deposit paths

### Privacy Infrastructure
- **Fedimint federation support** — Multi-guardian federated ecash with blinded Chaumian e-cash notes backed by BTC
- **Cashu mint support** — Lightweight Nutshell + CDK compose generation for production
- **Privacy defaults on** — CoinJoin/PayJoin routing + honest per-backend support matrix; SP/Ark paths include experimental scaffolding
- **Encrypted client-side vault** — AES-256-GCM + PBKDF2-SHA256 (600K iterations). Proofs never touch the server.
- **Nostr identity** — NIP-98 authentication. No email required. Same keypair works across ArxMint + Teneo Marketplace.

### AI Agent Commerce
- **Lightning AI agent commerce** — L402 + NUT-24 paywall flows, scoped security tiers, macaroon baking, remote signer config validation
- **Agent marketplace** — AI agents sell data, compute, privacy audits, and cycle signals for sats
- **Ephemeral agent wallets** — Scoped Cashu/Fedimint wallets for autonomous agent operations

### Community Tools
- **Prompt-driven economy creation** — Describe your community in natural language, get a full deployment config
- **Cycle monitoring** — Real-time MVRV, NUPL, and supply-in-profit signals from on-chain data
- **BCE health metrics** — Community health dashboard with grant-ready export (JSON/CSV)
- **Merchant directory** — Onboarding flow, QR codes, NFC support, "Spend sats here" listings
- **Deployment generation** — Compose generation for LND + Fedimint/Cashu + Aperture + optional Ark/SP/monitoring services

## Quick Start

```bash
git clone https://github.com/Traviseric/arxmint.git
cd arxmint
npm install
npm run setup:githooks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Get Started**.

### Deploy the Full Stack

```bash
cp .env.example .env

# Full stack (LND + Cashu + Fedimint + Aperture + monitoring)
npm run setup:full

# Or lightweight Cashu-only setup
npm run setup:cashu
```

### Cashu Mint: Nutshell vs CDK

| | Nutshell | CDK |
|---|---|---|
| **Best for** | Dev / small communities | Production / mainnet |
| **Image** | `cashubtc/nutshell:latest` (Python) | `cashubtc/cdk-mintd:latest` (Rust) |
| **Prometheus metrics** | No | Yes (`/metrics`) |
| **Auto-selected by generator** | < 30 members + testnet | > 30 members or mainnet |

```bash
# Default (Nutshell — development)
npm run setup:full

# Production (CDK mint — replaces Nutshell in the stack)
docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml up -d
```

### Run Tests

```bash
npm test
```

## Architecture

```
arxmint/
├── app/                         # Next.js 15 App Router
│   ├── page.tsx                 # Landing page
│   ├── create/                  # Prompt-driven community creation
│   ├── dashboard/               # Privacy, cycle, wallet, BCE metrics
│   ├── community/[id]/          # Agent marketplace, merchants, members
│   ├── why/                     # Thesis page
│   ├── agents/                  # L402 agent commerce explainer
│   ├── roadmap/                 # Development roadmap
│   └── api/
│       ├── auth/                # Nostr NIP-98 + session auth
│       ├── payment/             # Payment challenge + verification
│       ├── settlement/          # Referral fee settlement
│       ├── transactions/        # Transaction ledger
│       ├── merchants/           # Merchant CRUD
│       ├── l402/                # L402 gated endpoint demo
│       ├── agent/               # AI agent commerce (NUT-24)
│       ├── community/           # Community management
│       ├── bce-metrics/         # BCE health export
│       └── health/              # Service health checks
├── lib/
│   ├── payment-sdk.ts           # Payment SDK (L402 + Cashu + routing)
│   ├── cashu-paywall.ts         # NUT-24 ecash paywall middleware
│   ├── cashu-sdk.ts             # Cashu v3 + multi-mint + keyset validation
│   ├── fedimint-sdk.ts          # Fedimint WASM client + gateway bridge
│   ├── lightning-agent.ts       # LNC + L402 + macaroon bakery + security tiers
│   ├── spend-router.ts          # Privacy-aware spend routing
│   ├── auth-middleware.ts       # Nostr NIP-98 + session + L402 auth
│   ├── cashu-vault.ts           # Encrypted client-side proof vault
│   ├── db.ts                    # Prisma DB client + resilient queries
│   ├── ark-sdk.ts               # Ark VTXO client (stub — waiting on upstream SDK)
│   ├── silent-payments.ts       # BIP-352 SP scanner + key delegation
│   ├── bce-metrics.ts           # BCE community health + grant export
│   ├── community-generator.ts   # Prompt → Docker Compose + G-Bot
│   ├── privacy-defaults.ts      # Privacy scoring + layer descriptions
│   ├── cycle-monitor.ts         # BTC cycle signals (CoinGecko)
│   ├── pilot-deployment.ts      # Pilot KPI targets + deployment timeline
│   ├── grant-templates.ts       # OpenSats/HRF/FBCE grant generators
│   └── store.ts                 # Zustand global state
├── components/                  # React components
├── prisma/                      # Database schema + migrations
├── tests/                       # Unit + E2E test suites
├── docker/                      # Docker configs (Caddy, Grafana, Prometheus, CDK)
├── scripts/                     # Setup, backup, security scripts
└── docs/                        # Spec, roadmap, research, security, governance
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS |
| Database | PostgreSQL 15 (Prisma ORM), internal Docker network only |
| Auth | Nostr NIP-98 + Auth.js sessions + L402 for agents |
| Ecash | [Fedimint SDK](https://sdk.fedimint.org/) (WASM) + [Cashu-TS](https://github.com/cashubtc/cashu-ts) v3 |
| Lightning | [LNC-Web](https://github.com/lightninglabs/lnc-web) + [Aperture](https://github.com/lightninglabs/aperture) L402 proxy |
| Agent Tools | [Lightning MCP Server](https://github.com/lightninglabs/lightning-agent-tools) (18 tools) |
| Privacy | BIP-352 Silent Payments, CoinJoin, PayJoin, [Ark](https://ark-protocol.org) VTXOs |
| State | Zustand + encrypted IndexedDB vault (AES-256-GCM) |
| Monitoring | Prometheus + Grafana dashboards |
| Deploy | Docker Compose (LND + CDK/Nutshell + Fedimint + Aperture + Caddy + Prometheus + Grafana) |

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full phased plan with research traceability.

**Production path:**

| Phase | Codename | Status |
|-------|----------|--------|
| A-E | **Foundation → Hardening** — DB, vault, auth, payments, infra, E2E tests, production hardening | Code complete |
| — | **Production Readiness Gate** — testnet VPS deployment | Pending (human action) |
| 4 | **Citadel** — Longmont pilot + grant applications (OpenSats, HRF, FBCE) | In progress |
| 5 | **Bazaar** — Self-hosted merchant platform (local auth, webhooks, checkout, client SDK, one-command deploy) | Planned |

**Feature path:**

| Phase | Codename | Status |
|-------|----------|--------|
| 0 | **Fortify** — Security hardening (keyset validation, security tiers, remote signer) | Complete |
| 1 | **Keystone** — Core architecture (NUT-24, spend router, merchants, agents, macaroon bakery) | Complete |
| 2 | **Spire** — Full privacy + commerce (Fedimint v0.10, Ark stub, CDK, multi-mint, NUT-26, monitoring) | Complete |
| 3 | **Aether** — Advanced features (STARK eCash, ZK reissuance, governance, HW wallets) | Post-pilot |

### Phase 5: Bazaar — The Merchant Platform

Phase 5 turns ArxMint into a full Stripe alternative. 10 scoped deliverables:

| # | Feature | What It Unlocks |
|---|---------|-----------------|
| 5.1 | Local auth tokens | L402 macaroons on your own node — programmatic access + sandbox mode |
| 5.2 | Webhook engine (local) | `payment.completed` events from your own node for automated fulfillment |
| 5.3 | Self-hosted checkout | Payment page on your domain — no code needed, no middleman |
| 5.4 | Payment status API | `GET /payments/:id` + SSE real-time stream on your node |
| 5.5 | Client SDK | `@arxmint/js` + `@arxmint/react` — connects to your endpoint |
| 5.6 | LNURL-pay + Lightning Address | `name@pay.merchant.com` — scan-and-pay on your domain |
| 5.7 | Merchant dashboard | Self-hosted: payments, analytics, node status, token management |
| 5.8 | One-command deploy | `arxmint merchant init` → Docker Compose → live in 10 minutes |
| 5.9 | Public merchant directory | Customer-facing discovery by category/location |
| 5.10 | Idempotency + hardening | Duplicate request protection, auto-HTTPS, firewall rules |

## Built On

[Fedimint](https://fedimint.org) &middot; [Cashu](https://cashu.space) &middot; [Lightning Labs](https://lightning.engineering) &middot; [Ark](https://ark-protocol.org) &middot; [Docker](https://docker.com)

Piloting in **Longmont, CO**. Grant-eligible: [OpenSats](https://opensats.org), [FBCE](https://www.fedi.xyz/grants), [Fedi](https://www.fedi.xyz).

## Contributing

ArxMint is open source under the [MIT License](LICENSE). Contributions welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines and [open issues](https://github.com/Traviseric/arxmint/issues) for tasks to pick up.

## License

[MIT](LICENSE)

---

_Sound money infrastructure for a parallel voluntary economy. Protection from hacks, overreach, and future controls. Not evasion — sovereignty._
