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
  fedimint-sdk.ts             # SovereignFedimintClient — WASM wrapper, lazy-load, singleton
  cashu-sdk.ts                # SovereignCashuClient — v3 wallet, localStorage proofs
  lightning-agent.ts          # SovereignLightningClient — LNC + l402Fetch() + MCP config
  community-generator.ts      # parsePrompt() → generateDeployment() (Docker + Aperture)
  privacy-defaults.ts         # PRIVACY_PRESETS, computePrivacyScore(), layer descriptions
  cycle-monitor.ts            # getCycleMetrics() from CoinGecko, MVRV/NUPL/supply-in-profit
  store.ts                    # Zustand: balance, community, connections, cycle metrics
  types.ts                    # All TypeScript types (CommunityConfig, WalletBalance, etc.)
  utils.ts                    # formatSats(), cn() class helper

components/
  create-community-form.tsx   # NL prompt → config → Docker output with copy/download
  privacy-dashboard.tsx       # SVG score ring + privacy layer cards
  cycle-alerts.tsx            # Signal banner + metrics grid + auto-fetch
  wallet-panel.tsx            # Full wallet: receive/send ecash, invoices, connect backends
```

## Roadmap (read `docs/roadmap.md` for full detail)

```
Phase 0: Fortify     (Security hardening)           ← CURRENT PRIORITY
Phase 1: Keystone    (Core architecture upgrades)
Phase 2: Spire       (Full privacy + commerce stack)
Phase 3: Aether      (Advanced features + scale)
Phase 4: Citadel     (Production + grant deployment)
```

### Phase 0 — Fortify (Do This First)

These are **security-critical** fixes. No new features until these are done.

| Task | File | What |
|---|---|---|
| 0.1 Cashu keyset ID validation | `lib/cashu-sdk.ts` | Verify keyset IDs against mint pubkeys. Prevent NUT-13 collision attacks. |
| 0.2 Fix Silent Payments status | `lib/privacy-defaults.ts` | Show honest per-backend SP availability. Fedimint SP = "requires federation module". |
| 0.3 Agent security tiers | `lib/lightning-agent.ts` | Add WATCH_ONLY / PAY_ONLY / ADMIN tiers. Default agents to WATCH_ONLY. |
| 0.4 Remote signer | `lib/lightning-agent.ts` | Agents must never hold signing keys. Add `litd` remote signer support. |

### Phase 1 — Keystone (After Phase 0)

| Task | File | What |
|---|---|---|
| 1.1 NUT-24 ecash paywalls | New `lib/cashu-paywall.ts` | Accept Cashu tokens as agent payment alongside Lightning L402. |
| 1.2 Spend router | New `lib/spend-router.ts` | Auto-select ecash→LN→Ark→on-chain by amount + privacy level. |
| 1.3 BCE metrics dashboard | New `lib/bce-metrics.ts` | Merchant count, MAU, spend velocity, payment success rate. |
| 1.4 Merchant onboarding | New `components/merchant-onboard.tsx` | Multi-step form, QR generation, POS setup guidance. |
| 1.5 Macaroon bakery | `lib/lightning-agent.ts` | Generate scoped credentials (pay-only, invoice-only, read-only). |
| 1.6 Agent wallet pattern | `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts` | Ephemeral, in-memory, auto-expire agent wallets. |
| 1.7 G-Bot integration | `lib/community-generator.ts` | Use Fedimint's G-Bot for guided federation bootstrap. |

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
