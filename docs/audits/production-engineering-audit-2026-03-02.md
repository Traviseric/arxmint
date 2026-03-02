# Production Engineering Audit: arxmint

**Date:** 2026-03-02
**Auditor:** Codex (automated)
**Stack Tags:** [spa, container, api]
**Repo:** C:\code\te-btc\arxmint

## Scorecard

Project: arxmint     Date: 2026-03-02     Auditor: Codex (automated)

| #  | Category                       | Result  | Items Checked | Findings |
|----|--------------------------------|---------|---------------|----------|
| 1  | Security & Access Control      | Fail    | 3 / 7         | Unauthenticated settlement read path; no ownership-level authorization; no RBAC/WAF |
| 2  | Secrets Management             | Fail    | 1 / 6         | No CI secret scan; no rotation/revocation procedure; env-file based secret handling only |
| 3  | Input Validation & Resilience  | Fail    | 2 / 8         | Per-IP only throttling; missing timeout discipline/circuit-breakers/backoff; no cost alerts |
| 4  | CI/CD Quality Gates            | Fail    | 4 / 7         | E2E is explicitly non-blocking; no PR security scan; no image build/push workflow |
| 5  | Testing                        | Fail    | 2 / 8         | E2E suite heavily skip-based; no contract tests/scheduled smoke tests/flaky policy |
| 6  | Code Quality & Static Analysis | Fail    | 1 / 5         | Explicit `any` in production paths; no formatter gate; error swallowing at boundaries |
| 7  | Dependency Hygiene             | Fail    | 3 / 7         | No automated update PRs; no SBOM; no artifact signing |
| 8  | Deployment & Rollback          | Fail    | 1 / 7         | No staging gate/canary; no last-known-good tracking; no startup fail-fast env validation |
| 9  | Observability                  | Fail    | 2 / 9         | Mixed structured/unstructured logging; no request tracing or RED metrics |
| 10 | Data Protection & Recovery     | Fail    | 1 / 6         | No PITR evidence; no completed restore-drill log; DB timeout/pool controls not defined |
| 11 | Repo Hygiene                   | Fail    | 3 / 6         | Large operational artifact footprint tracked in repo; dev/prod dependency split issues |
| 12 | Governance & Review            | Fail    | 0 / 6         | No CODEOWNERS, branch protection policy doc, ADR process, or audit cadence evidence |

Overall: 0 / 12 categories passing  
Stack tags: spa, container, api

## Detailed Findings

### Category 1: Security & Access Control --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| AuthN on every endpoint | Fail | `app/api/settlement/route.ts` exposes `GET` without `requireAuth` at lines 306-323; `app/api/bce-metrics/route.ts` at lines 50-61 has no auth guard |
| AuthZ enforced in code | Fail | `app/api/merchants/route.ts` accepts arbitrary `communityId` at lines 55-76 after only `requireAuth`; `app/api/transactions/route.ts` similar at lines 53-83 |
| Shared auth helper | Pass | `lib/auth-middleware.ts` (`requireAuth`) at lines 135-145; used in `app/api/community/route.ts` lines 15-16, `app/api/transactions/route.ts` lines 15-16, `app/api/merchants/route.ts` lines 14-15 |
| Least-privilege IAM | N-A | No cloud IAM templates (`template.yaml`, Terraform, `serverless.yml`) found |
| RBAC with minimum roles | Fail | No role/permission matrix; auth middleware only validates session presence (`lib/auth-middleware.ts` lines 135-145) |
| Rate limiting | Partial | Global middleware per-IP limiter exists (`middleware.ts` lines 105-141); endpoint-local limiters in `app/api/auth/route.ts` lines 18-24 and `app/api/l402/route.ts` lines 223-229 |
| WAF or equivalent | Fail | Not found (`AWS::WAFv2`, CDN WAF rules, firewall-as-code) |
| CORS and security headers | Pass | Security headers in `next.config.ts` lines 21-57; CORS middleware in `middleware.ts` lines 160-211 |

**Failures:**
- **AuthN on every endpoint:** `GET /api/settlement` is unauthenticated, despite returning settlement records by `saleId` (`app/api/settlement/route.ts:306`).
- **AuthZ enforced in code:** Authenticated users can submit mutations for arbitrary `communityId` values without ownership/role checks (`app/api/merchants/route.ts:55`, `app/api/transactions/route.ts:53`).
- **RBAC with minimum roles:** No Admin/Operator/Viewer model or enforcement points were found.
- **WAF or equivalent:** No edge filtering rules are configured in repo.

