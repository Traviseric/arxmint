# Branch Protection Policy

Target branch: `master`

Required settings:

1. Require a pull request before merging.
2. Require at least 1 approving review.
3. Dismiss stale approvals when new commits are pushed.
4. Require status checks to pass before merging:
   - `Security Scans`
   - `Lint`
   - `Type Check`
   - `Migration Verify`
   - `Build & Unit Tests`
   - `E2E Tests`
   - `Container Build`
5. Require branches to be up to date before merging.
6. Block direct pushes and force pushes to `master`.
7. Restrict bypass permissions to designated maintainers only.

Operational review cadence:

- Review branch protection settings monthly.
- Re-validate required checks whenever CI jobs are renamed.
- Record policy changes in an ADR under `docs/governance/adr/`.
