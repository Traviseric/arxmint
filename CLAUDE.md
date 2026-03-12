# ArxMint â€” Agent Onboarding

## What This Project Is

ArxMint is an **AI Sovereign Circular Economy Builder** â€” a Next.js web app that lets anyone create private Bitcoin circular economies from a natural language prompt. Generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**One prompt â†’ full sovereign economy config â†’ one Docker command â†’ live.**

Humans and AI agents share the same private commerce infrastructure. Agents sell data/compute via L402 paywalls; humans transact in ecash; both use the same Lightning-connected federation.

**Status:** ArxMint is materially built and past the greenfield stage. Core merchant, checkout, webhook, deployment, and documentation surfaces are landed in the repo. Current work is Phase 5/6 alignment: finishing the merchant-node flow, tightening contracts, and verifying production readiness. See `docs/core/roadmap.md` and `C:\code\te-btc\internal\arxmint-internal\strategy\what-arxmint-is-building-toward.md`.

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
| Identity graph | `lib/identity.ts` | `linkIdentity resolveIdentity getAllAliases` |
| Identity API | `app/api/identity/link/`, `app/api/identity/resolve/`, `app/api/identity/create-root/` | `identity link resolve create-root` |
| Identity schema | `prisma/schema.prisma` (IdentityAlias model) | `identity_aliases namespace externalId` |
| Supabase client | `lib/supabase.ts` | `createClient supabase` |
| Merchant seed data | `app/api/pledge/route.ts` (SEED_MERCHANTS const) | `Glacier seed-glacier` |
| Auth (Nostr NIP-98) | `lib/auth-middleware.ts`, `app/api/auth/route.ts`, `docs/integration/auth.md` | `NIP-98 session HMAC pubkey ADMIN_PUBKEYS` |
| Admin pipeline | `app/api/pledge/route.ts` (ADMIN_PUBKEYS + PIPELINE_MERCHANTS) | `pipeline admin npub` |
| Agent API | `app/api/agent/route.ts` | `privacy-audit cycle-signals` |
| L402 demo | `app/api/l402/route.ts` | `WWW-Authenticate 402` |
| Pilot deployment | `lib/pilot-deployment.ts` | `PilotKPITargets generatePilotTimeline MultiCityNetwork` |
| Grant templates (TS lib) | `lib/grant-templates.ts` | `generateFBCEApplication generateOpenSatsApplication` |
| Grant applications | `C:\code\te-btc\internal\arxmint-internal\grants\` | `opensats-application.md hrf-application.md spiral-email.md common-app-application.md` |
| Replication playbook | `lib/replication-playbook.ts` | `generateReplicationPlaybook exportPlaybookMarkdown` |
| Spec + cross-ref | `docs/core/spec.md`, `docs/research/research-crossref.md` | â€” |
| Ecosystem merchant pipeline | `.claude/MERCHANT_MONETIZATION.md`, `<project>/docs/MERCHANT_PLAN.md` | `merchant checkout Lightning ArxMint` |
| Agent commerce kit | `packages/agent-commerce/` | `@te-code/agent-commerce checkout l402 withL402 createInvoice` |
| AI Infra Stack | `.claude/guides/AI-INFRASTRUCTURE-STACK.md` | Layer 5, agent commerce, dynamic pricing, reputation |

## Identity Resolution (Ecosystem Foundation)

ArxMint owns the **generic identity alias graph** â€” the lowest-level identity primitive in the TE Code ecosystem. Any project or agent can link external identifiers to ArxMint user roots via free-form namespaces. ArxMint does NOT define namespaces â€” callers do.

**Full plan:** `te-btc/internal/arxmint-internal/IDENTITY-RESOLUTION-PLAN.md`

### What ArxMint Owns
| Component | File(s) | Status |
|-----------|---------|--------|
| `identity_aliases` table | `prisma/schema.prisma`, `prisma/migrations/20260311000000_add_identity_aliases/` | âœ… Deployed |
| `lib/identity.ts` â€” link, resolve, unlink, getAllAliases | `lib/identity.ts` | âœ… Complete |
| `POST /api/identity/link` | `app/api/identity/link/route.ts` | âœ… Complete |
| `GET /api/identity/resolve` | `app/api/identity/resolve/route.ts` | âœ… Complete |
| `POST /api/identity/create-root` | `app/api/identity/create-root/route.ts` | âœ… Complete |

### What ArxMint Does NOT Own
- **Namespace definitions** â€” teneo-auth defines ecosystem namespaces (aos, cognito, conversos, email, etc.)
- **Ecosystem resolver logic** â€” teneo-auth's `ecosystem-identity.ts` orchestrates multi-link operations
- **Profile merging** â€” ProfileEngine consumes resolved identities
- **Link event emission** â€” teneo-production (signup), Conversos (chat), etc. emit link events through teneo-auth

### How Other Projects Call ArxMint
teneo-auth calls ArxMint's identity API via HTTP using `ARXMINT_API_URL` + `MARKETPLACE_SHARED_SECRET` (X-Marketplace-Secret header). teneo-auth handles Nostr signing internally â€” external callers never need to sign on ArxMint's behalf.

### What ArxMint Still Needs to Build
1. **Auto-link on checkout** â€” When a user pays via L402/Cashu while also carrying a teneo-auth JWT (cross-auth), auto-link `nostr_{pubkey}` â†” `teneo-auth_{userId}` natively (both identities present in same request)
2. **OpenAPI x-agent-scope declarations** â€” Add `x-agent-scope`, `x-agent-safe`, `x-auth-method` extensions to identity endpoints for agentic CLI consumption
3. **Identity count in /health** â€” Expose alias count in health check for observability
4. **Unlink API route** â€” `DELETE /api/identity/unlink` (lib function exists, no route yet)

## AI Infrastructure Stack (Layer 5: Agent Commerce)

ArxMint is the payment backbone for the AI Infrastructure Stack. See full spec: `.claude/guides/AI-INFRASTRUCTURE-STACK.md`

| Component | What | Status |
|-----------|------|--------|
| **L402 paywalls** | Agents pay per-request for services | âœ… Code complete |
| **Cashu ecash** | Privacy-preserving agent transactions | âœ… Code complete |
| **Ephemeral agent wallets** | Disposable wallets for agent sessions | âœ… Code complete |
| **agent-commerce SDK** | `packages/agent-commerce/` â€” portable SDK for all projects | ðŸŸ¡ Scaffold only |
| **Dynamic pricing integration** | Reputation scores â†’ price adjustment on L402 invoices | ðŸ”´ NOT STARTED (depends on aibridge/reputation) |

**Next:** Implement `packages/agent-commerce/` SDK so projects import `@te-code/agent-commerce` instead of copy-pasting checkout code. Then wire reputation-based pricing from aibridge.
| Hardware appliance | `te-btc/internal/arxmint-internal/HARDWARE_PRODUCT.md` | `ArxMint Box Station Citadel NUC Starlink appliance` |
| Roadmap (phases) | `docs/core/roadmap.md` | `Phase Fortify Keystone Spire Aether Citadel Bazaar Enterprise` |
| Brand guide | `docs/reference/brand.md` | `tagline voice palette audience` |
| Docs index | `docs/README.md` | â€” |
| Payment SDK | `lib/payment-sdk.ts` (planned) | `createL402Challenge verifyL402Token routePayment` |
| Checkout page | `app/pay/[merchant-id]/page.tsx`, `components/checkout-flow.tsx` | `CheckoutFlow Lightning QR merchant checkout shipping` |
| Checkout webhook | `app/api/checkout/webhook/route.ts` | `HMAC OpenBazaar fulfill arxmint-store` |
| Bazaar storefront | `app/bazaar/page.tsx`, `app/bazaar/[id]/page.tsx` | `OpenBazaar catalog storefront merch` |
| Bazaar strategy | `C:\code\te-btc\internal\arxmint-internal\strategy\what-arxmint-is-building-toward.md` | `OpenBazaar Printful merchant flywheel` |
| NUC deployment | `docs/deployment/deploy.md`, `docker/docker-compose.cashu.yml` | `NUC testnet LND Cashu self-hosted` |
| OpenBazaar.ai integration | `C:\code\openbazaar-ai`, `openbazaar.ai/api/storefront/*` | `catalog checkout fulfill payment provider` |
| **TE-BTC Ecosystem** | `C:\code\te-btc\` (parent directory) | `cashu-l402 cashu-mint agent-wallet multi-mint-router` |
| @te-btc/cashu-l402 | `C:\code\te-btc\cashu-l402` | L402 server/client + NUT-24 paywall + offline DLEQ. **PRODUCTION READY** (265 tests). Swap into `lib/cashu-paywall.ts`. |
| @te-btc/cashu-mint | `C:\code\te-btc\cashu-mint` | TypeScript Cashu mint NUT-00..07. **PHASE 1 COMPLETE** (33 tests). Replaces Nutshell in Docker at 90% gate. |
| @te-btc/agent-wallet | `C:\code\te-btc\agent-wallet` | Agent-native Cashu wallet. **SPEC ONLY**. Replaces inline agent wallet code in `lib/cashu-sdk.ts`. |
| @te-btc/multi-mint-router | `C:\code\te-btc\multi-mint-router` | Cross-mint router MCP server. **DEFERRED** (trigger: 2+ live mints). |

## Tech Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS (dark theme, `#F7931A` accents), Zustand, `@supabase/supabase-js` (production DB), `@fedimint/core` 0.1.3 (WASM), `@cashu/cashu-ts` 3.5.0, `@lightninglabs/lnc-web` 0.3.5-alpha, Aperture L402 proxy, Docker Compose (LND + Nutshell + Fedimint + Aperture).

## Key Architecture Rules

1. **Fedimint SDK is CLIENT-only.** Joins existing federations via invite code. Does NOT create federations â€” that requires `fedimintd` Docker nodes.
2. **LNC-Web is WASM, client-side only.** Always `'use client'`. Dynamic imports to avoid SSR.
3. **Cashu `cashu-ts` v3 API.** `createMintQuoteBolt11()` â†’ `mintProofs()`. Melt preimage at `result.quote.payment_preimage`.
4. **L402 flow:** HTTP 402 â†’ parse `WWW-Authenticate` â†’ pay invoice â†’ get preimage â†’ retry with `Authorization: L402 <macaroon>:<preimage>`.
5. **Silent Payments require server-side federation module changes** â€” not a client toggle.
6. **No Edge Runtime middleware.** `middleware.ts` was deleted â€” the WASM webpack config (`asyncWebAssembly`, `layers`) crashes Vercel's Edge Runtime, killing all serverless functions. Auth checks and rate limiting are per-route.
7. **Database: Supabase JS client for Vercel.** `lib/supabase.ts` uses service role key. Prisma schema retained for self-hosted Docker path. API routes use dynamic import `await import("@/lib/supabase")` for graceful fallback when DB is unavailable.
8. **Instrumentation hook must not throw.** `instrumentation.ts` warns on missing env vars but never crashes â€” a fatal throw kills ALL serverless functions.

## Style Conventions

- **CSS:** Tailwind + `.sovereign-card`, `.sovereign-btn`, `.sovereign-btn-outline`, `.sovereign-input` from `globals.css`.
- **Colors:** `btc-orange` (#F7931A), `sovereign-dark` (#0a0a0a), `sovereign-panel` (#111), `sovereign-text` (#e5e5e5), `sovereign-muted` (#737373).
- **Icons:** `lucide-react`. **State:** Zustand (`useSovereignStore`), no prop drilling.
- **SDK clients:** Singleton via `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`.
- **API routes:** Next.js Route Handlers in `app/api/`. Return `NextResponse.json()`.
- **Components:** `'use client'` for browser APIs, WASM, or Zustand.

## Documentation Conventions

- **Docs lookup:** `docs/README.md` is the human index. `docs/REGISTRY.md` is the grep index.
- **Before creating docs:** grep `docs/REGISTRY.md` first. If a match exists, amend that file instead of creating a new one.
- **Internal docs:** Strategy and grant material live under `C:\code\te-btc\internal\arxmint-internal\README.md` and `C:\code\te-btc\internal\arxmint-internal\REGISTRY.md`.

## Brand

ArxMint (Arx = citadel + Mint = ecash). Voice: confident builder, direct, protective. Theme: dark, minimal, fortress energy. Full guide: `docs/reference/brand.md`.

## Running the Project

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build (56 routes)
npm run setup:cashu  # Docker: LND + Cashu mint only
npm run setup:full   # Docker: Full stack (LND + Cashu + Fedimint + Aperture)
```