**Recommendations:**
- Require authentication on `GET /api/settlement` and enforce ownership checks on settlement lookup.
- Add resource-level authorization checks for community-scoped writes.
- Introduce a documented RBAC matrix and enforce it in shared middleware.
- Add WAF/CDN security rules for internet-facing endpoints.

### Category 2: Secrets Management --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| No secrets in code | Pass | No tracked `.env` file (`git ls-files '*.env'` returned none); `.env.example` contains placeholders only |
| Secrets in managed store | Fail | Env-file driven setup (`.env.example` lines 7-159); no Secrets Manager/Vault/SSM integration found |
| 90-day rotation | Fail | Secret generation exists (`scripts/generate-secrets.sh` lines 53-104) but no scheduled rotation cadence/proof |
| Per-service credentials | Partial | Shared cross-service secret model in `lib/auth-middleware.ts` lines 48-50 (`AUTH_SHARED_SECRET` fallback chain) |
| Immediate revocation on leak | Fail | Incident runbook has no secret leak revoke/rotate workflow (`docs/INCIDENT_RESPONSE.md`) |
| Secret scanning in CI | Fail | `.github/workflows/ci.yml` has no `gitleaks`/`trufflehog`/`detect-secrets` step |

**Failures:**
- **Secrets in managed store:** Production guidance relies on `.env` secrets, not managed secret backends.
- **Rotation cadence:** No documented 90-day rotation process or last-rotation evidence.
- **Leak revocation:** No explicit revoke/rotate/audit-time-target procedure.
- **Secret scanning in CI:** Only local hook pattern scanning exists (`.githooks/pre-commit`); CI does not enforce it.

**Recommendations:**
- Add managed secret backend integration and environment-specific secret references.
- Document and automate rotation cadence with owner and evidence log.
- Add leak-response runbook section with SLA and audit steps.
- Add blocking CI secret scan step on every PR.

### Category 3: Input Validation & Resilience --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Shared validation utility | Pass | `lib/validation.ts` central validators; consumed by API routes (`app/api/community/route.ts:11`, `app/api/payment/route.ts:18`, `app/api/transactions/route.ts:10`) |
| Validate at system boundaries | Partial | Strong in many POST routes; mixed style in settlement route (`app/api/settlement/route.ts` lines 122-147) and unvalidated query usages exist in GET paths |
| Per-user rate limiting | Fail | Middleware throttles by IP bucket only (`middleware.ts` lines 107-129), not by authenticated user |
| Circuit breakers | Fail | No circuit breaker/failure-threshold logic found around external calls |
| Jittered exponential backoff | Fail | No retry+backoff+jitter policy found for external API calls |
| Idempotency | Partial | Settlement idempotency by `saleId` is implemented (`app/api/settlement/route.ts` lines 168-179) |
| Default timeouts | Fail | External fetches without explicit timeout in payment and L402 paths (`lib/payment-sdk.ts:67`, `app/api/l402/route.ts:141`, `app/api/l402/route.ts:172`) |
| Cost alerting | Fail | No budget/cost alert configuration found |

**Failures:**
- **Per-user rate limiting:** Costly routes are IP-throttled, not user-throttled.
- **Resilience controls:** No circuit breaker/backoff policy is implemented for sustained dependency failures.
- **Timeout policy:** Timeout behavior is inconsistent and missing in critical payment/LND calls.
- **Cost alerting:** No spend alerting controls in repo.

**Recommendations:**
- Add authenticated principal-based limits for payment and settlement endpoints.
- Implement retry policy with jitter and max-attempt cap; avoid retry on non-429 4xx.
- Enforce timeout wrappers for all external calls, especially payment-critical ones.
- Add budget/spend alerting implementation and runbook linkage.

### Category 4: CI/CD Quality Gates --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Every push tested | Partial | PR and push triggers exist (`.github/workflows/ci.yml` lines 3-7) but enforcement outside repo settings is unknown |
| Test coverage honest | N-A | No coverage reporting job configured in CI |
| Lint gate | Pass | `npm run lint` in CI (`.github/workflows/ci.yml` lines 21-22) |
| Type checking gate | Pass | `npx tsc --noEmit` (`.github/workflows/ci.yml` lines 37-38) |
| Build verification | Pass | `npm run build` (`.github/workflows/ci.yml` lines 53-54) |
| Security scan | Fail | No dependency/secret scanning step in CI |
| No false passes | Fail | E2E marked `continue-on-error: true` (`.github/workflows/ci.yml` line 66) |
| Container image built on merge | Fail | No merge workflow that builds/pushes container image |

