# ArxMint Roadmap

## Current Status
Ship mode. Core app is code-complete through Phase E (foundation, payments, infrastructure, E2E testing, hardening). Production Readiness Gate in progress -- NUC testnet deployment running. Phase 4 (Longmont pilot) and Phase 5 (Bazaar merchant platform) actively building.

## Phase A-E: Production Path -- validated
Foundation through hardening. All code-complete.
- [x] Database + vault + auth (Phase A)
- [x] L402 + NUT-24 + Payment SDK (Phase B)
- [x] Caddy + monitoring + backup (Phase C)
- [x] Regtest stack + 22 E2E test flows (Phase D)
- [x] Rate limiting, health checks, caps, CI (Phase E)
- [x] Identity resolution API (link, resolve, create-root)
- [x] Merchant onboarding + checkout flow
- [x] Bazaar storefront page + OpenBazaar.ai integration

## Phase 4: Citadel (Longmont Pilot) -- building
First real-world deployment with live merchants and real money.
- [ ] NUC testnet deployment fully operational
- [ ] LND synced and Cashu mint live on testnet
- [ ] Longmont pilot merchant onboarding (Glacier Ice Cream first)
- [ ] Grant applications submitted (OpenSats, HRF, Spiral)
- [ ] Auto-link identity on checkout (cross-auth)
- [ ] OpenAPI agent-scope declarations for identity endpoints
- [ ] Swap `lib/cashu-paywall.ts` to `@te-btc/cashu-l402` package

## Phase 5: Bazaar (Merchant Platform) -- building
Decentralized merchant commerce -- ArxMint as payment backbone.
- [ ] Agent-commerce SDK (`packages/agent-commerce/`) shipped to npm
- [ ] Merchant-node flow tightened and production-proven
- [ ] Checkout webhook fulfillment proven end-to-end
- [ ] Dynamic pricing integration (reputation-based L402 invoices)
- [ ] Multi-city federation support via multi-mint-router

## Phase 6: Enterprise -- planned
Audit, plugins, compliance, and scale.
- [ ] External security audit
- [ ] Plugin system for community extensions
- [ ] Compliance framework (tax, reporting)
- [ ] Hardware appliance (ArxMint Box/Station/Citadel)
- [ ] Agent wallet (`@te-btc/agent-wallet`) integration

## Feature Path (Parallel)
- [x] Phase 0: Fortify (security hardening) -- complete
- [x] Phase 1: Keystone (core architecture) -- complete
- [x] Phase 2: Spire (privacy + commerce stack) -- complete
- [ ] Phase 3: Aether (advanced features + scale) -- post-pilot
