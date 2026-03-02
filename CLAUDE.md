# ArxMint — Agent Onboarding

## What This Project Is

ArxMint is an **AI Sovereign Circular Economy Builder** — a Next.js web app that lets anyone create private Bitcoin circular economies from a natural language prompt. Generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**One prompt → full sovereign economy config → one Docker command → live.**

Humans and AI agents share the same private commerce infrastructure. Agents sell data/compute via L402 paywalls; humans transact in ecash; both use the same Lightning-connected federation.

**Status:** All implementation tasks complete. Phases A–E (production hardening) + Phases 0–2 (feature build-out) done. Production Readiness Gate pending testnet VPS deployment (human action required). Phase 4 (Citadel pilot) in progress — grants drafted, KPI framework ready, pilot materials complete. Phase 5 (Bazaar) planned — decentralized Stripe alternative with merchant API keys, webhooks, hosted checkout, client SDK, and merchant dashboard. See `docs/roadmap.md`.

## Lookup Table

| Concept | File(s) | Search Term |
|---------|---------|-------------|
| Community generator | `lib/community-generator.ts` | `parsePrompt generateDeployment` |
| Fedimint SDK (WASM) | `lib/fedimint-sdk.ts` | `SovereignFedimintClient` |
| Cashu SDK (v3) | `lib/cashu-sdk.ts` | `SovereignCashuClient` |
| Lightning / LNC | `lib/lightning-agent.ts` | `SovereignLightningClient l402Fetch` |
| Cashu paywall (NUT-24) | `lib/cashu-paywall.ts` | `NUT24 ecashPaywall` |
| Spend router | `lib/spend-router.ts` | `routeSpend` |
| BCE metrics | `lib/bce-metrics.ts` | `computeBCEMetrics` |
| Ark SDK | `lib/ark-sdk.ts` | `SovereignArkClient` |
| Silent Payments | `lib/silent-payments.ts` | `BIP352 SilentPayment` |
| Privacy scoring | `lib/privacy-defaults.ts` | `computePrivacyScore PRIVACY_PRESETS` |
| Cycle monitor | `lib/cycle-monitor.ts` | `getCycleMetrics MVRV NUPL` |
| Zustand store | `lib/store.ts` | `useSovereignStore` |
| Types | `lib/types.ts` | `CommunityConfig WalletBalance` |
| Landing page | `app/page.tsx` | `hero pillars` |
| Create community | `app/create/page.tsx`, `components/create-community-form.tsx` | `prompt Docker` |
| Dashboard | `app/dashboard/page.tsx` | `Privacy Cycle Wallet` |
| Wallet panel | `components/wallet-panel.tsx` | `receive send ecash` |
| Privacy dashboard | `components/privacy-dashboard.tsx` | `score ring layer` |
| Merchant onboarding | `components/merchant-onboard.tsx` | `NuMo NFC` |
| Agent API | `app/api/agent/route.ts` | `privacy-audit cycle-signals` |
| L402 demo | `app/api/l402/route.ts` | `WWW-Authenticate 402` |
| Pilot deployment | `lib/pilot-deployment.ts` | `PilotKPITargets generatePilotTimeline MultiCityNetwork` |
| Grant templates (TS lib) | `lib/grant-templates.ts` | `generateFBCEApplication generateOpenSatsApplication` |
| Grant docs + human tasks | `C:\code\te-btc\internal\docs\arxmint\` | `grants/ human_tasks.md` |
| Replication playbook | `lib/replication-playbook.ts` | `generateReplicationPlaybook exportPlaybookMarkdown` |
| Spec + cross-ref | `docs/spec.md`, `docs/research-crossref.md` | — |
| Roadmap (phases) | `docs/roadmap.md` | `Phase Fortify Keystone Spire Aether Citadel Bazaar` |
| Brand guide | `docs/brand.md` | `tagline voice palette audience` |
| Docs index | `docs/README.md` | — |
| Payment SDK | `lib/payment-sdk.ts` (planned) | `createL402Challenge verifyL402Token routePayment` |
| Marketplace integration | See `C:\code\teneo-marketplace` | `teneo-marketplace, storefront, federation, revenue share` |

## Tech Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS (dark theme, `#F7931A` accents), Zustand, `@fedimint/core` 0.1.3 (WASM), `@cashu/cashu-ts` 3.5.0, `@lightninglabs/lnc-web` 0.3.5-alpha, Aperture L402 proxy, Docker Compose (LND + Nutshell + Fedimint + Aperture).

## Key Architecture Rules

1. **Fedimint SDK is CLIENT-only.** Joins existing federations via invite code. Does NOT create federations — that requires `fedimintd` Docker nodes.
2. **LNC-Web is WASM, client-side only.** Always `'use client'`. Dynamic imports to avoid SSR.
3. **Cashu `cashu-ts` v3 API.** `createMintQuoteBolt11()` → `mintProofs()`. Melt preimage at `result.quote.payment_preimage`.
4. **L402 flow:** HTTP 402 → parse `WWW-Authenticate` → pay invoice → get preimage → retry with `Authorization: L402 <macaroon>:<preimage>`.
5. **Silent Payments require server-side federation module changes** — not a client toggle.

## Style Conventions

- **CSS:** Tailwind + `.sovereign-card`, `.sovereign-btn`, `.sovereign-btn-outline`, `.sovereign-input` from `globals.css`.
- **Colors:** `btc-orange` (#F7931A), `sovereign-dark` (#0a0a0a), `sovereign-panel` (#111), `sovereign-text` (#e5e5e5), `sovereign-muted` (#737373).
- **Icons:** `lucide-react`. **State:** Zustand (`useSovereignStore`), no prop drilling.
- **SDK clients:** Singleton via `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`.
- **API routes:** Next.js Route Handlers in `app/api/`. Return `NextResponse.json()`.
- **Components:** `'use client'` for browser APIs, WASM, or Zustand.

## Brand

ArxMint (Arx = citadel + Mint = ecash). Voice: confident builder, direct, protective. Theme: dark, minimal, fortress energy. Full guide: `docs/brand.md`.

## Running the Project

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build (14 routes)
npm run setup:cashu  # Docker: LND + Cashu mint only
npm run setup:full   # Docker: Full stack (LND + Cashu + Fedimint + Aperture)
```