**Failures:**
- **No false passes:** CI explicitly allows E2E failure while still passing overall status.
- **Security scan:** No PR-blocking security scanner is present.
- **Container image built on merge:** No registry publish workflow is defined.

**Recommendations:**
- Remove `continue-on-error` for critical suites or split into required and optional jobs with explicit policy.
- Add blocking `npm audit`/secret scan steps.
- Add main-branch image build/push workflow with immutable tags.

### Category 5: Testing --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Test pyramid defined | Partial | `docs/E2E_TESTING.md` defines layers and flow (`docs/E2E_TESTING.md` lines 13-31) but references missing suites |
| Behavior-focused tests | Pass | Many tests assert observable responses/outcomes (e.g., `tests/l402-integration.test.ts`) |
| Fast execution | Pass | `npm test` completed in ~5.2s (321 tests, 61 skipped) |
| Security test matrix | Partial | Auth/security tests exist, but many are skip-conditional (`tests/e2e/auth-nostr.test.ts` lines 31-34, 90-93) |
| Contract tests | Fail | No OpenAPI/schema contract test suite found |
| Smoke tests | Fail | No scheduled CI smoke workflow found |
| Real dependencies in integration | Fail | E2E tests skip when app/services are unavailable (`tests/e2e/l402-payment.test.ts` lines 47-49, 141-142) |
| Flaky test policy | Fail | No quarantine/flaky ownership policy found |

**Failures:**
- **Real dependency validation:** Critical E2E checks are skipped if environment is absent.
- **Coverage completeness:** Missing contract and scheduled smoke tests for external API compatibility.
- **Process maturity:** No flaky-test management mechanism.

**Recommendations:**
- Make core E2E suites required in CI via provisioned test environment.
- Add contract tests for API payload schemas and compatibility checks.
- Add nightly smoke workflow and flaky-test quarantine policy.

### Category 6: Code Quality & Static Analysis --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| JS/TS linter | Pass | ESLint configured (`.eslintrc.json` lines 2-13); CI runs lint (`.github/workflows/ci.yml` lines 21-22) |
| Python linter | N-A | No Python production code path requiring lint gate |
| Type strictness | Fail | `strict: true` in `tsconfig.json` line 7, but explicit `any` in production code (`lib/lightning-agent.ts` lines 129,147,240,570; `lib/fedimint-sdk.ts` lines 12,13,25,26,197,203) |
| Formatter | Fail | No Prettier/format-check configuration in repo or CI |
| Error handling at boundaries | Fail | Swallowed catches with silent fallback (`app/api/payment/verify/route.ts` lines 34-36 and 46-48; `app/api/settlement/route.ts` lines 82-84) |
| Dependency minimalism | Fail | `prisma` listed in `dependencies` (`package.json` line 33) rather than dev-only toolchain split |

**Failures:**
- **Type strictness:** Strong compiler config is undercut by many `any` escape hatches.
- **Error handling:** Silent catch blocks reduce diagnosability and can mask production faults.
- **Formatter gate:** No enforced formatting policy.
- **Dependency minimalism:** Tooling dependency mixed into runtime dependencies.

**Recommendations:**
- Eliminate `any` in production-critical modules and fail CI on `no-explicit-any`.
- Replace silent catches with structured error logging + explicit degraded behavior.
- Add formatter config and CI `format:check`.
- Move dev-only tooling (`prisma` CLI) to `devDependencies` where feasible.

### Category 7: Dependency Hygiene --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Vulnerability baseline | Pass | `npm audit --json` returned zero vulnerabilities |
| No deprecated packages | Partial | Outdated major runtime/tooling dependencies (`npm outdated --json`, e.g., Prisma 5.22.0 vs 7.4.2) |
| Automated update PRs | Fail | No `.github/dependabot.yml` or Renovate config |
| Lock files committed | Pass | `package-lock.json` tracked |
| SBOM per release | Fail | No SBOM generation in CI |
| Signed artifacts | Fail | No artifact/image signing workflow |
| No vendored packages in git | Pass | No tracked vendor directories (`node_modules`, `site-packages`, etc.) |

