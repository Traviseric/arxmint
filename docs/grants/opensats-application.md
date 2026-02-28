# OpenSats General Grant Application — ArxMint

**Apply at:** https://opensats.org/apply/grant
**Status:** READY FOR REVIEW — submit after manual review
**Date prepared:** 2026-02-27
**Note:** OpenSats wants applications that "fit comfortably on one page." Keep it concise.

---

## Project Name

ArxMint

## One-line Description

Open-source toolkit that deploys complete Bitcoin circular economies — Fedimint federations, Cashu mints, Lightning gateways, and privacy routing — from a single prompt.

## Project Description

ArxMint is an open-source Next.js application that automates the deployment and operation of private Bitcoin circular economies. A community describes their needs in plain language, and ArxMint generates a complete Docker Compose deployment with Fedimint guardian nodes, a Cashu mint (Nutshell for development, CDK for production), Lightning gateway, Prometheus monitoring, and governance documentation.

The project integrates the tools OpenSats already funds — Cashu TS, CDK, Fedimint SDK, and Nutshell — into a single coherent deployment and management layer. Rather than requiring communities to manually configure each component, ArxMint handles the integration: wallet management across both ecash backends, a spend router that picks the most private payment path, NUT-24 ecash paywalls for API access, and a privacy dashboard that scores each transaction.

ArxMint also supports AI agent commerce via L402 and ecash paywalls. Agents get ephemeral Cashu wallets with TTL and balance limits, enabling machine-to-machine payments without identity or custody infrastructure.

**What exists today:**
- Community generator: NL prompt → Docker Compose with all services
- Dual ecash wallet: Fedimint + Cashu with balance display and send/receive
- Lightning integration via LNC-Web
- L402 + NUT-24 dual paywall middleware
- Privacy dashboard with per-backend scoring and spend routing
- BCE health metrics with JSON/CSV grant export
- Agent marketplace with ecash pay-per-use
- Merchant onboarding with QR codes
- Programmable ecash (time-lock, escrow, proof-of-service conditions)
- Silent Payments (BIP-352) support with BIP-392 descriptors
- Multi-city federation networking

**What grant funding enables:**
- Docker regtest integration tests against real Nutshell and Fedimint
- Upstream contributions to cashu-ts, CDK, and Fedimint (documentation, bug fixes, test coverage)
- Production deployment guide and demo recordings
- Longmont, CO pilot with 30 merchants and 300 users
- Hardware wallet Silent Payment integration testing

## Open Source License

MIT

## GitHub Repository

https://github.com/Traviseric/arxmint

## Tech Stack

- Next.js 15 (App Router), TypeScript, Tailwind
- @fedimint/core 0.1.3 + @fedimint/transport-web 0.1.2 (WASM client)
- cashu-ts 3.5.0 (pure TypeScript)
- @lightninglabs/lnc-web 0.3.5-alpha
- Docker: Fedimint v0.10.0, CDK/Nutshell, arkd, Prometheus + Grafana

## Relevance to Bitcoin

ArxMint lowers the barrier to deploying the ecash infrastructure that OpenSats funds. Cashu TS, CDK, Nutshell, and Fedimint are powerful individually — ArxMint makes them work together as a complete system that non-technical community organizers can deploy. The project directly increases adoption of these tools.

## Applicant

- **Name:** Travis Eric
- **Contact:** [your email]
- **Location:** Longmont, CO
- **Pseudonymous:** No
- **Prior grants:** None (first-time applicant)

## Links

- Repository: https://github.com/Traviseric/arxmint
- Live demo: https://arxmint.vercel.app
- Domain: https://arxmint.com
- Upstream contributions: [link to docs/upstream-contributions.md]

---

## Submission Checklist

- [ ] Review and tighten description (must fit ~1 page in their form)
- [ ] Confirm GitHub repo is public with MIT license
- [ ] Add real contact email
- [ ] Submit at https://opensats.org/apply/grant
- [ ] Update TrendOS pipeline status to "submitted"
