# ADR-20260302-progressive-delivery-optout

## Status
Accepted

## Context
ArxMint currently deploys via Docker on a single-host pilot stack. The production audit flagged missing canary/progressive delivery controls as a risk.

## Decision
For pilot phase, ArxMint uses a documented "canary opt-out" policy:

1. Default rollout pattern is `staging -> production`.
2. If staging is unavailable, production rollout requires:
- successful CI (`Security Scans`, `Migration Verify`, `Build & Unit Tests`, `E2E Tests`, `Container Build`)
- explicit reviewer approval
- post-deploy health validation (`/api/health`)
- rollback target recorded before deployment
3. Full weighted traffic shifting is deferred until multi-host infrastructure is in place.

## Consequences
- Increases release safety now without introducing orchestration complexity that exceeds pilot needs.
- Leaves a residual risk versus true canary traffic splitting.
- Requires strict branch protection and release checklist discipline.

## Follow-up
- Revisit when moving beyond single-host pilot to multi-node production.
- Replace opt-out with automated progressive delivery at that stage.