**Failures:**
- **Automated update pipeline:** No dependency bot configured.
- **Supply chain artifacts:** SBOM and signing controls absent.

**Recommendations:**
- Add Dependabot/Renovate for npm + GitHub Actions updates.
- Generate CycloneDX SBOM in release/merge workflows.
- Add image/package signing (e.g., cosign) and verification policy.

### Category 8: Deployment & Rollback --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Staging before production | Fail | Deploy docs describe direct production VPS rollout; no staging promotion gate (`docs/DEPLOY.md`, `docs/VPS_SETUP.md`) |
| Post-deploy verification | Pass | Health verification steps documented (`docs/VPS_SETUP.md` lines 285-292, 322) |
| Last-known-good tracking | Fail | Rollback is manual tag edit without automated healthy-version registry (`docs/INCIDENT_RESPONSE.md` lines 291-312) |
| Env var validation | Fail | Validation function exists (`lib/env-check.ts`) but is only invoked in `/api/health` (`app/api/health/route.ts` line 76), not at startup |
| Migration safety | Partial | Migration/rollback process documented (`docs/MIGRATION_PLAN.md` lines 508-517, 575) |
| Canary or traffic shifting | Fail | No canary/traffic-shift deployment controls found |
| Fail-fast config | Fail | Misconfig does not universally fail process at startup; many checks occur per-request only |

**Failures:**
- **Release safety:** No staging gate or canary mechanism.
- **Rollback safety:** No formal "last known good" tracking.
- **Fail-fast:** Environment validation is endpoint-scoped, not startup-scoped.

**Recommendations:**
- Add staged promotion workflow and required staging health gate.
- Track last known healthy release artifact and automate rollback target selection.
- Run env validation at process startup and fail boot on critical config gaps.

### Category 9: Observability --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Structured logging | Partial | Shared JSON logger exists (`lib/logger.ts` lines 22-38), but raw `console.warn` usage remains in API paths (`app/api/community/route.ts:26`, `app/api/settlement/route.ts:98`, `app/api/l402/route.ts:146`) |
| Shared logging utility | Partial | Logger utility adopted in several routes, not universal |
| No secrets in logs | Pass | Logger explicitly defines sanitized fields (`lib/logger.ts` lines 47-64); no direct token/preimage logging found |
| Request tracing | Fail | `requestId` field exists in logger type (`lib/logger.ts:14`) but no propagation across handlers/services |
| SLOs/SLIs defined | Partial | KPI docs exist (`docs/PILOT_KPIS.md`) but no explicit error-budget/SLO operational policy |
| Alerting on anomalies | Partial | Manual Grafana alert routing documented (`docs/INCIDENT_RESPONSE.md` lines 271-287) but no codified alert rules in infra |
| RED metrics | Fail | No endpoint-level rate/error/duration emission found in app code |
| Deep health checks | Pass | `/api/health` checks DB, mint, and LND dependencies (`app/api/health/route.ts` lines 78-105) |
| Docs match reality | Fail | Testing doc references non-existent files (`docs/E2E_TESTING.md` lines 185, 510, 530, 548; missing under `tests/e2e/`) |

**Failures:**
- **Structured logging consistency:** Mixed logging patterns reduce observability quality.
- **Tracing:** No correlation IDs across service boundaries.
- **RED telemetry:** No standard endpoint telemetry instrumentation.
- **Doc-code drift:** Ops/testing docs claim artifacts that do not exist.

**Recommendations:**
- Replace raw console logging with shared structured logger in all server code.
- Introduce request/correlation ID extraction and propagation.
- Add RED metric instrumentation and dashboard panels.
- Reconcile docs with actual test inventory and CI behavior.

### Category 10: Data Protection & Recovery --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Point-in-time recovery | Fail | No PITR configuration/evidence for Postgres in deployment config |
| Storage versioning | N-A | No object storage (S3/GCS) resources in repo |
| Disaster recovery plan | Pass | DR and incident runbooks exist (`docs/DR_DRILL.md`, `docs/INCIDENT_RESPONSE.md`) |
| Backup verification | Fail | DR drill log template present but unfilled (`docs/DR_DRILL.md` lines 353-361) |
| Safe migrations | Partial | Migration rollback criteria documented (`docs/MIGRATION_PLAN.md` lines 508-517) |
| Connection pool limits | Fail | No explicit Prisma/DB pool caps in `lib/db.ts` or env config |
| Query and lock timeouts | Fail | No DB statement/lock timeout policy in app DB layer |

