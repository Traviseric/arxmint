# ArxMint â€” Product & Technical Specification

**Version:** 1.3 â€” March 2, 2026
**Scope:** Canonical product + architecture spec for ArxMint.
**Traceability:** Research mapping in `docs/research/research-crossref.md`; delivery plan in `docs/core/roadmap.md`.
**Self-hosting UX research:** `docs/research/Phase5-Bazaar/Self-Hosting-UX/` (11 studies informing Â§2, Â§4, Â§5, Â§7)

---

<a id="spec-1-overview"></a>
## Â§1 Overview

ArxMint is an AI-first Bitcoin circular economy builder. A user provides one natural-language prompt, and ArxMint generates deployment configuration for private community commerce rails:

- Federated ecash via Fedimint (or lightweight fallback via Cashu)
- Lightning-based agent commerce via L402
- Privacy controls and observability surfaces for operators

Primary product goal: let humans and AI agents transact on shared Bitcoin-native rails without requiring centralized platform custody.

<a id="spec-2-users"></a>
## Â§2 Users

- **Community Builder:** launches and configures a local economy instance.
- **Community Member:** sends/receives ecash and uses merchant/agent services.
- **Agent Operator:** runs AI agents monetized through L402/Cashu paywalls.
- **Guardian/Operator:** maintains federation/mint uptime, policies, and reporting.
- **Merchant Node Operator:** runs a self-hosted payment node (Phase 5). Distinct from Community Builder â€” needs appliance-grade UX, not developer tooling. Primary interaction surface is a merchant dashboard and mobile remote control, not CLI or Docker. ArxMint's provisioning service handles infrastructure; the merchant handles business operations.

<a id="spec-3-features"></a>
## Â§3 Features

- **F1 Community Creation:** prompt-to-config flow, backend selection, guardian topology.
- **F2 Agent Commerce:** L402-gated services, scoped credentials, auditability.
- **F3 Privacy Layer:** explicit per-backend support matrix for SP/CoinJoin/PayJoin/Ark.
- **F4 Circular Economy Ops:** merchant onboarding, KPI tracking, reporting exports.
- **F5 Merchant Platform (Phase 5):** self-hosted payment node with checkout, webhooks, client SDK, dashboard, LNURL-pay. Provisioning service for one-command deploy. Managed DNS. Zero-knowledge encrypted backups. Appliance update engine. LSP-bootstrapped liquidity.

<a id="spec-4-architecture"></a>
## Â§4 Technical Architecture

- **Frontend:** Next.js App Router dashboard and workflow pages.
- **Wallet Adapters:** `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts`, `lib/lightning-agent.ts`.
- **Orchestration:** `lib/community-generator.ts` produces deployment artifacts.
- **Infra:** Docker Compose stack (LND, mint/federation services, paywall proxy, monitoring).
- **State:** Zustand store with typed balance/community/connection slices.

### Â§4.1 Merchant Node Architecture (Phase 5)

Research basis: `docs/research/Phase5-Bazaar/Self-Hosting-UX/` (11 studies).

**Split-plane design:**

- **Data plane (merchant-owned):** LND (Neutrino) + Cashu mint + checkout UI + webhook engine + dashboard + LNURL-pay. Runs on merchant-controlled VPS. Merchant holds seed phrase and admin macaroons. ArxMint never touches keys or funds.
- **Control plane (ArxMint-managed, non-custodial):** Provisioning service that creates VMs (BYOC via OAuth/API grant), assigns managed subdomains (`storename.arxmint.cloud`), reports health/backup status, and applies signed stack updates. ArxMint does NOT retain SSH keys after bootstrap. Role = deployment orchestrator + software update channel.

**Connectivity model (tiered):**

1. **Cloudflare Tunnel (default):** Outbound-only connection. Eliminates inbound port requirements, CG-NAT, dynamic IP issues. Auto-SSL at edge. Trade-off: Cloudflare sees checkout traffic (acceptable for payment pages; core LND gRPC and seeds remain local).
2. **Caddy direct:** For VPS with static IP. Automatic HTTPS via Let's Encrypt/ZeroSSL.
3. **LAN-only:** For in-person POS. No public DNS needed. Customer joins WiFi, scans QR, pays.
4. **Tor:** Privacy backchannel. Not default (poor UX: 56-char addresses, latency, requires Tor browser).

