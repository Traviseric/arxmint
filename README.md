<p align="center">
  <img src="public/images/logo.png" alt="ArxMint" width="80" />
</p>

<h1 align="center">ArxMint</h1>

<p align="center">
  <strong>Accept Bitcoin payments. Zero fees. No middleman.</strong><br/>
  <em>Self-hosted payment infrastructure â€” the open-source Stripe alternative.</em>
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

> **Part of the open creator economy.** ArxMint is the payment network. [Teneo Marketplace](https://github.com/Traviseric/teneo-marketplace) is the storefront â€” courses, books, funnels, email marketing. Together: a complete creator platform that can't be shut down.

---

ArxMint is self-hosted Bitcoin payment infrastructure â€” the open-source Stripe alternative. Accept ecash ([Cashu](https://cashu.space)), Lightning, and [Fedimint](https://fedimint.org) federation payments with near-zero fees, instant settlement, no chargebacks, and no customer KYC.

Answer three questions and your merchant node is live in under 15 minutes â€” managed DNS, auto-HTTPS, Lightning liquidity included. Or spin up a full private circular economy from a natural language prompt. Humans and AI agents share the same sovereign infrastructure.

**Three questions. One command. Live in 15 minutes.**

## Why ArxMint?

Stripe charges 2.9% + $0.30 per transaction. A merchant doing $10K/month loses ~$320 to processing fees. Chargebacks add more. Customer payment data gets sold.

ArxMint flips this: ecash payments cost fractions of a penny. Settlement is instant. Chargebacks are impossible (bearer ecash is final). No payment data leaves the system. And it's open source â€” you own the infrastructure.

| | Stripe | ArxMint |
|---|---|---|
| **Transaction fee** | 2.9% + $0.30 | 0% (ecash) or ~0.1% (Lightning routing) |
| **Settlement** | T+2 days | Instant â€” customer pays your node directly |
| **Customer KYC** | Card + billing address | None â€” ecash is anonymous |
| **Chargebacks** | Yes (merchant liability) | Impossible â€” payments are final |
| **Data sold** | Yes | Impossible â€” no central entity holds the data |
| **Open source** | No | Yes â€” MIT license |
| **Self-hosted** | No | Required by design (legally protected) |
| **Censorship risk** | Platform can freeze funds | Impossible â€” you control your own node |
| **Custody** | Stripe holds funds T+2 | Never â€” peer-to-peer, you hold your keys |

## How It Works

### For Merchants (Self-Hosted, Non-Custodial)

```
1. arxmint merchant init â†’ three-question wizard â†’ your payment node is live in < 15 minutes
2. Managed subdomain (storename.arxmint.cloud) + auto-HTTPS â€” no DNS setup
3. LSP opens your first Lightning channel â€” you're receiving payments immediately
4. Customer pays via ecash QR, Lightning, or your self-hosted checkout page
5. Webhook fires from YOUR node â†’ fulfill order
6. Sats arrive directly in YOUR wallet â€” no middleman, no settlement delay
7. Zero-knowledge encrypted backups â€” restore from seed phrase on any new host
```

### For Communities (Prompt-Driven)

1. **Describe your community** â€” _"Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data."_
2. **ArxMint generates everything** â€” Fedimint federation config, Lightning agent integration, privacy defaults, Docker deployment
3. **One-command deploy** â€” `docker compose up` â†’ private ecash mint, Lightning node, L402 endpoints, cycle dashboard
4. **Humans + agents join the same loop** â€” Community members transact in private ecash. AI agents sell services for sats via L402. Same rails.

## Features

### Merchant Payments
- **Payment SDK** â€” `createL402Challenge()`, `verifyL402Token()`, `routePayment()` â€” server-side TypeScript SDK for any backend
- **L402 paywalls** â€” HTTP 402 challenge â†’ Lightning invoice â†’ preimage â†’ access. HMAC-signed macaroons with timing-safe verification
- **Cashu NUT-24 paywalls** â€” Ecash token â†’ access. Double-spend rejection via NUT-07 proof state checks
- **Spend router** â€” Auto-selects ecash â†’ Lightning â†’ Ark â†’ on-chain based on amount and privacy score
- **Invoice primitive** â€” Org-to-org invoices with line items, due dates, state transitions, and invoice-linked checkout/webhook settlement
- **Merchant onboarding** â€” 4-step flow with QR codes, NFC (Numo) support, and payment method selection
- **Settlement** â€” Referral fee settlement with idempotency, Cashu ecash minting, federation deposit paths

### Merchant Node Security
- **Split-plane trust boundary** â€” Data plane (merchant-owned: keys, funds, LND, mint) is fully isolated from control plane (ArxMint-managed: provisioning, DNS, updates). ArxMint never touches keys or funds.
- **Network isolation** â€” Only Caddy binds to public ports (80/443). LND gRPC, Cashu mint admin, PostgreSQL are internal Docker network only.
- **Macaroon lifecycle** â€” `arx_pub_` tokens safe for client-side (invoice-only). Rotation: `POST /api/merchant-keys` (or `scripts/arxmint.sh keys rotate --merchant-id <id>`). Instant revocation via dashboard or `scripts/arxmint.sh keys revoke --merchant-id <id> --key <key>`.
- **Cloudflare Tunnel boundary** â€” Checkout page traffic visible to Cloudflare (acceptable â€” it's public during checkout anyway). LND gRPC, seed phrases, admin macaroons, mint keys never traverse the tunnel.
- **API versioning** â€” `v1` is the stable API surface. Additive changes stay in `v1`. Breaking changes require `v2` with 6-month deprecation window. Client SDK (`@arxmint/js`) follows semver.

### Privacy Infrastructure
- **Fedimint federation support** â€” Multi-guardian federated ecash with blinded Chaumian e-cash notes backed by BTC
- **Cashu mint support** â€” Lightweight Nutshell + CDK compose generation for production
- **Privacy defaults on** â€” CoinJoin/PayJoin routing + honest per-backend support matrix; SP/Ark paths include experimental scaffolding
- **Encrypted client-side vault** â€” AES-256-GCM + PBKDF2-SHA256 (600K iterations). Proofs never touch the server.
- **Nostr identity** â€” NIP-98 login backed by custom HMAC-signed httpOnly cookie sessions. No email required. Same keypair works across ArxMint + Teneo Marketplace.

### AI Agent Commerce
- **Lightning AI agent commerce** â€” L402 + NUT-24 paywall flows, scoped security tiers, macaroon baking, remote signer config validation
- **Agent marketplace** â€” AI agents sell data, compute, privacy audits, and cycle signals for sats
- **Ephemeral agent wallets** â€” Scoped Cashu/Fedimint wallets for autonomous agent operations

### Community Tools
- **Prompt-driven economy creation** â€” Describe your community in natural language, get a full deployment config
- **Cycle monitoring** â€” Real-time MVRV, NUPL, and supply-in-profit signals from on-chain data
- **BCE health metrics** â€” Community health dashboard with grant-ready export (JSON/CSV)
- **Merchant directory** â€” Onboarding flow, QR codes, NFC support, "Spend sats here" listings
- **Deployment generation** â€” Compose generation for LND + Fedimint/Cashu + Aperture + optional Ark/SP/monitoring services

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
# Default (Nutshell â€” development)
npm run setup:full

# Production (CDK mint â€” replaces Nutshell in the stack)
docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml up -d
```

### Run Tests

```bash
npm test
```

## Architecture

```
arxmint/
â”œâ”€â”€ app/                         # Next.js 15 App Router
â”‚   â”œâ”€â”€ page.tsx                 # Landing page
â”‚   â”œâ”€â”€ create/                  # Prompt-driven community creation
â”‚   â”œâ”€â”€ dashboard/               # Privacy, cycle, wallet, BCE metrics
â”‚   â”œâ”€â”€ community/[id]/          # Agent marketplace, merchants, members
â”‚   â”œâ”€â”€ why/                     # Thesis page
â”‚   â”œâ”€â”€ agents/                  # L402 agent commerce explainer
â”‚   â”œâ”€â”€ roadmap/                 # Development roadmap
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ auth/                # Nostr NIP-98 + session auth
â”‚       â”œâ”€â”€ payment/             # Payment challenge + verification
â”‚       â”œâ”€â”€ settlement/          # Referral fee settlement
â”‚       â”œâ”€â”€ invoices/            # Org-to-org invoice primitive
â”‚       â”œâ”€â”€ transactions/        # Transaction ledger
â”‚       â”œâ”€â”€ merchants/           # Merchant CRUD
â”‚       â”œâ”€â”€ l402/                # L402 gated endpoint demo
â”‚       â”œâ”€â”€ agent/               # AI agent commerce (NUT-24)
â”‚       â”œâ”€â”€ community/           # Community management
â”‚       â”œâ”€â”€ bce-metrics/         # BCE health export
â”‚       â””â”€â”€ health/              # Service health checks
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ payment-sdk.ts           # Payment SDK (L402 + Cashu + routing)
â”‚   â”œâ”€â”€ cashu-paywall.ts         # NUT-24 ecash paywall middleware
â”‚   â”œâ”€â”€ cashu-sdk.ts             # Cashu v3 + multi-mint + keyset validation
â”‚   â”œâ”€â”€ fedimint-sdk.ts          # Fedimint WASM client + gateway bridge
â”‚   â”œâ”€â”€ lightning-agent.ts       # LNC + L402 + macaroon bakery + security tiers
â”‚   â”œâ”€â”€ spend-router.ts          # Privacy-aware spend routing
â”‚   â”œâ”€â”€ auth-middleware.ts       # Nostr session cookies + cross-app session verification
â”‚   â”œâ”€â”€ cashu-vault.ts           # Encrypted client-side proof vault
â”‚   â”œâ”€â”€ db.ts                    # Prisma DB client + resilient queries
â”‚   â”œâ”€â”€ invoices.ts              # Invoice state machine + totals + payment links
â”‚   â”œâ”€â”€ invoice-events.ts        # Invoice state-change event payload + webhook emission
â”‚   â”œâ”€â”€ ark-sdk.ts               # Ark VTXO client (stub â€” waiting on upstream SDK)
â”‚   â”œâ”€â”€ silent-payments.ts       # BIP-352 SP scanner + key delegation
â”‚   â”œâ”€â”€ bce-metrics.ts           # BCE community health + grant export
â”‚   â”œâ”€â”€ community-generator.ts   # Prompt â†’ Docker Compose + G-Bot
â”‚   â”œâ”€â”€ privacy-defaults.ts      # Privacy scoring + layer descriptions
â”‚   â”œâ”€â”€ cycle-monitor.ts         # BTC cycle signals (CoinGecko)
â”‚   â”œâ”€â”€ pilot-deployment.ts      # Pilot KPI targets + deployment timeline
â”‚   â”œâ”€â”€ grant-templates.ts       # OpenSats/HRF/FBCE grant generators
â”‚   â””â”€â”€ store.ts                 # Zustand global state
â”œâ”€â”€ components/                  # React components
â”œâ”€â”€ prisma/                      # Database schema + migrations
â”œâ”€â”€ tests/                       # Unit + E2E test suites
â”œâ”€â”€ docker/                      # Docker configs (Caddy, Grafana, Prometheus, CDK)
â”œâ”€â”€ scripts/                     # Setup, backup, security scripts
â””â”€â”€ docs/                        # Spec, roadmap, research, security, governance
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS |
| Database | PostgreSQL 15 (Prisma ORM), internal Docker network only |
| Auth | Nostr NIP-98 + custom HMAC-signed cookie sessions; L402/Cashu paywalls for agents |
| Ecash | [Fedimint SDK](https://sdk.fedimint.org/) (WASM) + [Cashu-TS](https://github.com/cashubtc/cashu-ts) v3 |
| Lightning | [LNC-Web](https://github.com/lightninglabs/lnc-web) + [Aperture](https://github.com/lightninglabs/aperture) L402 proxy |
| Agent Tools | [Lightning MCP Server](https://github.com/lightninglabs/lightning-agent-tools) (18 tools) |
| Privacy | BIP-352 Silent Payments, CoinJoin, PayJoin, [Ark](https://ark-protocol.org) VTXOs |
| State | Zustand + encrypted IndexedDB vault (AES-256-GCM) |
| Monitoring | Prometheus + Grafana dashboards |
| Deploy | Docker Compose (LND + CDK/Nutshell + Fedimint + Aperture + Caddy + Prometheus + Grafana) |

## Roadmap

See [docs/core/roadmap.md](docs/core/roadmap.md) for the full phased plan with research traceability.

**Production path:**

| Phase | Codename | Status |
|-------|----------|--------|
| A-E | **Foundation â†’ Hardening** â€” DB, vault, auth, payments, infra, E2E tests, production hardening | Code complete |
| â€” | **Production Readiness Gate** â€” testnet VPS deployment | Pending (human action) |
| 4 | **Citadel** â€” Longmont pilot + grant applications (OpenSats, HRF, FBCE) | In progress |
| 5 | **Bazaar** â€” Self-hosted merchant platform (split-plane deploy, managed DNS, LSP liquidity, zero-knowledge backups, appliance updates, checkout, webhooks, client SDK, Umbrel/StartOS) | Planned |
| 6 | **Enterprise Polish** â€” External security audit, e-commerce plugins (WooCommerce/Shopify/Zapier), compliance documentation kit, developer portal | Planned |

**Feature path:**

| Phase | Codename | Status |
|-------|----------|--------|
| 0 | **Fortify** â€” Security hardening (keyset validation, security tiers, remote signer) | Complete |
| 1 | **Keystone** â€” Core architecture (NUT-24, spend router, merchants, agents, macaroon bakery) | Complete |
| 2 | **Spire** â€” Full privacy + commerce (Fedimint v0.10, Ark stub, CDK, multi-mint, NUT-26, monitoring) | Complete |
| 3 | **Aether** â€” Advanced features (STARK eCash, ZK reissuance, governance, HW wallets) | Post-pilot |

### Phase 5: Bazaar â€” The Merchant Platform

Phase 5 turns ArxMint into a full Stripe alternative. Informed by 11 self-hosting UX research studies. 16 scoped deliverables:

| # | Feature | What It Unlocks |
|---|---------|-----------------|
| 5.1 | Local auth tokens | L402 macaroons on your own node â€” programmatic access + sandbox mode |
| 5.2 | Webhook engine (local) | `payment.completed` events from your own node for automated fulfillment |
| 5.3 | Self-hosted checkout | Payment page on your domain â€” no code needed, no middleman |
| 5.4 | Payment status API | `GET /payments/:id` + SSE real-time stream on your node |
| 5.5 | Client SDK | `@arxmint/js` + `@arxmint/react` â€” connects to your endpoint |
| 5.6 | LNURL-pay + Lightning Address | `name@pay.merchant.com` â€” scan-and-pay on your domain |
| 5.7 | Merchant dashboard | Self-hosted: payments, analytics, traffic-light health, push notifications |
| 5.8a | Provisioning service | BYOC control plane â€” merchant creates cloud account, ArxMint provisions via OAuth |
| 5.8b | Managed DNS + connectivity | `storename.arxmint.cloud` default + Cloudflare Tunnel â€” no DNS setup needed |
| 5.8c | LSP liquidity bootstrap | JIT channel opening on first payment â€” receive sats immediately |
| 5.8d | Merchant stack composition | LND Neutrino (no full chain sync) + Cashu mint â€” live in < 15 minutes |
| 5.9 | Public merchant directory | Customer-facing discovery by category/location |
| 5.10 | Idempotency + hardening | Duplicate request protection, auto-HTTPS, firewall rules |
| 5.11 | Node lifecycle | Appliance updates (stack BOM + canary rings) + zero-knowledge encrypted backups + one-click restore from seed |
| 5.12 | Home node packaging | Umbrel + StartOS app store packages for sovereignty-first node runners |
| 5.13 | Mobile remote control | React Native POS + remote dashboard (PWA bridge via 5.7 first) |

## Deploy Your Own Bitcoin Circular Economy

ArxMint is designed to be replicated. The [Replication Playbook](docs/replication-playbook/README.md) documents everything needed to launch a Bitcoin circular economy in your own community, based on the Longmont, CO pilot.

**Five steps to your own pilot:**

```
1. Provision a VPS (~$20/month â€” Hetzner, DigitalOcean)
2. Run the Community Generator â†’ describe your community â†’ download docker-compose.yml
3. docker compose up -d â†’ Lightning node + Cashu mint + monitoring live
4. Fund Lightning channels (min 1M sats inbound, 3+ channels)
5. Onboard founding merchants with QR codes and/or Numo NFC cards
```

**Playbook documents:**
- [Infrastructure Setup](docs/replication-playbook/infrastructure-setup.md) â€” Docker, LND, Cashu/Fedimint, TLS
- [Guardian Recruitment](docs/replication-playbook/guardian-recruitment.md) â€” DKG ceremony, governance (Fedimint only)
- [Merchant Onboarding Kit](docs/replication-playbook/merchant-onboarding-kit.md) â€” Scripts, QR codes, follow-up schedule
- [Monitoring Runbook](docs/replication-playbook/monitoring-runbook.md) â€” Prometheus, Grafana, incident response

Admin API: `GET /api/admin/playbook?format=markdown` downloads the full playbook as a markdown file (requires Nostr admin auth).

---

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

See [docs/development/contributing.md](docs/development/contributing.md) for detailed guidelines and [open issues](https://github.com/Traviseric/arxmint/issues) for tasks to pick up.

## License

[MIT](LICENSE)

---

_Accept Bitcoin payments. Zero fees. No middleman. Self-hosted. Non-custodial. Unstoppable._