**Failures:**
- **Recoverability confidence:** Backup restore drill evidence is missing.
- **Database safety controls:** PITR, pool caps, and query/lock timeout controls are not defined in code/config.

**Recommendations:**
- Add PITR-capable backup strategy for production DB and document restore SLAs.
- Execute and record quarterly restore drills.
- Define and enforce pool size and query/lock timeout configuration.

### Category 11: Repo Hygiene --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| No vendor packages in git | Pass | No tracked vendor directory matches |
| Clean .gitignore | Pass | No tracked-and-ignored conflicts (`git ls-files -ci --exclude-standard` empty) |
| Root directory clean | Fail | Large operational artifacts are tracked (e.g., `.overnight/popup_logs/*.png`, `.overnight/*.json`) |
| Shared code centralized | Pass | Shared modules are centralized under `lib/` and imported by API routes |
| Dev packages separated | Fail | `prisma` in runtime dependencies (`package.json` line 33) |
| Pre-commit hooks | Partial | Hook file exists (`.githooks/pre-commit`) but no install/enforcement documentation in `README.md`/`CONTRIBUTING.md` |

**Failures:**
- **Root hygiene:** Operational screenshots/log artifacts are versioned in the main repository.
- **Dependency boundary:** Dev/runtime dependency split is not clean.

**Recommendations:**
- Move operational logs/screenshots out of primary repo history and add ignore rules.
- Tighten dependency split for production install footprint.
- Document and enforce pre-commit hook installation in contributor workflow.

### Category 12: Governance & Review --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Code owners defined | Fail | `.github/CODEOWNERS` not found |
| Branch protection | Fail | No branch protection policy docs found in repo |
| ADR process | Fail | No ADR directory/template found (`docs/adr` / `docs/decisions`) |
| Quarterly review | Fail | `docs/audits/` had no prior production audit history |
| Audit trail | Fail | No append-only audit log for privileged mutations found |
| Prompt review policy | Fail | No explicit policy requiring review for prompt/template changes |

**Failures:**
- Governance controls for ownership, review policy, and architecture decisions are missing.
- No formal recurring production audit cadence evidence.

**Recommendations:**
- Add CODEOWNERS and reviewer ownership for auth/payment/infra paths.
- Document branch protection policy and required checks.
- Establish ADR template and decision log.
- Introduce quarterly audit cadence under `docs/audits/`.
- Add explicit prompt-change review policy.

### Stack Appendix: Containers --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| Multi-stage builds | Pass | `Dockerfile` uses `base`, `deps`, `builder`, `runner` stages (lines 3, 6, 12, 19) |
| Non-root execution | Pass | `USER nextjs` in runtime stage (`Dockerfile` line 27) |
| Read-only filesystem | Fail | No read-only root filesystem constraint in `docker-compose.yml` services |
| No secrets in image | Pass | Dockerfile does not bake runtime secrets; secrets provided via env at compose runtime |
| Helm chart structure | N-A | No Helm deployment in repo |
| Network policies | N-A | No Kubernetes manifests/network policies in repo |
| Pod security | N-A | No Kubernetes pod security context in repo |
| Health probes | Partial | Healthchecks exist for key services (`docker-compose.yml` lines 41-47, 187-193, 231-236) but not uniformly across all services |

**Failures:**
- Root filesystem hardening is not configured for containers.

**Recommendations:**
- Add read-only root filesystem and explicit writable mount exceptions where needed.
- Standardize healthchecks across all critical runtime services.

### Stack Appendix: SPA --- Fail

| Principle | Result | Evidence |
|-----------|--------|----------|
| CSP headers | Fail | CSP includes `unsafe-inline` and `unsafe-eval` (`next.config.ts` lines 45-46) |
| Build verification in CI | Pass | Build runs in PR CI (`.github/workflows/ci.yml` lines 53-54) |
| CDN cache config | Partial | No explicit production CDN cache policy documentation found |
| Source maps | Pass | No explicit production source-map exposure setting enabled |
| Environment isolation | Fail | No documented staging/prod isolation pipeline; production deploy docs are single-environment focused |

**Failures:**
- CSP is permissive relative to production hardening target.
- Staging/production environment separation is not clearly implemented.

**Recommendations:**
- Tighten CSP toward nonce/hash-based script/style policies.
- Define separate staging and production configuration/deployment paths.

