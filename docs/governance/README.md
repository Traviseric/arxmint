# Governance

This folder tracks engineering governance controls required for production operations.

## Branch Protection Policy

`master` must enforce:
- Pull request required before merge
- At least 1 approving review
- Required checks: `Security Scans`, `Lint`, `Type Check`, `Build & Unit Tests`, `E2E Tests`, `Container Build`
- Dismiss stale approvals on new commits
- Block force-pushes and direct commits

## ADR Process

Architecture changes affecting auth, payment, settlement, data model, or deployment must include an ADR in `docs/governance/adr/`.

Naming convention:
- `ADR-YYYYMMDD-short-title.md`

Template:
- Use `docs/governance/ADR_TEMPLATE.md`

Current ADRs:
- `docs/governance/adr/ADR-20260302-progressive-delivery-optout.md`
