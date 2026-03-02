# Pilot Readiness Status

As of March 2, 2026 (UTC)

## Snapshot

- Production Readiness Gate checklist status: **14/35** checked in `docs/roadmap.md`.
- Automated validation in this cycle:
  - `npm test`: **pass** (230 passed, 0 failed, 3 skipped).
  - `npm run build`: **pass** (Next.js production build succeeded).
- Build still logs a production misconfiguration warning when `MACAROON_ROOT_KEY` is missing.

## Completed In This Cycle

- Enforced settlement daily volume caps in `app/api/settlement/route.ts`.
- Enforced wallet balance caps on receive flows in `app/api/transactions/route.ts`.
- Enforced wallet balance caps in Cashu wallet mutation paths in `lib/cashu-sdk.ts`.
- Added payment status endpoint rate limiting in `app/api/payment/status/[id]/route.ts`.
- Normalized rate limiting usage to the principal+IP limiter in middleware/payment/auth/l402/settlement paths.
- Updated Production Readiness Gate checkboxes in `docs/roadmap.md` for evidence-backed items.

## Gate Breakdown (Checked / Total)

- Data Safety: **1/7**
- Authentication and Authorization: **4/6**
- Payment Correctness: **3/5**
- Infrastructure: **2/7**
- Testing: **1/5**
- Operations: **3/5**

## Remaining Pilot Blockers

1. Run full regtest E2E suite and confirm pass criteria in `docs/E2E_TESTING.md`.
2. Deploy to testnet VPS and hold 7+ incident-free days.
3. Complete and record disaster recovery drill with restore verification.
4. Verify backup pipeline end-to-end: scheduled dumps, LND backup sync, off-host storage restore test.
5. Confirm production secrets and env completeness (`MACAROON_ROOT_KEY`, LND, mint, session/auth secrets).
6. Validate infra runtime in deployed environment: Caddy TLS, Prometheus/Grafana, alerts.
7. Verify unresolved auth hardening items: step-up reauth and dual-provider session behavior.

## Immediate Next Execution Plan

1. Stabilize production env config and remove startup/payment misconfiguration warnings.
2. Run required E2E flows in CI-compatible regtest locally, collect evidence artifacts.
3. Execute testnet deploy from `docs/DEPLOY.md` and start 7-day burn-in tracking.
4. Run DR drill from `docs/DR_DRILL.md` and `docs/PITR_RUNBOOK.md`, attach results.
