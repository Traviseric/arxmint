# ArxMint Documentation Index

Last updated: 2026-03-12

This is the human navigation layer for the ArxMint docs tree.

Rules for this repo:

- `docs/` root contains only this file and `REGISTRY.md`.
- Before creating a doc, grep `docs/REGISTRY.md`.
- Living docs stay in content folders.
- Historical duplicates and session artifacts go under `docs/reference/archives/`.

## Quick Navigation

| Need | Start here | Time |
|------|------------|------|
| Understand the product direction | `docs/core/roadmap.md` | 10 min |
| Understand the full system contract | `docs/core/spec.md` | 20-30 min |
| Get a local build running | `docs/quick-start/quickstart.md` | 10 min |
| Deploy to a server | `docs/deployment/deploy.md` | 20 min |
| Check auth and API contracts | `docs/integration/auth.md`, `docs/integration/api-reference.md` | 15 min |
| Review pilot readiness | `docs/operations/pilot-readiness-status.md` | 10 min |
| Review grants and pilot metrics | `docs/grant-reporting/grant-dossier.md`, `docs/operations/pilot-kpis.md` | 15 min |
| Find whether a doc already exists | `docs/REGISTRY.md` | 1 min |

## Documentation Metrics

- Living docs: 89
- Archived docs in this pass: root `plan.md`, duplicate `RESEARCH_PROMPTS.md` copies
- Internal companion docs live in `C:\code\te-btc\internal\arxmint-internal`

## Core

| Doc | Purpose |
|-----|---------|
| `docs/core/spec.md` | Canonical product and system spec |
| `docs/core/roadmap.md` | Implementation status, execution order, and next work |
| `docs/core/roadmap-execution-spec.md` | How roadmap execution should be maintained |
| `docs/core/why-arxmint.md` | Narrative framing for why the project exists |

## Quick Start

| Doc | Purpose |
|-----|---------|
| `docs/quick-start/quickstart.md` | Main setup and first-run entry point |

## Deployment

| Doc | Purpose |
|-----|---------|
| `docs/deployment/deploy.md` | Primary deployment guide |
| `docs/deployment/vps-setup.md` | VPS provisioning checklist |
| `docs/deployment/restore.md` | Restore procedure |
| `docs/deployment/migration-plan.md` | Pilot-to-mainnet and guardian migration plan |

## Integration

| Doc | Purpose |
|-----|---------|
| `docs/integration/api-reference.md` | HTTP API reference |
| `docs/integration/auth.md` | Auth model and security contracts |
| `docs/integration/sdk-reference.md` | SDK usage reference |
| `docs/integration/teneo-auth-integration.md` | Cross-system auth contract |
| `docs/integration/webhooks.md` | Webhook events and delivery model |

## Operations

| Doc | Purpose |
|-----|---------|
| `docs/operations/incident-response.md` | Incident handling and recovery |
| `docs/operations/dr-drill.md` | Disaster recovery drill |
| `docs/operations/pitr-runbook.md` | PITR procedure |
| `docs/operations/pilot-kpis.md` | Pilot KPI framework |
| `docs/operations/pilot-readiness-status.md` | Current readiness snapshot |
| `docs/operations/trust-statement.md` | Pilot trust model and disclosures |
| `docs/security/HARDENING_ROLLOUT_PLAN.md` | Security guardrail rollout |
| `docs/audits/README.md` | Audit entry point |

## Development And Testing

| Doc | Purpose |
|-----|---------|
| `docs/development/contributing.md` | Contribution guide |
| `docs/development/upstream-contributions.md` | Upstream dependency tracking |
| `docs/testing/e2e-testing.md` | E2E strategy and expected coverage |
| `docs/testing/flaky-test-policy.md` | Flaky test quarantine policy |
| `docs/load-testing/baselines.md` | Load-testing baseline notes |

## Growth, Pilot, And Merchant Materials

| Doc | Purpose |
|-----|---------|
| `docs/grant-reporting/grant-dossier.md` | Shared grant packet |
| `docs/grant-reporting/opensats-template.md` | OpenSats grant template |
| `docs/case-studies/glacier.md` | Merchant case study |
| `docs/replication-playbook/README.md` | Circular economy rollout playbook |
| `docs/compliance-kit/faq.md` | Merchant/compliance FAQ |
| `docs/compliance-kit/legal-position-paper.md` | Legal framing |
| `docs/compliance-kit/security-overview.md` | Security overview for stakeholders |

## Research And Reference

| Doc | Purpose |
|-----|---------|
| `docs/research/research-crossref.md` | Maps research to spec and roadmap |
| `docs/research/research-citation-policy.md` | Citation rules |
| `docs/research/RESEARCH_PROMPTS.md` | Canonical research prompt set |
| `docs/research/` | Deep research archive and phase-specific studies |
| `docs/reference/brand.md` | Public brand guide |
| `docs/reference/whitepaper.md` | Public whitepaper |
| `docs/tracking/upstream-deps.md` | Dependency tracking |

## Governance And Content

| Doc | Purpose |
|-----|---------|
| `docs/governance/README.md` | Governance entry point |
| `docs/blog/` | Blog and thought-leadership drafts |

## Merch Store

| Doc | Purpose |
|-----|---------|
| `specs/MERCH-STORE.md` | Full implementation spec — Printful + Stripe + Lightning, setup checklist |
| `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md` | Bazaar/OpenBazaar.ai strategy |

**Merch store routes (ArxMint-branded, Printful dropship):**
- `/merch` — Storefront (stickers, tees, hats) with cart, Lightning + Stripe checkout
- `/api/merch/checkout` — Stripe session with `printful_items` metadata + shipping
- `/api/merch/webhook` — Stripe webhook → Printful dropship order
- `/api/merch/lightning` — Lightning checkout with shipping
- `/api/webhooks/printful` — Printful shipping webhook (tracking)
- `/api/checkout/webhook` — Also handles `arxmint-merch`: Lightning paid → Printful fulfillment

**Go-live checklist** (see `specs/MERCH-STORE.md`):
1. Create products in Printful dashboard (store 17809413), update `printfulVariantId` in `lib/merch/products.ts`
2. Add product images to `public/merch/`
3. Set Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`
4. Run Prisma migrations, then apply `docs/deployment/supabase-migrations.sql` if the supplemental Supabase columns are missing
5. Register Stripe webhook → `https://arxmint.com/api/merch/webhook`
6. Deploy to Vercel

## Internal Companion Docs

Public repo docs describe the product and operating system.
Internal strategy, pitch, grant, and assistant context now live under:

- `C:\code\te-btc\internal\arxmint-internal\README.md`
- `C:\code\te-btc\internal\arxmint-internal\REGISTRY.md`

## Archive Note

The previous flat `docs/` layout has been collapsed into category folders.
If an old path is referenced in a note or stale output, search `docs/REGISTRY.md` for the current location.
