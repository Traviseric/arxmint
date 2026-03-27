# ArxMint — Agent Onboarding

## What This Project Is

ArxMint is an **AI Sovereign Circular Economy Builder** — a Next.js web app that lets anyone create private Bitcoin circular economies from a natural language prompt. Generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**Status:** Materially built, past greenfield. Current work is Phase 5/6 alignment. See `docs/core/roadmap.md`.

## Lookup Table

| Concept | File(s) | Search Term |
|---------|---------|-------------|
| Community generator | `lib/community-generator.ts` | parsePrompt generateDeployment |
| Fedimint SDK (WASM) | `lib/fedimint-sdk.ts` | SovereignFedimintClient |
| Cashu SDK (v3) | `lib/cashu-sdk.ts` | SovereignCashuClient |
| Lightning / LNC | `lib/lightning-agent.ts` | SovereignLightningClient l402Fetch |
| Cashu paywall (NUT-24) | `lib/cashu-paywall.ts` (via `@te-btc/cashu-l402`) | NUT24 ecashPaywall |
| Privacy scoring | `lib/privacy-defaults.ts` | computePrivacyScore PRIVACY_PRESETS |
| Identity graph | `lib/identity.ts` | linkIdentity resolveIdentity |
| Auth (Nostr NIP-98) | `lib/auth-middleware.ts` | NIP-98 session HMAC |
| Merchant onboarding | `components/merchant-onboard.tsx` | NuMo NFC |
| Checkout page | `app/pay/[merchant-id]/page.tsx` | CheckoutFlow Lightning QR |
| Checkout webhook | `app/api/checkout/webhook/route.ts` | HMAC OpenBazaar fulfill |
| Bazaar storefront | `app/bazaar/page.tsx` | OpenBazaar catalog |
| Agent API | `app/api/agent/route.ts` | privacy-audit cycle-signals |
| L402 demo | `app/api/l402/route.ts` | WWW-Authenticate 402 |
| Agent wallet (re-export) | `lib/agent-wallet.ts` (via `@te-btc/agent-wallet`) | AgentWallet BudgetPolicy VelocityLimiter |
| Agent commerce SDK | `packages/agent-commerce/` | AgentCommerceClient l402AgentFetch |
| Docs index | `docs/README.md` | — |
| Roadmap | `docs/core/roadmap.md` | Phase Fortify Keystone |
| Brand guide | `docs/reference/brand.md` | tagline voice palette |
| TE-BTC ecosystem | `C:\code\te-btc\` | cashu-mint cashu-l402 agent-wallet |
| @te-btc/cashu-l402 | `C:\code\te-btc\cashu-l402` | L402 server/client + NUT-24 paywall (278 tests, npm published) |
| @te-btc/agent-wallet | `C:\code\te-btc\agent-wallet` | Agent Cashu wallet + budget enforcement (169 tests, npm published) |
| @te-btc/cashu-mint | `C:\code\te-btc\cashu-mint` | TypeScript Cashu mint NUT-00..07 (48 tests, Phase 1 complete) |

## Tech Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS (dark, `#F7931A`), Zustand, Supabase, `@cashu/cashu-ts` 3.5.0, `@te-btc/cashu-l402` 0.1.0 (L402 + NUT-24), `@te-btc/agent-wallet` 0.1.0 (agent wallets), `@lightninglabs/lnc-web` 0.3.5-alpha, Docker Compose.

## Key Architecture Rules

1. **Fedimint SDK is CLIENT-only.** Joins existing federations. Does NOT create them.
2. **LNC-Web is WASM, client-side only.** Always `'use client'`. Dynamic imports.
3. **Cashu v3 API.** `createMintQuoteBolt11()` → `mintProofs()`.
4. **L402 flow:** HTTP 402 → parse header → pay invoice → retry with auth.
5. **No Edge Runtime middleware.** Auth checks are per-route.
6. **Database: Supabase JS client for Vercel.** Prisma retained for self-hosted Docker path.

## Commands

```bash
npm install && npm run dev   # http://localhost:3000
npm run build                # Production build (56 routes)
npm run setup:cashu          # Docker: LND + Cashu mint only
npm run setup:full           # Docker: Full stack
```

## Conventions

- CSS: Tailwind + `.sovereign-*` classes from `globals.css`
- Colors: `btc-orange` (#F7931A), `sovereign-dark` (#0a0a0a)
- SDK clients: Singleton via `getFedimintClient()`, `getCashuClient()`, `getLightningClient()`
- API routes: Next.js Route Handlers, `NextResponse.json()`
- Docs: Check `docs/REGISTRY.md` before creating new docs
- Internal docs: `C:\code\te-btc\internal\arxmint-internal\`

## Detailed References

| Topic | Location |
|-------|----------|
| Identity resolution plan | `te-btc/internal/arxmint-internal/IDENTITY-RESOLUTION-PLAN.md` |
| AI infrastructure stack | `.claude/guides/AI-INFRASTRUCTURE-STACK.md` |
| Hardware appliance | `te-btc/internal/arxmint-internal/HARDWARE_PRODUCT.md` |
| Merchant monetization | `.claude/MERCHANT_MONETIZATION.md` |
| Strategy | `te-btc/internal/arxmint-internal/strategy/what-arxmint-is-building-toward.md` |
| Grant applications | `te-btc/internal/arxmint-internal/grants/` |
