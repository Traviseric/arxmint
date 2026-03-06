# ArxMint — Agent Onboarding

## What This Project Is

ArxMint is an **AI Sovereign Circular Economy Builder** — a Next.js web app that lets anyone create private Bitcoin circular economies from a natural language prompt. Generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**One prompt → full sovereign economy config → one Docker command → live.**

Humans and AI agents share the same private commerce infrastructure. Agents sell data/compute via L402 paywalls; humans transact in ecash; both use the same Lightning-connected federation.

**Status:** All implementation tasks complete. Phases A–E (production hardening) + Phases 0–2 (feature build-out) done. **Testnet deployment running on TE NUC** (LND syncing, Cashu standing by). Phase 4 (Citadel pilot) in progress — merchant pledge directory live at arxmint.com/merchants, 2 live merchants (Glacier, Teneo) + 13 in pipeline, Nostr admin auth working, checkout pages live, grants drafted, KPI framework ready. Phase 5 (Bazaar) in progress — arxmint.com/bazaar is a live merch store powered by OpenBazaar.ai (openbazaar.ai), with shipping address collection and fulfillment webhook to OpenBazaar.ai/Printful. See `docs/roadmap.md` and `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md`.

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
| Merchants page | `app/merchants/page.tsx`, `components/merchant-signup-form.tsx`, `app/api/pledge/route.ts` | `MerchantPledge MerchantSignupForm` |
| Merchant redirects | `app/merchant/page.tsx`, `app/network/page.tsx` | `redirect /merchants` |
| Supabase client | `lib/supabase.ts` | `createClient supabase` |
| Merchant seed data | `app/api/pledge/route.ts` (SEED_MERCHANTS const) | `Glacier seed-glacier` |
| Auth (Nostr NIP-98) | `lib/auth-middleware.ts`, `app/api/auth/route.ts`, `docs/auth.md` | `NIP-98 session HMAC pubkey ADMIN_PUBKEYS` |
| Admin pipeline | `app/api/pledge/route.ts` (ADMIN_PUBKEYS + PIPELINE_MERCHANTS) | `pipeline admin npub` |
| Agent API | `app/api/agent/route.ts` | `privacy-audit cycle-signals` |
| L402 demo | `app/api/l402/route.ts` | `WWW-Authenticate 402` |
| Pilot deployment | `lib/pilot-deployment.ts` | `PilotKPITargets generatePilotTimeline MultiCityNetwork` |
| Grant templates (TS lib) | `lib/grant-templates.ts` | `generateFBCEApplication generateOpenSatsApplication` |
| Grant applications | `C:\code\te-btc\internal\arxmint-internal\grants\` | `opensats-application.md hrf-application.md spiral-email.md common-app-application.md` |
| Replication playbook | `lib/replication-playbook.ts` | `generateReplicationPlaybook exportPlaybookMarkdown` |
| Spec + cross-ref | `docs/spec.md`, `docs/research-crossref.md` | — |
| Ecosystem merchant pipeline | `.claude/MERCHANT_MONETIZATION.md`, `<project>/docs/MERCHANT_PLAN.md` | `merchant checkout Lightning ArxMint` |
| Agent commerce kit | `packages/agent-commerce/` | `@te-code/agent-commerce checkout l402 withL402 createInvoice` |
| Hardware appliance | `te-btc/internal/arxmint-internal/HARDWARE_PRODUCT.md` | `ArxMint Box Station Citadel NUC Starlink appliance` |
| Roadmap (phases) | `docs/roadmap.md` | `Phase Fortify Keystone Spire Aether Citadel Bazaar Enterprise` |
| Brand guide | `docs/brand.md` | `tagline voice palette audience` |
| Docs index | `docs/README.md` | — |
| Payment SDK | `lib/payment-sdk.ts` (planned) | `createL402Challenge verifyL402Token routePayment` |
| Checkout page | `app/pay/[merchant-id]/page.tsx`, `components/checkout-flow.tsx` | `CheckoutFlow Lightning QR merchant checkout shipping` |
| Checkout webhook | `app/api/checkout/webhook/route.ts` | `HMAC OpenBazaar fulfill arxmint-store` |
| Bazaar storefront | `app/bazaar/page.tsx`, `app/bazaar/[id]/page.tsx` | `OpenBazaar catalog storefront merch` |
| Bazaar strategy | `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md` | `OpenBazaar Printful flywheel merch fulfillment` |
| NUC deployment | `docs/DEPLOY.md`, `docker/docker-compose.cashu.yml` | `NUC testnet LND Cashu self-hosted` |
| OpenBazaar.ai integration | `openbazaar.ai/api/storefront/*` | `catalog checkout fulfill payment provider` |

## Tech Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS (dark theme, `#F7931A` accents), Zustand, `@supabase/supabase-js` (production DB), `@fedimint/core` 0.1.3 (WASM), `@cashu/cashu-ts` 3.5.0, `@lightninglabs/lnc-web` 0.3.5-alpha, Aperture L402 proxy, Docker Compose (LND + Nutshell + Fedimint + Aperture).

## Key Architecture Rules

1. **Fedimint SDK is CLIENT-only.** Joins existing federations via invite code. Does NOT create federations — that requires `fedimintd` Docker nodes.
2. **LNC-Web is WASM, client-side only.** Always `'use client'`. Dynamic imports to avoid SSR.
3. **Cashu `cashu-ts` v3 API.** `createMintQuoteBolt11()` → `mintProofs()`. Melt preimage at `result.quote.payment_preimage`.
4. **L402 flow:** HTTP 402 → parse `WWW-Authenticate` → pay invoice → get preimage → retry with `Authorization: L402 <macaroon>:<preimage>`.
5. **Silent Payments require server-side federation module changes** — not a client toggle.
6. **No Edge Runtime middleware.** `middleware.ts` was deleted — the WASM webpack config (`asyncWebAssembly`, `layers`) crashes Vercel's Edge Runtime, killing all serverless functions. Auth checks and rate limiting are per-route.
7. **Database: Supabase JS client for Vercel.** `lib/supabase.ts` uses service role key. Prisma schema retained for self-hosted Docker path. API routes use dynamic import `await import("@/lib/supabase")` for graceful fallback when DB is unavailable.
8. **Instrumentation hook must not throw.** `instrumentation.ts` warns on missing env vars but never crashes — a fatal throw kills ALL serverless functions.

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
npm run build        # Production build (56 routes)
npm run setup:cashu  # Docker: LND + Cashu mint only
npm run setup:full   # Docker: Full stack (LND + Cashu + Fedimint + Aperture)
```
