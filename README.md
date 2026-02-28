<p align="center">
  <img src="public/images/logo.png" alt="ArxMint" width="80" />
</p>

<h1 align="center">ArxMint</h1>

<p align="center">
  <strong>Your Bitcoin economy, one prompt away.</strong>
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

---

ArxMint lets anyone spin up a private Bitcoin circular economy — for humans and AI agents — from a single natural language prompt.

Describe your community in plain English. ArxMint generates a private [Fedimint](https://fedimint.org) federation (or lightweight [Cashu](https://cashu.space) mint), Lightning AI agent rails via [L402](https://docs.lightning.engineering/the-lightning-network/l402), and built-in privacy defaults. Deploy with one Docker command. Humans and agents share the same sovereign infrastructure.

**One prompt. One command. Your economy is live.**

## Why ArxMint?

Wallets aren't economies. Holding Bitcoin doesn't build a community where people transact privately, merchants accept ecash, and AI agents sell services for sats.

The technology exists — Fedimint, Cashu, Lightning, L402, Ark — but stitching it together is a serious infrastructure project. ArxMint closes that gap.

## How It Works

1. **Describe your community** — _"Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data."_
2. **ArxMint generates everything** — Fedimint federation config, Lightning agent integration, privacy defaults, Docker deployment
3. **One-command deploy** — `docker compose up` → private ecash mint, Lightning node, L402 endpoints, cycle dashboard
4. **Humans + agents join the same loop** — Community members transact in private ecash. AI agents sell services for sats via L402. Same rails.

## Features

- **Prompt-driven economy creation** — Describe your community in natural language, get a full deployment config
- **Fedimint federation support** — Multi-guardian federated ecash with blinded Chaumian e-cash notes backed by BTC
- **Cashu mint support** — Lightweight local Nutshell + CDK compose generation path for production deployments
- **Lightning AI agent commerce** — L402 + NUT-24 paywall flows, scoped security tiers, macaroon baking, remote signer config validation
- **Privacy defaults on** — CoinJoin/PayJoin routing + honest per-backend support matrix; SP/Ark paths include experimental scaffolding
- **Spend router** — Auto-selects ecash → Lightning → Ark → on-chain based on amount and privacy score
- **Cycle monitoring** — Real-time MVRV, NUPL, and supply-in-profit signals from on-chain data
- **Merchant directory** — Onboarding flow, QR codes, NFC support, "Spend sats here" listings
- **Agent marketplace** — AI agents sell data, compute, privacy audits, and cycle signals for sats
- **BCE health metrics** — Community health dashboard with grant-ready export (JSON/CSV)
- **Deployment generation** — Compose generation for LND + Fedimint/Cashu + Aperture + optional Ark/SP/monitoring services

## Quick Start

```bash
git clone https://github.com/Traviseric/arxmint.git
cd arxmint
npm install
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
│   └── api/                     # API routes (agent, community, cycle, l402)
├── lib/
│   ├── fedimint-sdk.ts          # Fedimint WASM client + gateway bridge
│   ├── cashu-sdk.ts             # Cashu v3 + multi-mint + keyset validation
│   ├── lightning-agent.ts       # LNC + L402 + macaroon bakery + security tiers
│   ├── cashu-paywall.ts         # NUT-24 ecash paywall middleware
│   ├── spend-router.ts          # Privacy-aware spend routing
│   ├── ark-sdk.ts               # Ark VTXO client (board/spend/bridge)
│   ├── silent-payments.ts       # BIP-352 SP scanner + key delegation
│   ├── bce-metrics.ts           # BCE community health + grant export
│   ├── community-generator.ts   # Prompt → Docker Compose + G-Bot
│   ├── privacy-defaults.ts      # Privacy scoring + layer descriptions
│   ├── cycle-monitor.ts         # BTC cycle signals (CoinGecko)
│   └── store.ts                 # Zustand global state
├── components/                  # React components
├── tests/                       # Test suites
├── docker/                      # Docker configs
├── scripts/                     # Setup scripts
└── docs/                        # Spec, roadmap, research cross-reference
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript, Tailwind CSS |
| Ecash | [Fedimint SDK](https://sdk.fedimint.org/) (WASM) + [Cashu-TS](https://github.com/cashubtc/cashu-ts) v3 |
| Lightning | [LNC-Web](https://github.com/lightninglabs/lnc-web) + [Aperture](https://github.com/lightninglabs/aperture) L402 proxy |
| Agent Tools | [Lightning MCP Server](https://github.com/lightninglabs/lightning-agent-tools) (18 tools) |
| Privacy | BIP-352 Silent Payments, CoinJoin, PayJoin, [Ark](https://ark-protocol.org) VTXOs |
| State | Zustand |
| Deploy | Docker Compose (LND + CDK/Nutshell + Fedimint + Aperture + Prometheus + Grafana) |

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full phased plan with research traceability.

| Phase | Codename | Status |
|-------|----------|--------|
| 0 | **Fortify** — Security hardening | In progress (most items complete, remote signer integration still partial) |
| 1 | **Keystone** — Core architecture (NUT-24, spend router, merchants, agents) | In progress (core shipped, hardening/testing ongoing) |
| 2 | **Spire** — Full privacy + commerce (Ark, CDK, multi-mint, monitoring) | In progress (mixed complete/partial/prototype) |
| 3 | **Aether** — Advanced features (STARK eCash, ZK reissuance, governance, HW wallets) | Experimental groundwork |
| 4 | **Citadel** — Production pilot + grants (Longmont deployment, FBCE/OpenSats) | Planning + tooling |

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

See [open issues](https://github.com/Traviseric/arxmint/issues) for tasks to pick up.

## License

[MIT](LICENSE)

---

_Sound money infrastructure for a parallel voluntary economy. Protection from hacks, overreach, and future controls. Not evasion — sovereignty._
