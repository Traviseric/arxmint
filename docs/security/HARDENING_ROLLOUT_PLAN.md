# Progressive Security Hardening Rollout Plan

Last updated: March 2, 2026
Owner: Engineering

## Objective

Harden secret handling and runtime artifact hygiene without disrupting normal development throughput.

## Guardrails Implemented

1. Local pre-commit guardrails via `scripts/security/guardrails.sh`.
2. CI security mode resolution with branch canary override in `.github/workflows/ci.yml`.
3. Runtime artifact path checks for tracked files in CI.
4. Secret pattern checks on staged additions in pre-commit.
5. `.gitignore` denylist for transient launcher artifacts (`.overnight`, worker/round/wezterm scripts).
6. Mode-driven behavior: `off`, `observe`, `enforce`.

## Mode Behavior

| Mode | Local Pre-commit | CI Security Job |
|---|---|---|
| `off` | Skips checks | Skips guardrails, audit, and gitleaks |
| `observe` | Logs findings, allows commit | Logs findings, does not fail job |
| `enforce` | Blocks on findings | Fails on audit/gitleaks/guardrail findings |

## Configuration

| Setting | Scope | Default | Purpose |
|---|---|---|---|
| `ARXMINT_GUARDRAIL_MODE` | Local env | `observe` | Controls pre-commit guardrail mode |
| `SECURITY_GATE_MODE` | GitHub repo variable | unset (`enforce`) | Base CI security mode |
| `SECURITY_CANARY_BRANCHES` | GitHub repo variable | unset | Comma-separated branches that auto-upgrade CI to `enforce` |

GitHub setup path:
`Repository Settings -> Secrets and variables -> Actions -> Variables`

## Rollout Phases

1. Phase 0 (Observe Baseline, 3-7 days)
   Run local + CI in `observe`.
   Measure false positives and frequent hit patterns.
2. Phase 1 (Canary Enforce, 3-7 days)
   Set `SECURITY_CANARY_BRANCHES` to one low-risk branch.
   Keep global `SECURITY_GATE_MODE=observe`.
   Fix noisy patterns and update exclusions if justified.
3. Phase 2 (Main Branch Enforce)
   Add `master` to `SECURITY_CANARY_BRANCHES`, or set `SECURITY_GATE_MODE=enforce`.
   Keep non-critical branches in `observe` if needed.
4. Phase 3 (Sustain)
   Review findings weekly.
   Keep breakglass path documented and time-limited.

## Operational Commands

1. Local observe scan:
   `npm run security:guardrails`
2. Local enforce scan:
   `npm run security:guardrails:enforce`
3. Enable local git hooks:
   `npm run setup:githooks`
4. Temporary local bypass:
   `ARXMINT_GUARDRAIL_MODE=off git commit ...`

## Rollback Procedure

1. Set `SECURITY_GATE_MODE=observe` to stop CI blocking immediately.
2. If needed, set `SECURITY_GATE_MODE=off` for emergency unblock.
3. Revert to `observe`, fix noise, then resume canary enforce.

## Success Criteria

1. Zero committed `.overnight` or worker runtime launcher artifacts.
2. Zero committed OAuth/API tokens.
3. No sustained increase in PR cycle time after enforce rollout.
4. Enforce mode active on `master` with acceptable false-positive rate.