**Managed DNS:**

- Default: `storename.arxmint.cloud` pointing to merchant's node. ArxMint manages the DNS zone; merchant runs the node.
- DynDNS-style HTTPS API for dynamic IP nodes (node discovers public IP, authenticates to control plane, updates its own A/AAAA record).
- Custom domain available as optional upgrade, not a prerequisite.
- Let's Encrypt rate limit awareness: 50 certs/registered domain/7 days. ZeroSSL as fallback. Design as a first-class scaling dimension.

**Liquidity bootstrap:**

- LSP (Lightning Service Provider) integration for JIT channel opening on first inbound payment.
- Present inbound capacity as "max instant payment size" with one-tap "increase limit."
- Turbo channels (zero-conf) for instant onboarding with clear risk language.

**Minimum viable merchant stack:** LND (Neutrino) + Cashu mint + checkout UI + webhook engine + dashboard. Shipped as a single versioned unit (stack BOM).

**Hardware baselines:**

| Tier | Spec | Notes |
|------|------|-------|
| Minimum (cloud) | 2 vCPU, 2GB RAM, 40GB SSD | Hetzner CPX11 ~$5-7/mo, DigitalOcean $12/mo |
| Recommended (cloud) | 2 vCPU, 4GB RAM, 80GB SSD | Headroom for traffic spikes |
| Home node | RPi 5 / 8GB or x86 mini-PC | RPi 4 4GB marginal; 1GB instances will OOM during LND graph sync |

Architecture rules:

1. Fedimint SDK is client-side join/use only; federation creation is infra-driven.
2. Security boundaries must separate agent runtime from signing authority.
3. Feature status shown to users must reflect real backend capability, not aspiration.
4. Merchant provisioning service is non-custodial: it can create/destroy infrastructure but cannot move, freeze, or redirect funds. This is the FinCEN "unhosted wallet provider" boundary.
5. Merchant node updates ship as tested stack BOMs (bill of materials), not individual `docker pull` commands. Rollback is automatic on failed health checks.

<a id="spec-5-user-flows"></a>
## Â§5 User Flows

- **Flow A:** Prompt â†’ generated config â†’ deploy stack.
- **Flow B:** Agent endpoint access via 402 challenge/response (L402 and roadmap Cashu NUT-24).
- **Flow C:** Wallet operations across Fedimint/Cashu/Lightning.
- **Flow D:** Routed spend path selection (roadmap) based on amount/privacy/capability.
- **Flow E:** Merchant node deployment â†’ first payment received (Phase 5). Three-question wizard ("where will it run?" â†’ "store name?" â†’ "online or in-person?") â†’ provisioning service creates VM + managed subdomain â†’ stack deploys â†’ LSP opens first channel â†’ merchant receives first payment. Target: < 15 minutes from start to first payment.

<a id="spec-6-security"></a>
## Â§6 Security Model

### Â§6.1 Agent Security
- Enforce least privilege for agent-accessible Lightning operations.
- Treat Cashu keyset validation and restore semantics as mandatory controls.
- Keep capability claims honest (especially Silent Payments by backend).
- Require auditable tests for any P0/P1 security or payment-path change.

### Â§6.2 Merchant Node Security (Phase 5)

Self-hosted merchant nodes run on the open internet. Security is the merchant's responsibility, but ArxMint software must ship secure defaults.

**Network isolation:**
- Caddy is the only service binding to public ports (80/443). LND gRPC, Cashu mint admin, and PostgreSQL are internal-only (Docker network).
- LND p2p (9735) is the only non-HTTP public port. Firewall rules generated by `arxmint merchant init` block all other inbound traffic.

**Macaroon lifecycle:**
- Admin macaroons generated at setup, stored in merchant's local DB (hashed). Never transmitted to ArxMint.
- `arx_pub_` (invoice-only) tokens are safe for client-side embedding â€” cannot authorize payments or read balances.
- Rotation: `arxmint keys rotate` generates new macaroons and invalidates old ones. Zero-downtime â€” new tokens active before old ones expire.
- Revocation: compromised tokens revocable immediately via dashboard or CLI.

