# ArxMint — Overnight Tasks

**Goal:** Ship merchant MVP from the current prototypes — a merchant answers 3 questions, runs one command, and accepts Bitcoin payments in 15 minutes.
**Spec:** `docs/spec.md` §4.1, §5 Flow E, §6.2, §10 (acceptance criteria for every item below)
**Roadmap:** `docs/roadmap.md` Phase 5 (Bazaar)
**Architecture decisions:** Locked by 11 research studies in `docs/research/Phase5-Bazaar/Self-Hosting-UX/`

---

## Key Rules (Agents: follow these)

| Decision | Answer |
|----------|--------|
| **Custody** | Strictly non-custodial. Merchant holds keys. ArxMint never touches funds. |
| **Database** | Self-hosted Postgres in Docker Compose. Internal network only. |
| **Cashu proofs** | Client-side ONLY (IndexedDB + WebCrypto). NEVER store proofs in server DB. |
| **Auth** | Auth.js + Nostr NIP-98 primary. L402 for agents. Local macaroons for merchant API. |
| **Mint** | Nutshell for pilot. CDK migration later. |
| **Reverse proxy** | Caddy (automatic HTTPS via Let's Encrypt/ZeroSSL). |
| **Network** | All services on internal Docker network. Only Caddy exposes 80/443. LND p2p 9735 public. |
| **LND** | Neutrino light client (no full chain sync). Single biggest BTCPay UX lesson. |
| **Connectivity** | Cloudflare Tunnel default. Caddy direct for static IP. LAN-only for POS. |
| **DNS** | `storename.arxmint.cloud` managed subdomain. DynDNS API for dynamic IPs. |
| **Liquidity** | LSP for JIT channel opening. Turbo channels (zero-conf) for instant onboarding. |

---

## Current Repo State (Read this before coding)

- `/merchants` is live with 2 public seed merchants, public signup, admin-only pipeline visibility, checkout links, and badge CTA.
- `/pay/[merchant-id]` + `/api/checkout` + `/api/checkout/status/[id]` already exist as a checkout prototype.
- `/badge` is live with embed code, referral links, and printable merchant kit assets.
- `/create` already uses `MerchantSetupWizard`; it is a beta UX shell, not a finished deploy flow.
- `components/create-community-form.tsx` is legacy and no longer the active `/create` path.
- TE NUC testnet deployment is running, but first real end-to-end testnet payment is still outstanding.

**Rule for overnight workers:** Do not rebuild these surfaces from scratch. Promote the existing prototypes into the self-hosted architecture defined in `docs/roadmap.md`.

---

## Task List (ordered, top to bottom)

### Cleanup — Fix carry-forward bugs before building new features

- [ ] **T01** Wire `privacy-audit` endpoint to real `computePrivacyScore()`
  - File: `app/api/agent/route.ts`
  - Currently returns hardcoded score=78. Import `computePrivacyScore` from `lib/privacy-defaults.ts`, call with caller's community config.
  - Spec: §10 item 1.1 acceptance criteria
  - Test: Unit test — score varies by community config input

- [ ] **T02** Persist L402 challenges to DB
  - File: `app/api/l402/route.ts`
  - Replace in-memory `pendingL402` Map with `PaymentChallenge` DB table (model already in Prisma schema). Server restart must not drop pending sessions.
  - Test: Create challenge → restart server → challenge still retrievable

- [ ] **T03** Gate Ark VTXO as experimental
  - Files: `lib/ark-sdk.ts`, `lib/spend-router.ts`, `components/wallet-panel.tsx`
  - `SovereignArkClient` is a stub. Ark must not appear as an active spend route. Show "coming soon" badge in UI.
  - Test: Spend router never selects Ark path. UI shows experimental badge.

- [ ] **T04** Fix L402 auth bypass + hardcoded secrets
  - Files: `app/api/agent/route.ts`, `app/api/settlement/route.ts`, `lib/auth-middleware.ts`
  - (a) Agent route must reject requests without valid L402/NUT-24 auth
  - (b) Settlement POST must require auth
  - (c) Remove any hardcoded session secret fallback — fail if env var missing
  - (d) Return 503 when `MACAROON_ROOT_KEY` absent
  - Test: Unauthenticated requests return 401/503. No hardcoded secrets in codebase.

- [ ] **T05** Fix merchant false-success on DB failure
  - Files: `components/merchant-onboard.tsx`, `components/merchant-setup-wizard.tsx`
  - If merchant DB write fails, show error — not success. The active `/create` wizard must surface real generation/deploy errors with retry; do not spend time on the legacy `components/create-community-form.tsx` unless deleting or retiring it.
  - Test: Mock DB failure → UI shows error state with retry option on the active flow

- [ ] **T06** Add CI/CD pipeline
  - File: `.github/workflows/ci.yml`
  - GitHub Actions: lint → build → `npm test` → E2E tests (regtest Docker) on every push to master. Deploy to testnet on tagged release.
  - Test: Push to master triggers workflow. All tests pass in CI.

- [ ] **T07** Landing page cleanup
  - File: `app/page.tsx`
  - (a) Old `Math.random()` live metrics removed in homepage redesign — verify no fake counters remain
  - (b) Add MVRV/NUPL approximation disclaimer to cycle dashboard (`lib/cycle-monitor.ts`, `app/dashboard/page.tsx`)
  - (c) Label agent `compute`/`data` endpoints as demo-only in any visible pricing (`app/api/agent/route.ts`)

---

### Phase 5 MVP — Merchant payment node

#### 5.1 — Local Auth Tokens

- [ ] **T08** Implement scoped merchant macaroons
  - Files: new `lib/merchant-auth.ts`, update `lib/lightning-agent.ts`
  - Generate `arx_live_` (full access) and `arx_pub_` (invoice-only) macaroons on merchant setup
  - `arx_pub_` CANNOT authorize payments or read balances — safe for client-side embedding
  - `arx_test_` routes to regtest (sandbox mode)
  - Rotation: `arxmint keys rotate` generates new tokens, invalidates old with zero downtime
  - Revocation: compromised tokens revocable via dashboard or CLI
  - Spec: §10 item 5.1 — permission tests, rotation tests, sandbox routing
  - Test: `arx_pub_` blocked from pay/balance endpoints. Old token rejected after rotation.

#### 5.2 — Webhook Engine

- [ ] **T09** Build webhook engine
  - Files: new `lib/webhook-engine.ts`, new `app/api/v1/webhooks/route.ts`
  - Watch LND for invoice settlements. Fire `payment.completed` within 5 seconds.
  - HMAC-SHA256 signed payloads. Exponential retry (5 attempts). Delivery log queryable.
  - Merchant configures webhook URL via dashboard or CLI.
  - Spec: §10 item 5.2 — end-to-end test: create invoice → pay → webhook fires with valid signature
  - Test: Block endpoint → verify 5 retries with backoff. Same event not delivered twice (idempotency).

#### 5.3 — Self-Hosted Checkout

- [ ] **T10** Promote checkout prototype to self-hosted checkout
  - Files: extend existing `app/api/checkout/route.ts`, `app/api/checkout/status/[id]/route.ts`, `app/pay/[merchant-id]/page.tsx`, `components/checkout-flow.tsx`; add `/api/v1/checkout` only if needed for versioned external integrations
  - Current state: public prototype exists, but it is still centralized, Lightning-only, poll-based, and can fall back to demo invoices.
  - Target state: checkout served from merchant's own domain, invoice generated by merchant's own LND node, Cashu/NUT-26 support added, no pilot-path demo fallback, SSE or equivalent real-time updates, auto-redirect on completion.
  - Spec: §10 item 5.3 — verify invoice pubkey matches merchant node identity
  - Test: Full payment flow from external wallet (Phoenix/Zeus/Breez). Settlement updates in real time.

#### 5.4 — Payment Status API

- [ ] **T11** Upgrade prototype status polling into merchant payment status APIs
  - Files: extend `app/api/checkout/status/[id]/route.ts`; add `app/api/v1/payments/[id]/route.ts` and `app/api/v1/payments/route.ts`
  - Current state: a single-session polling endpoint already exists for checkout prototype sessions.
  - Target state: deterministic states (`pending` → `completed` | `expired` | `failed`), cursor-paginated history, merchant-local API shape, SSE `status_changed` stream, and no backwards state transitions.
  - Spec: §10 item 5.4 — API integration test through all states
  - Test: Create payment → progress through states → verify payload. Unknown IDs return proper error.

#### 5.5 — Client SDK

- [ ] **T12** Build `@arxmint/js` client SDK
  - Files: new `packages/js/` directory (or `lib/sdk/`)
  - Creates checkout session against merchant's own endpoint (NOT arxmint.com)
  - Mounts payment UI (QR code, status, callbacks)
  - `completed` callback fires on settlement
  - Reuse current checkout concepts and Teneo merchant prototype flows; do not invent a second payment model.
  - Compatible with Teneo Marketplace stub: exports `createL402Invoice()`, `verifyL402Payment()`, `acceptCashuToken()`
  - < 15KB bundled
  - Spec: §10 item 5.5 — no requests to arxmint.com during payment flow
  - Test: SDK → merchant node → payment → callback. Teneo stub interface compatibility.

- [ ] **T13** Build `@arxmint/react` components
  - Files: new `packages/react/` directory (or `lib/sdk/react/`)
  - `<PayButton>` — renders pay button, opens checkout on click
  - `<CheckoutForm>` — inline checkout with QR + status
  - `<QRPayment>` — standalone QR display with SSE status
  - All connect to merchant's own endpoint
  - Test: Components render, complete payment flow in test harness.

#### 5.6 — LNURL-pay + Lightning Address

- [ ] **T14** Implement LNURL-pay endpoints
  - Files: new `app/.well-known/lnurlp/[username]/route.ts`
  - `/.well-known/lnurlp/:username` resolves from merchant's domain
  - Generates valid BOLT11 from merchant's own LND node
  - Lightning Address format: `merchant@pay.merchant.com`
  - Static QR code generation for POS
  - Spec: §10 item 5.6 — LNURL metadata validation (spec compliance)
  - Test: Payable from 3+ external LNURL-compatible wallets. Static QR scan-and-pay.

#### 5.7 — Merchant Dashboard

- [ ] **T15** Build merchant dashboard
  - Files: new `app/merchant/page.tsx`, new `app/merchant/` directory
  - Current state: `/merchant` is just a redirect to `/merchants`; no self-hosted dashboard exists yet.
  - Tabs: Payments | Analytics | Webhooks | API Keys | Node Status
  - Traffic-light health: green/yellow/red with plain-language diagnoses
  - Payments list with filters and CSV export
  - Auth token management (create, rotate, revoke)
  - Webhook delivery log
  - Node status: "max instant payment size" (not raw channel data), sync status, uptime
  - Push notifications for wallet unlock (non-custodial — secret goes to node, never ArxMint)
  - Spec: §10 item 5.7 — health indicators reflect actual node state
  - Test: Mock degraded LND → dashboard shows yellow/red. CSV export matches displayed data. Dashboard requires admin macaroon.

#### 5.8 — One-Command Merchant Deploy

- [ ] **T16** Finish merchant init wizard from beta UX to real deploy path
  - Files: extend `components/merchant-setup-wizard.tsx`, add `scripts/merchant-init.sh` or Node CLI, update `lib/community-generator.ts`
  - Current state: `/create` already has the right merchant-first wizard shell, but it stops at beta/coming-soon and does not yet provision or export a real merchant init path.
  - Target flow: "Where to run?" (cloud/home/advanced) → "Store name?" → "Online or in-person?" → generates merchant-specific stack or calls provisioning path.
  - Generates merchant-specific Docker Compose (LND Neutrino + Cashu mint + checkout + dashboard + Caddy)
  - Managed subdomain: `storename.arxmint.cloud`
  - Auto-HTTPS via Caddy
  - Firewall rules generated (block all inbound except 80/443/9735)
  - Spec: §10 item 5.8 — running node with managed subdomain + HTTPS in < 15 min
  - Test: End-to-end deploy on fresh VPS. Health check passes. Time-to-first-payment measured.

- [ ] **T17** LSP liquidity bootstrap
  - Files: update Docker Compose, new `lib/lsp-bootstrap.ts`
  - JIT channel opening on first inbound payment via LSP integration
  - Present as "max instant payment size" with one-tap "increase limit" in dashboard
  - Turbo channels (zero-conf) for instant onboarding with clear risk language
  - Spec: §10 item 5.8c — regtest test with mock LSP
  - Test: Create merchant node → send inbound payment → verify channel opened and payment received.

- [ ] **T18** Managed DNS + connectivity
  - Files: new `lib/managed-dns.ts`, update merchant init wizard
  - Default: `storename.arxmint.cloud` pointing to merchant node
  - DynDNS HTTPS API for dynamic IP nodes (node discovers IP, authenticates, updates A/AAAA record)
  - Cloudflare Tunnel as default connectivity (outbound-only, eliminates CG-NAT/firewall/dynamic IP)
  - Caddy direct mode for static IP VPS
  - Spec: §4.1 connectivity model + managed DNS section
  - Test: DNS resolves to node. Tunnel establishes. Checkout reachable from public internet.

---

### Post-MVP — Ship after merchant flow works end-to-end

- [ ] **T19** Idempotency + production hardening (Spec §10 item 5.10)
  - `Idempotency-Key` header on all payment endpoints. Structured error codes. Rate limiting on merchant API.

- [ ] **T20** Stack update engine (Spec §10 item 5.11a)
  - Signed stack BOMs. Maintenance window application. Auto-rollback on failed health check. Canary rings.

- [ ] **T21** Zero-knowledge encrypted backups (Spec §10 item 5.11b)
  - LND SCB event-driven. Cashu DB encrypted with seed-derived key. Automated restore rehearsal.

- [ ] **T22** One-click restore (Spec §10 item 5.11c)
  - Fresh host → seed phrase → derive key → fetch encrypted backup → restore. Post-restore health checks.

- [ ] **T23** Umbrel + StartOS packaging (Roadmap 5.12)
  - Package merchant stack for Umbrel app store (Docker Compose maps directly). StartOS as secondary.

- [ ] **T24** Graduate public merchant directory from live prototype to production directory (Roadmap 5.9)
  - Current state: `/merchants` is already live with seed merchants, pipeline view, signup form, checkout links, and badge CTA.
  - Add category/location search, self-registration or CLI activation flow, referral attribution, merchant activation workflow after first real transaction, and clearer public/live vs pipeline semantics.

- [ ] **T25** Mobile remote control (Roadmap 5.13)
  - PWA dashboard first (5.7 covers 80%). React Native POS + remote dashboard later.

---

## Current Snapshot

**Synced:** 2026-03-06
**Recent merchant push shipped:** Teneo seed merchant, admin-only pipeline merchants with Nostr auth, checkout prototype, merchant badge/kit, merchant-first `/create` beta wizard, NUC deployment docs/status updates.
**Reality check:** `npm run build` passes; `npm test` passes (230 pass / 3 skip); first real NUC testnet payment is still not verified.
