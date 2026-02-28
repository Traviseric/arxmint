# From Prompt to Production: How ArxMint Deploys Bitcoin Infrastructure

**Target publish date:** March 25, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** fedimint setup, cashu mint tutorial, bitcoin docker deploy, community mint setup

---

Setting up a Bitcoin circular economy used to require deep expertise in multiple protocols, Docker networking, and Lightning node management. ArxMint reduces this to a natural language prompt.

## The Community Generator

ArxMint's community generator takes a plain-language description and outputs a complete deployment:

**Input:**
> "A 40-person co-working space in Longmont, CO. Privacy is important. We want ecash for daily coffee and lunch purchases, and federated custody for member savings. 5 guardians."

**Output:**
- Docker Compose with Fedimint (5 guardians), CDK mint (production-grade Cashu for 40+ members), Lightning gateway, Prometheus + Grafana monitoring
- Aperture reverse proxy for L402 API paywalls
- Silent Payments indexer for private on-chain peg-outs
- Governance document template scaled for 5 guardians with Byzantine fault tolerance

## What Gets Generated

The community generator makes smart decisions based on your input:

**Cashu Backend Selection:**
- Under 30 members or testnet → Nutshell (simple, fast to iterate)
- Over 30 members or mainnet → CDK (Postgres-backed, Prometheus metrics, production-ready)

**Privacy Stack:**
- If Ark spends enabled → adds `arkd` Docker service
- If Silent Payments enabled → adds SP indexer service
- Always includes Prometheus + Grafana for monitoring

**Guardian Governance:**
- Scales quorum thresholds by guardian count (e.g., 3-of-5, 5-of-7)
- Generates rotation policies with term limits
- Includes incident response templates
- Outputs a human-readable governance document (useful for grant applications)

## The Deployment Flow

1. **Describe** your community via the create page or API
2. **Review** the generated Docker Compose and governance docs
3. **Distribute** guardian configs to your guardian operators
4. **Deploy** with `docker compose up -d`
5. **Onboard** merchants with QR codes from the merchant onboarding flow
6. **Monitor** via the BCE health dashboard

Steps 1-2 take about 5 minutes. Steps 3-5 depend on your community's coordination speed. Step 6 is ongoing.

## What's Real vs. What's Planned

Transparency matters, especially for grant evaluators:

**Working today (verified against real Nutshell/Fedimint):**
- Docker Compose generation with all services
- Wallet panel with Fedimint + Cashu + Lightning balances
- Send/receive ecash tokens
- Create and pay Lightning invoices
- Privacy dashboard with per-backend scoring
- BCE metrics with JSON/CSV export

**Deployed but needs regtest verification:**
- NUT-24 ecash paywall integration
- L402 via Fedimint gateway bridge
- Programmable ecash spend conditions

**Roadmap (not yet implemented):**
- One-click cloud deploy (Fly.io, Railway)
- Mobile wallet companion app
- Automated guardian health alerts via Telegram

## The Architecture

ArxMint is a Next.js 15 application using:

- **@fedimint/core** + **@fedimint/transport-web** — WASM-based Fedimint client
- **cashu-ts v3** — Pure TypeScript Cashu wallet and mint interaction
- **lnc-web** — Lightning Node Connect for browser-based Lightning
- **Zustand** — State management for wallet and privacy state
- **Tailwind + custom component classes** — UI (`.sovereign-card`, `.sovereign-btn`, etc.)

Everything runs client-side except the Docker generation and API routes. The Fedimint and Cashu SDKs are client libraries — they connect to existing infrastructure, they don't create it. Federation creation requires `fedimintd` guardian nodes, which the Docker Compose provides.

---

*Next week: Privacy-First Payments — Silent Payments, Ecash, and the Sovereign Stack*