## Roadmap

### Phase 0 --- Critical (Target: 2026-03-16)

| ID | Category | Finding | Fix | Priority | Est. Effort |
|----|----------|---------|-----|----------|-------------|
| PE-001 | Security | `GET /api/settlement` is unauthenticated and exposes settlement data by `saleId` | Require auth and enforce caller ownership/authorization on settlement lookup | P0 | S |
| PE-002 | Security | Community-scoped mutations trust caller-provided `communityId` without ownership checks | Add ownership/RBAC guard middleware for write endpoints | P0 | M |
| PE-003 | CI/CD | E2E gate is non-blocking (`continue-on-error: true`), creating false CI confidence | Make critical E2E required; split optional suites explicitly | P0 | S |
| PE-004 | Deployment/Data | Initial migration file includes non-SQL trailing banner text | Clean migration SQL and validate `prisma migrate deploy` on fresh DB in CI | P0 | S |
| PE-005 | Data Protection | No evidence of completed restore drill; drill log is empty | Execute full restore drill and record results in `docs/DR_DRILL.md` | P0 | M |
| PE-006 | Data Protection | No PITR-grade protection for production data | Implement PITR-capable backup strategy and documented restore process | P0 | L |

### Phase 1 --- High (Target: 2026-04-13)

| ID | Category | Finding | Fix | Priority | Est. Effort |
|----|----------|---------|-----|----------|-------------|
| PE-007 | Secrets | No CI secret scan and no leak-revocation SOP | Add blocking secret scan in PR CI and leak revoke/rotate runbook with SLA | P1 | S |
| PE-008 | Resilience | Per-IP throttling only; no per-user limits on costly endpoints | Add user/token-aware limits and abuse-response policy | P1 | M |
| PE-009 | Resilience | No circuit-breaker/backoff strategy for external dependencies | Add bounded retries with jitter + circuit-breaker states for payment deps | P1 | M |
| PE-010 | Resilience | Critical external payment calls lack explicit timeout | Enforce timeout wrapper for all external calls in payment and settlement paths | P1 | S |
| PE-011 | Deployment | Config validation is request-time, not startup fail-fast | Run env validation at process start and fail boot on critical missing vars | P1 | S |
| PE-012 | Observability | No request tracing or RED metrics across API endpoints | Add request IDs, propagate across boundaries, emit RED metrics | P1 | M |
| PE-013 | SPA Security | CSP still allows `unsafe-inline`/`unsafe-eval` | Transition to nonce/hash CSP and remove unsafe directives where possible | P1 | M |
| PE-014 | Testing | E2E suite skip behavior masks missing runtime dependencies | Provision required test stack in CI and fail when required deps are absent | P1 | M |

### Phase 2 --- Medium (Target: 2026-05-25)

| ID | Category | Finding | Fix | Priority | Est. Effort |
|----|----------|---------|-----|----------|-------------|
| PE-015 | Dependency Hygiene | No dependency automation (Dependabot/Renovate) | Add dependency update bot config for npm and actions | P2 | S |
| PE-016 | Dependency Hygiene | No SBOM or artifact signing in release flow | Add CycloneDX SBOM generation and image signing/verification | P2 | M |
| PE-017 | Code Quality | Explicit `any` and silent catch patterns in production-critical modules | Replace `any` with concrete types and enforce no-silent-catch policy | P2 | M |
| PE-018 | Repo Hygiene | Operational artifact bloat in tracked `.overnight` paths | Move runtime artifacts out of repo; update ignore rules | P2 | M |
| PE-019 | Governance | Missing CODEOWNERS, ADR process, and branch protection policy doc | Add ownership map, ADR template/log, and governance policy docs | P2 | M |
| PE-020 | Governance | No recurring production audit history | Establish quarterly audit cadence under `docs/audits/` | P2 | S |

### Phase 3 --- Ongoing

| ID | Category | Finding | Fix | Priority | Est. Effort |
|----|----------|---------|-----|----------|-------------|
| PE-021 | Testing | No flaky test quarantine policy | Track flaky tests with owner/expiry metadata | P3 | S |
| PE-022 | Deployment | No canary/traffic-shift deployment pattern | Introduce progressive delivery pattern or documented opt-out ADR | P3 | L |
| PE-023 | Observability | Alert definitions are largely manual/instructional | Codify alerts as config-as-code and validate in CI | P3 | M |
