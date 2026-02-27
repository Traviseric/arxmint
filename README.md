# ArxMint

**Your Bitcoin economy, one prompt away.**

ArxMint lets anyone spin up a private Bitcoin circular economy — for humans and AI agents — from a single natural language prompt.

Describe your community in plain English. ArxMint generates a private [Fedimint](https://fedimint.org) federation (or lightweight [Cashu](https://cashu.space) mint), Lightning AI agent rails via [L402](https://docs.lightning.engineering/the-lightning-network/l402), and built-in privacy defaults. Deploy with one Docker command. Humans and agents share the same sovereign infrastructure.

## Why ArxMint?

Wallets aren't economies. Holding Bitcoin doesn't build a community where people transact privately, merchants accept ecash, and AI agents sell services for sats.

The technology exists — Fedimint, Cashu, Lightning, L402 — but stitching it together is a serious infrastructure project. ArxMint closes that gap.

**One prompt. One command. Your economy is live.**

## Features

- **Prompt-driven economy creation** — Describe your community in natural language, get a full deployment config
- **Fedimint federation support** — Multi-guardian federated ecash with blinded Chaumian e-cash notes backed by BTC
- **Cashu mint fallback** — Lightweight single-operator mint for faster setup
- **Lightning AI agent integration** — L402 paywalls + MCP server live today; scoped macaroon tiers and remote signer are tracked in Phase 0/1
- **Privacy defaults on** — Privacy dashboard covers Silent Payments (BIP352), CoinJoin, PayJoin, and Ark with backend-specific capability status
- **Cycle monitoring** — Real-time MVRV, NUPL, and supply-in-profit signals from on-chain data
- **Merchant directory** — "Spend sats here" listings for your community's circular economy
- **Agent marketplace** — AI agents sell data, compute, privacy audits, and cycle signals for sats via L402
- **Docker one-command deploy** — Full stack: LND + Cashu Nutshell + Fedimint (3 guardians) + Aperture L402 proxy

## Quick Start

```bash
# Clone the repo
git clone https://github.com/[your-username]/arxmint.git
cd arxmint

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Create Your Community**.

### Deploy the Full Stack

```bash
# Copy environment template
cp .env.example .env

# Start the full Docker stack (LND + Cashu + Fedimint + Aperture)
npm run setup:full

# Or start with just a Cashu mint (lighter)
npm run setup:cashu
```

## How It Works

1. **Describe your community** — "Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents selling data."
2. **ArxMint generates everything** — Fedimint federation config, Lightning agent integration, privacy defaults, Docker deployment
3. **One-command deploy** — `docker compose up` → private ecash mint, Lightning node, L402 endpoints, cycle dashboard
4. **Humans + agents join the same loop** — Community members transact in private ecash. AI agents sell services for sats via L402. Same rails.

## Architecture

```
arxmint/
├── app/                    # Next.js 15 App Router pages
│   ├── create/             # Prompt-driven community creation
│   ├── dashboard/          # Privacy + cycle monitoring
│   ├── community/[id]/     # Community view
│   └── api/                # API routes (agent, community, cycle, l402)
├── lib/
│   ├── fedimint-sdk.ts     # Fedimint WASM client wrapper
│   ├── cashu-sdk.ts        # Cashu v3 client wrapper
│   ├── lightning-agent.ts  # LNC + L402 client
│   ├── community-generator.ts  # Prompt → Docker Compose generation
│   ├── cycle-monitor.ts    # BTC cycle signals (CoinGecko)
│   ├── privacy-defaults.ts # Silent Payments, CoinJoin, PayJoin, Ark
│   └── store.ts            # Zustand global state
├── components/             # React components
├── docker/                 # Docker configs (Cashu, Aperture)
├── scripts/                # Setup scripts (federation, agent tools)
├── docker-compose.yml      # Full stack deployment
└── docs/                   # Documentation
```

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Ecash:** [Fedimint SDK](https://sdk.fedimint.org/) (WASM) + [Cashu-TS](https://github.com/cashubtc/cashu-ts) v3
- **Lightning:** [LNC-Web](https://github.com/lightninglabs/lnc-web) + [Aperture](https://github.com/lightninglabs/aperture) L402 proxy
- **Agent Tools:** [Lightning Agent Tools](https://github.com/lightninglabs/lightning-agent-tools) MCP server
- **Privacy:** BIP352 Silent Payments, CoinJoin, PayJoin, Ark (with backend-specific support constraints)
- **State:** Zustand
- **Deploy:** Docker Compose (LND + Nutshell + Fedimint + Aperture)

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full phased plan.
See [docs/spec.md](docs/spec.md) for the canonical product/technical spec used by roadmap and research cross-reference.

- **Phase 0 — Fortify:** Security hardening (keyset validation, agent permission tiers, remote signer)
- **Phase 1 — Keystone:** NUT-24 paywalls, spend router, BCE metrics, merchant onboarding
- **Phase 2 — Spire:** Fedimint v0.10.0, Ark SDK, CDK upgrade, monitoring
- **Phase 3 — Aether:** STARK eCash, ZK reissuance, governance, hardware wallets
- **Phase 4 — Citadel:** Longmont pilot, grant applications (FBCE/OpenSats), replication playbook

## Contributing

ArxMint is open source under the [MIT License](LICENSE). Contributions welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)

---

*Sound money infrastructure for a parallel voluntary economy. Protection from hacks, overreach, and future controls. Not evasion — sovereignty.*
