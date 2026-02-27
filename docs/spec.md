# ArxMint — Product & Technical Specification

**Version:** 1.1 — February 27, 2026  
**Scope:** Canonical product + architecture spec for ArxMint.  
**Traceability:** Research mapping in `docs/research-crossref.md`; delivery plan in `docs/roadmap.md`.

---

<a id="spec-1-overview"></a>
## §1 Overview

ArxMint is an AI-first Bitcoin circular economy builder. A user provides one natural-language prompt, and ArxMint generates deployment configuration for private community commerce rails:

- Federated ecash via Fedimint (or lightweight fallback via Cashu)
- Lightning-based agent commerce via L402
- Privacy controls and observability surfaces for operators

Primary product goal: let humans and AI agents transact on shared Bitcoin-native rails without requiring centralized platform custody.

<a id="spec-2-users"></a>
## §2 Users

- **Community Builder:** launches and configures a local economy instance.
- **Community Member:** sends/receives ecash and uses merchant/agent services.
- **Agent Operator:** runs AI agents monetized through L402/Cashu paywalls.
- **Guardian/Operator:** maintains federation/mint uptime, policies, and reporting.

<a id="spec-3-features"></a>
## §3 Features

- **F1 Community Creation:** prompt-to-config flow, backend selection, guardian topology.
- **F2 Agent Commerce:** L402-gated services, scoped credentials, auditability.
- **F3 Privacy Layer:** explicit per-backend support matrix for SP/CoinJoin/PayJoin/Ark.
- **F4 Circular Economy Ops:** merchant onboarding, KPI tracking, reporting exports.

<a id="spec-4-architecture"></a>
## §4 Technical Architecture

- **Frontend:** Next.js App Router dashboard and workflow pages.
- **Wallet Adapters:** `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts`, `lib/lightning-agent.ts`.
- **Orchestration:** `lib/community-generator.ts` produces deployment artifacts.
- **Infra:** Docker Compose stack (LND, mint/federation services, paywall proxy, monitoring).
- **State:** Zustand store with typed balance/community/connection slices.

Architecture rules:

1. Fedimint SDK is client-side join/use only; federation creation is infra-driven.
2. Security boundaries must separate agent runtime from signing authority.
3. Feature status shown to users must reflect real backend capability, not aspiration.

<a id="spec-5-user-flows"></a>
## §5 User Flows

- **Flow A:** Prompt → generated config → deploy stack.
- **Flow B:** Agent endpoint access via 402 challenge/response (L402 and roadmap Cashu NUT-24).
- **Flow C:** Wallet operations across Fedimint/Cashu/Lightning.
- **Flow D:** Routed spend path selection (roadmap) based on amount/privacy/capability.

<a id="spec-6-security"></a>
## §6 Security Model

- Enforce least privilege for agent-accessible Lightning operations.
- Treat Cashu keyset validation and restore semantics as mandatory controls.
- Keep capability claims honest (especially Silent Payments by backend).
- Require auditable tests for any P0/P1 security or payment-path change.

<a id="spec-7-monetization"></a>
## §7 Monetization

- Per-request agent service pricing via L402/Cashu paywalls.
- Merchant circular spend volume as growth indicator.
- Grant-funded scaling supported by structured KPI/report exports.

<a id="spec-8-pilot"></a>
## §8 Pilot Deployment

Pilot objective: deploy a production-hardened community instance (Longmont target) with measurable reliability, merchant adoption, and user activity.

<a id="spec-9-metrics"></a>
## §9 Success Metrics

- Merchant onboarding count and active merchant ratio.
- Monthly active spenders and spend velocity.
- Payment success rate and latency.
- Federation/mint uptime and liquidity coverage.
- Agent service request volume and paid conversion.

<a id="spec-10-delivery-gates"></a>
## §10 Delivery Gates (P0/P1 Acceptance + Tests)

All P0/P1 roadmap items must satisfy both acceptance criteria and verification requirements below before closure.

| Roadmap Item | Acceptance Criteria | Required Verification |
|---|---|---|
| 0.1 Cashu keyset ID validation | Wallet rejects invalid/colliding keyset IDs; restore rejects unsafe proof responses; anomalies are logged. | Unit tests for keyset derivation/collision detection; integration test with mocked malicious mint responses. |
| 0.2 Silent Payments status display | Dashboard displays backend-specific SP support; Fedimint clearly marked as requiring federation module support. | UI test/snapshot for support labels; score-calculation test that support weighting changes totals. |
| 0.3 Lightning security tiers | WATCH_ONLY default enforced; PAY_ONLY requires explicit escalation; ADMIN path visibly high-risk. | Permission tests for blocked/allowed RPCs by tier; UI interaction test for escalation and warning states. |
| 0.4 Remote signer integration | Agent payment path uses remote signer flow; agent runtime has no direct signing key material. | Integration test with signer stub; config validation test ensuring signer env vars are required when enabled. |
| 1.1 NUT-24 ecash paywalls | Agent API can challenge and authorize with Cashu NUT-24 in addition to L402. | API tests for 402 challenge + retry authorization using valid/invalid Cashu tokens. |
| 1.2 Spend router | Deterministic route chosen by policy inputs (amount/privacy/capability); user override always possible. | Pure-function tests across route matrix; UI test verifying displayed rationale and manual override behavior. |
| 1.3 BCE metrics dashboard | Dashboard computes and displays core BCE KPIs and export output. | Metric aggregation tests; export format test (CSV/JSON schema validation). |
| 1.4 Merchant onboarding flow | Multi-step onboarding persists merchant profile and creates payment acceptance artifacts. | Form validation tests; API/component tests for create/list merchant behavior. |
| 1.5 Macaroon bakery | Role-scoped macaroons generated with TTL and caveat constraints. | Unit tests for caveat encoding and expiry; integration test proving role cannot exceed policy scope. |
| 1.6 Agent wallet pattern | Agent wallets are ephemeral, scoped, and auto-expiring; no persistent proof storage in agent mode. | Lifecycle tests for in-memory teardown/TTL expiry; regression test asserting no localStorage persistence in agent mode. |
| 1.7 G-Bot integration | Community generation supports G-Bot path with safe fallback to Docker generation when unavailable. | Adapter tests with G-Bot success/failure mocks; end-to-end generation test for both paths. |

---

## Spec Governance

- This file is the canonical reference for all `Spec §X` citations in roadmap/cross-reference docs.
- If roadmap behavior changes, update this spec and `docs/research-crossref.md` in the same change.
