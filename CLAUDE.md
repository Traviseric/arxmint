# ArxMint — Agent Onboarding

## What This Project Is

ArxMint is an **AI Sovereign Circular Economy Builder** — a Next.js web app that lets anyone create private Bitcoin circular economies from a natural language prompt. It generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**One prompt → full sovereign economy config → one Docker command → live.**

The unique wedge: **humans and AI agents share the same private commerce infrastructure.** Agents sell data/compute via L402 paywalls; humans transact in ecash; both use the same Lightning-connected federation.

## Current State

**Working app** with 10 routes and 4 API endpoints. Builds and runs on `npm run dev`.

### What's Built
- Prompt-driven community creator (NL → Docker Compose + Aperture config)
- Wallet panel with Fedimint/Cashu/Lightning connection handlers + send/receive ecash
- Privacy dashboard with score ring + layer status cards
- Cycle alerts with live BTC data from CoinGecko (MVRV, NUPL, supply in profit)
- Agent marketplace with 4 L402-gated services (privacy-audit, cycle-signals, data, compute)
- Full Docker stack: LND + Cashu Nutshell + Fedimint (3 guardians) + Aperture

### What's NOT Built Yet
See `docs/roadmap.md` for the full phased plan. Key gaps:
- Security hardening (Phase 0) — keyset validation, agent permission tiers, remote signer
- NUT-24 ecash paywalls, spend router, BCE metrics, merchant onboarding (Phase 1)
- Ark SDK, CDK upgrade, multi-mint, monitoring stack (Phase 2)

## Tech Stack

- **Framework:** Next.js 15 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS with custom dark theme (Bitcoin orange `#F7931A` accents)
- **State:** Zustand (`lib/store.ts`)
- **Ecash:** `@fedimint/core` 0.1.3 (WASM) + `@cashu/cashu-ts` 3.5.0
- **Lightning:** `@lightninglabs/lnc-web` 0.3.5-alpha + Aperture L402 proxy
- **Agent Tools:** `@lightninglabs/lightning-mcp-server` (18 MCP tools)
- **Deploy:** Docker Compose (LND + Nutshell + Fedimint + Aperture)

## Key Architecture Rules

1. **Fedimint SDK is CLIENT-only.** It joins existing federations via invite code. It does NOT create federations. Federation creation requires `fedimintd` Docker nodes.
2. **LNC-Web is WASM, client-side only.** Always use `'use client'` directives. Dynamic imports to avoid SSR.
3. **Cashu `cashu-ts` v3 API.** The Wallet class uses `createMintQuoteBolt11()` → `mintProofs()`. Melt preimage is at `result.quote.payment_preimage` (NOT `result.payment_preimage`).
4. **L402 flow:** HTTP 402 → parse `WWW-Authenticate` header → pay Lightning invoice → get preimage → retry with `Authorization: L402 <macaroon>:<preimage>`.
5. **Silent Payments for Fedimint peg-outs require server-side federation module changes** — it's NOT a client toggle. The privacy dashboard must show honest per-backend status.

## File Map

```
app/
  page.tsx                    # Landing page (hero, pillars, how-it-works)
  layout.tsx                  # Root layout with nav + footer
  globals.css                 # Dark theme, .sovereign-card, .sovereign-btn classes
  create/page.tsx             # Prompt form → community config generator
  dashboard/page.tsx          # Overview, Privacy, Cycle, Wallet tabs
  community/[id]/page.tsx     # Agent marketplace, merchants, members, chat tabs
  api/agent/route.ts          # 4 agent services (privacy-audit, cycle-signals, data, compute)
  api/community/route.ts      # POST: generate community from prompt
  api/cycle/route.ts          # GET: live BTC cycle metrics
  api/l402/route.ts           # GET: L402 demo (402 challenge pattern)

lib/
  fedimint-sdk.ts             # SovereignFedimintClient + AgentFedimintWallet — WASM, lazy-load
  cashu-sdk.ts                # SovereignCashuClient + AgentCashuWallet — v3, keyset validation
  lightning-agent.ts          # SovereignLightningClient — LNC, l402Fetch, macaroon bakery
  cashu-paywall.ts            # NUT-24 ecash paywall — dual L402/Cashu 402 challenges
  spend-router.ts             # Privacy-aware spend routing (ecash→LN→Ark→on-chain)
  bce-metrics.ts              # BCE community health metrics + grant export (JSON/CSV)
  community-generator.ts      # parsePrompt() → generateDeployment() + G-Bot integration
  privacy-defaults.ts         # PRIVACY_PRESETS, computePrivacyScore(), layer descriptions
  cycle-monitor.ts            # getCycleMetrics() from CoinGecko, MVRV/NUPL/supply-in-profit
  store.ts                    # Zustand: balance, community, connections, cycle metrics
  types.ts                    # All TypeScript types (CommunityConfig, WalletBalance, etc.)
  utils.ts                    # formatSats(), cn() class helper

components/
  create-community-form.tsx   # NL prompt → config → Docker output with copy/download
  privacy-dashboard.tsx       # SVG score ring + privacy layer cards
  cycle-alerts.tsx            # Signal banner + metrics grid + auto-fetch
  wallet-panel.tsx            # Full wallet: receive/send ecash, invoices, spend router
  merchant-onboard.tsx        # Multi-step merchant onboarding + directory cards
```