**Cloudflare Tunnel trust boundary:**
- When using Cloudflare Tunnel (default connectivity), Cloudflare terminates TLS and can see checkout page traffic in plaintext.
- Acceptable scope: payment page HTML, invoice amounts, QR codes (all publicly visible during checkout anyway).
- Protected scope: LND gRPC, seed phrases, admin macaroons, mint private keys â€” these never traverse the tunnel. LND gRPC stays on localhost or internal Docker network.
- Merchants requiring end-to-end encryption should use Caddy direct mode (static IP VPS) instead.

**Self-hosted node hardening:**
- Auto-HTTPS via Caddy (Let's Encrypt/ZeroSSL) â€” no self-signed certificates.
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers on all responses.
- Rate limiting on all API endpoints (configurable, sensible defaults).
- Wallet auto-lock on idle. Unlock requires merchant action (push notification or dashboard).

<a id="spec-7-monetization"></a>
## Â§7 Monetization

- Per-request agent service pricing via L402/Cashu paywalls.
- Merchant circular spend volume as growth indicator.
- Grant-funded scaling supported by structured KPI/report exports.
- **BYOC managed operations (Phase 5):** $15â€“25/month subscription covering infrastructure provisioning (~$6/mo raw cost), encrypted backup storage, signed stack updates, health monitoring, and support. Merchant brings their own cloud account; ArxMint provisions via OAuth/API grant (revocable). ArxMint margin comes from operational automation, not custody or transaction fees.

<a id="spec-8-pilot"></a>
## Â§8 Pilot Deployment

Pilot objective: deploy a production-hardened community instance (Longmont target) with measurable reliability, merchant adoption, and user activity.

Phase 4 pilot should explicitly validate self-hosting UX assumptions before Phase 5 build-out: measure merchant time-to-first-payment, identify DNS/connectivity pain points, and confirm that non-technical operators can manage node health without SSH access.

<a id="spec-9-metrics"></a>
## Â§9 Success Metrics

### Â§9.1 Community Metrics (Phase 4)
- Merchant onboarding count and active merchant ratio.
- Monthly active spenders and spend velocity.
- Payment success rate and latency.
- Federation/mint uptime and liquidity coverage.
- Agent service request volume and paid conversion.

### Â§9.2 Merchant Platform Metrics (Phase 5)
- **Time-to-first-payment:** Minutes from `arxmint merchant init` to first successful payment received. Target: < 15 minutes.
- **Merchant node uptime:** Percentage of time the merchant's checkout endpoint is reachable and healthy. Target: 99.5%+.
- **Update adoption rate:** Percentage of active merchant nodes running the latest stable stack BOM within 7 days of release.
- **Backup success rate:** Percentage of merchant nodes with a verified backup less than 24 hours old. LND SCB must be near-real-time.
- **LSP channel success rate:** Percentage of JIT channel opens that complete successfully on first inbound payment.
- **Merchant retention:** Percentage of merchants still actively receiving payments 90 days after deployment.
- **SDK adoption:** Number of integrations using `@arxmint/js` or `@arxmint/react` (tracked via opt-in telemetry or package download counts).

<a id="spec-10-delivery-gates"></a>
## Â§10 Delivery Gates (P0/P1 Acceptance + Tests)

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
| 5.1 Local auth tokens | `arx_live_` (full access) and `arx_pub_` (invoice-only) macaroons generated on setup; `arx_pub_` cannot authorize payments or read balances; rotation via `arxmint keys rotate` invalidates old tokens without downtime. | Permission tests: `arx_pub_` blocked from pay/balance endpoints; rotation test: old token rejected, new token accepted; sandbox mode: `arx_test_` routes to regtest. |
| 5.2 Webhook engine (local) | `payment.completed` fires within 5 seconds of invoice settlement; HMAC-SHA256 signature verifiable by merchant; exponential retry on failure (5 attempts); delivery log queryable via CLI. | End-to-end test: create invoice â†’ pay â†’ verify webhook fires to test endpoint with valid signature; retry test: block endpoint â†’ verify 5 retry attempts with backoff; idempotency: same event not delivered twice. |
| 5.3 Self-hosted checkout | Checkout page served from merchant's own domain; invoice generated by merchant's own LND node (verify pubkey matches merchant's node); QR renders for both Cashu (NUT-26) and Lightning (BOLT11); auto-redirect on payment completion via SSE. | Payment flow test from 3 external wallets (Phoenix, Zeus, Breez); verify invoice pubkey matches merchant node identity; SSE redirect test; mobile-responsive layout test. |
| 5.4 Payment status API | `GET /api/v1/payments/:id` returns correct payment states and metadata; SSE stream emits `status_changed` events as settlement state changes; status transitions are deterministic (`pending` â†’ `completed`/`expired`/`failed`). | API integration test: create payment, progress through mock/real settlement states, verify response payload and terminal states; SSE test verifies event emission order and payload; regression test ensures unknown IDs return correct error contract. |
| 5.5 Client SDK | `@arxmint/js` creates checkout session, mounts payment UI, and fires `completed` callback â€” all against merchant's own endpoint (not arxmint.com); `@arxmint/react` `<PayButton>` renders and completes payment. Compatible with Teneo Marketplace `arxmintService.js` stub interface. | Integration test: SDK â†’ merchant node â†’ payment â†’ callback; verify no requests to arxmint.com during payment flow; Teneo stub compatibility test: SDK exports satisfy `createL402Invoice()`, `verifyL402Payment()`, `acceptCashuToken()` interfaces. |
| 5.6 LNURL-pay + Lightning Address | `/.well-known/lnurlp/:username` resolves from merchant's domain; generates valid BOLT11 from merchant's LND; payable from any LNURL-compatible wallet. | Pay test from 3+ external wallets; LNURL metadata validation (spec compliance); static QR scan-and-pay test. |
| 5.7 Merchant dashboard | Traffic-light health status (green/yellow/red) with plain-language diagnoses; payments list with filters and CSV export; auth token management; webhook log; node status showing "max instant payment size" (not raw channel data). | UI test: verify health indicators reflect actual node state (mock degraded LND â†’ yellow/red); export test: CSV matches displayed data; auth: dashboard inaccessible without admin macaroon. |
| 5.8 One-command merchant deploy | Three-question wizard produces running merchant node with managed subdomain, auto-HTTPS, and LSP-bootstrapped liquidity in < 15 minutes. | End-to-end deploy test on fresh VPS; time-to-first-payment measurement; health check passes after deploy. |
| 5.11a Stack update engine | Signed stack BOM applied during maintenance window; automatic rollback on failed health check; canary ring progression. | Update simulation test (apply BOM, verify versions, inject health failure, verify rollback). |
| 5.11b Zero-knowledge backups | LND SCB event-driven (not cron); Cashu mint DB + config encrypted with seed-derived key; one-click restore from seed phrase on fresh host. Automated periodic restore rehearsal into disposable environment validates decryptability, checksums, and DB integrity. | Backup/restore round-trip test: deploy â†’ transact â†’ destroy â†’ restore from seed â†’ verify balances and config. Rehearsal test: automated restore into disposable env succeeds without manual intervention; dashboard shows "backup verified" with last-success timestamp. |
| 5.11c One-click restore | Fresh host â†’ enter seed phrase â†’ system derives decryption key â†’ fetches encrypted backup â†’ restores Cashu mint DB + config + LND via SCB import. Post-restore health checks verify: mint DB consistent, LND channels recovering, config loaded, checkout reachable. | End-to-end restore test: provision fresh VPS â†’ enter seed â†’ verify automated restore completes â†’ verify payments resume within 30 minutes. |
| 5.8c LSP liquidity bootstrap | First inbound payment triggers JIT channel open via LSP; merchant sees "max instant payment size" in dashboard. | Regtest test with mock LSP: create merchant node, send inbound payment, verify channel opened and payment received. |

---

## Spec Governance

- This file is the canonical reference for all `Spec Â§X` citations in roadmap/cross-reference docs.
- If roadmap behavior changes, update this spec and `docs/research/research-crossref.md` in the same change.
