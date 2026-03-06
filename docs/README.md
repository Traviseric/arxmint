# ArxMint — Documentation Index

## Core

| Document | Description |
|----------|-------------|
| [spec.md](spec.md) | Complete system specification — architecture, protocols, deployment |
| [roadmap.md](roadmap.md) | Phased plan + current implementation snapshot |
| [brand.md](brand.md) | Brand guide — name, taglines, voice, visual theme, CSS tokens |
| [whitepaper.md](whitepaper.md) | Public whitepaper |

## Operations

| Document | Description |
|----------|-------------|
| [auth.md](auth.md) | Authentication system — Nostr NIP-98, L402/Cashu agent auth, admin system |
| [teneo-auth-integration.md](teneo-auth-integration.md) | Shared contract with TENEO Auth — identity/control plane vs payment/wallet plane |
| [DEPLOY.md](DEPLOY.md) | VPS/NUC provisioning, Docker setup, env config, Caddy HTTPS |
| [VPS_SETUP.md](VPS_SETUP.md) | Vultr/DigitalOcean server setup checklist |
| [DR_DRILL.md](DR_DRILL.md) | Disaster recovery drill procedure |
| [PITR_RUNBOOK.md](PITR_RUNBOOK.md) | Point-in-time recovery runbook for Postgres base backups + WAL replay |
| [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) | Incident response runbook |
| [security/HARDENING_ROLLOUT_PLAN.md](security/HARDENING_ROLLOUT_PLAN.md) | Security guardrail rollout and mode controls (`off`/`observe`/`enforce`) |
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Mainnet migration + guardian distribution plan |
| [FLAKY_TEST_POLICY.md](FLAKY_TEST_POLICY.md) | Flaky test quarantine ownership and expiry policy |
| [TRUST_STATEMENT.md](TRUST_STATEMENT.md) | Single-host federation trust disclosure |
| [audits/](audits/) | Quarterly production engineering audits |
| [governance/](governance/) | Branch protection policy, ADR process, and prompt/template review controls |

## Grants & Pilot

| Document | Description |
|----------|-------------|
| [PILOT_READINESS_STATUS.md](PILOT_READINESS_STATUS.md) | Current pilot readiness score, completed checks, and remaining blockers |
| [PILOT_KPIS.md](PILOT_KPIS.md) | Longmont pilot KPI targets and measurement framework |
| [GRANT_DOSSIER.md](GRANT_DOSSIER.md) | Shared grant dossier (OpenSats, HRF, Spiral, FBCE) |

## Research

| Document | Description |
|----------|-------------|
| [research-crossref.md](research-crossref.md) | Maps 7 research docs to spec sections, files, and gaps |
| [research-citation-policy.md](research-citation-policy.md) | Citation and attribution policy |
| [RESEARCH_PROMPTS.md](RESEARCH_PROMPTS.md) | Research prompts used during architecture decisions |
| [research/](research/) | Deep research documents (6 studies) |

## Bazaar & Commerce

| Document | Description |
|----------|-------------|
| `te-btc/internal/arxmint-internal/BAZAAR_STRATEGY.md` | Bazaar strategy — OpenBazaar.ai integration, Printful setup, merch catalog, webhook contract |

**Key routes:**
- `/bazaar` — Merch storefront (fetches from `openbazaar.ai/api/storefront/catalog`)
- `/bazaar/[id]` — Product detail page
- `/pay/arxmint-store` — Checkout with shipping address collection for physical merch
- `/api/checkout/webhook` — Forwards payment confirmation + shipping data to OpenBazaar.ai fulfillment

## Reference

| Document | Description |
|----------|-------------|
| [upstream-contributions.md](upstream-contributions.md) | Upstream dependency tracking |
| [roadmap_history.txt](roadmap_history.txt) | Git history of roadmap evolution |
| [tracking/](tracking/) | Tracking docs |

## Quick Links

- **CLAUDE.md** (root): Agent onboarding, lookup table, architecture rules
- **OVERNIGHT_TASKS.md** (root): Active implementation task queue
- **specs/README.md**: Feature specs