## Roadmap (read `docs/roadmap.md` for full detail)

```
Phase 0: Fortify     (Security hardening)           ← CURRENT PRIORITY
Phase 1: Keystone    (Core architecture upgrades)
Phase 2: Spire       (Full privacy + commerce stack)
Phase 3: Aether      (Advanced features + scale)
Phase 4: Citadel     (Production + grant deployment)
```

### Phase 0 — Fortify (COMPLETE)

All 4 security-critical fixes implemented and verified.

| Task | File | Status |
|---|---|---|
| 0.1 Cashu keyset ID validation | `lib/cashu-sdk.ts` | Done |
| 0.2 Fix Silent Payments status | `lib/privacy-defaults.ts` | Done |
| 0.3 Agent security tiers | `lib/lightning-agent.ts` | Done |
| 0.4 Remote signer | `lib/lightning-agent.ts` | Done |

### Phase 1 — Keystone (COMPLETE)

All 7 core architecture upgrades implemented and verified.

| Task | File | Status |
|---|---|---|
| 1.1 NUT-24 ecash paywalls | `lib/cashu-paywall.ts` | Done |
| 1.2 Spend router | `lib/spend-router.ts` | Done |
| 1.3 BCE metrics dashboard | `lib/bce-metrics.ts` | Done |
| 1.4 Merchant onboarding | `components/merchant-onboard.tsx` | Done |
| 1.5 Macaroon bakery | `lib/lightning-agent.ts` | Done |
| 1.6 Agent wallet pattern | `lib/cashu-sdk.ts`, `lib/fedimint-sdk.ts` | Done |
| 1.7 G-Bot integration | `lib/community-generator.ts` | Done |

### Phase 2 — Spire (NEXT)

| Task | File | What |
|---|---|---|
| 2.1 Fedimint v0.10.0 | `docker-compose.yml` | Upgrade from v0.5.0 to v0.10.0 Lighthouse. |
| 2.2 Ark SDK | New `lib/ark-sdk.ts` | SovereignArkClient — Ark VTXOs for high-privacy spends. |
| 2.3 CDK mint upgrade | `docker-compose.yml` | Replace Nutshell with CDK for production Cashu mints. |
| 2.4 Multi-mint (Coco) | `lib/cashu-sdk.ts` | Multi-mint balance management, cross-mint payments. |
| 2.5 NUT-26 QR/NFC | `components/wallet-panel.tsx` | `cashu:` URI format, scannable QR codes for merchant POS. |
| 2.6 SP infrastructure | New `lib/silent-payments.ts` | SP indexer Docker service, scan scheduling, key delegation. |
| 2.7 Monitoring | `docker-compose.yml` | Prometheus + Grafana stack for operator-grade monitoring. |
| 2.8 Gateway bridge | `lib/fedimint-sdk.ts` | Route L402 payments through Fedimint gateway (ecash → LN). |

## Cross-Reference

`docs/research-crossref.md` maps 7 research documents to every spec section in `docs/spec.md`, implementation file, and gap. It currently identifies **36 gaps** organized by priority (P0-P3). Every roadmap item traces back to a specific research finding.

## Style Conventions

- **CSS:** Use existing Tailwind classes. Custom components use `.sovereign-card`, `.sovereign-btn`, `.sovereign-btn-outline`, `.sovereign-input` from `globals.css`.
- **Colors:** `btc-orange` (#F7931A), `sovereign-dark` (#0a0a0a), `sovereign-panel` (#111), `sovereign-text` (#e5e5e5), `sovereign-muted` (#737373).
- **Icons:** `lucide-react` throughout.
- **State:** All shared state via Zustand store (`useSovereignStore`). No prop drilling.
- **SDK clients:** Singleton pattern via `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`.
- **API routes:** Next.js Route Handlers in `app/api/`. Return `NextResponse.json()`.
- **Components:** `'use client'` for anything touching browser APIs, WASM, or Zustand.

## Brand

- **Name:** ArxMint (Arx = Latin for citadel + Mint = ecash mint)
- **Tagline:** "Build the citadel." / "Your Bitcoin economy, one prompt away."
- **Voice:** Confident builder. Direct over clever. Protective over aggressive.
- **Theme:** Dark, minimal, fortress energy. Cathedral arches, vault geometry.

## Running the Project

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build (10 routes)
npm run setup:cashu  # Docker: LND + Cashu mint only
npm run setup:full   # Docker: Full stack (LND + Cashu + Fedimint + Aperture)
```
