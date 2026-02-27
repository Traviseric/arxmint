# ArxMint — Research Cross-Reference Matrix

**Version:** 1.1 — February 27, 2026
**Purpose:** Maps all 7 research documents to spec sections, implementation files, and identifies gaps + required actions.
**Canonical spec reference:** `docs/spec.md` (all `Spec §X` citations in this matrix point there).
**Citation policy:** `docs/research-citation-policy.md`
**Current tracked gaps:** 36

---

## Master Cross-Reference Matrix

### Legend

- **Status:** `DONE` = implemented | `PARTIAL` = started but incomplete | `GAP` = not implemented | `WRONG` = implemented incorrectly
- **Priority:** `P0` = security-critical | `P1` = core architecture | `P2` = important feature | `P3` = enhancement
- **Phase:** References the roadmap phases in `docs/roadmap.md`

---

## Doc 1: Fedimint Deep Research (v0.10.0 "Lighthouse")

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| SDK is CLIENT-only (joins federations, doesn't create them) | Spec §4 Technical Architecture | `lib/fedimint-sdk.ts` | DONE | — | Correctly implemented. No change needed. |
| Federation creation requires `fedimintd` Docker nodes | Spec §4 Technical Architecture | `docker-compose.yml` | DONE | — | 3-guardian Docker stack exists. |
| WASM lazy-loading for SSR avoidance | Spec §4 Backend | `lib/fedimint-sdk.ts` | DONE | — | Dynamic imports working. |
| ConnectorRegistry for transport plurality (v0.10.0) | Not in spec | `lib/fedimint-sdk.ts` | GAP | P2 | Register Iroh/WebSocket/TCP transports explicitly. Currently relies on defaults. |
| G-Bot Federation Setup Service | Spec §1 "via G-Bot API or guided multi-guardian setup" | `lib/community-generator.ts` | GAP | P1 | Spec references G-Bot but implementation generates raw Docker config. Should integrate G-Bot API for guided federation bootstrap. |
| Community Generator (Jan 2026 Fedimint release) | Spec §1 Feature 1 | `lib/community-generator.ts` | PARTIAL | P1 | Our NL parser works but doesn't align with Fedimint's official Community Generator patterns. Should use as upstream reference. |
| Gateway UI via Iroh networking | Not in spec | Not implemented | GAP | P3 | Fedimint v0.10.0 uses Iroh for gateway discovery. Add to Docker stack config. |
| Agent wallet pattern (ecash as bearer value) | Spec §1 Feature 2 | `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts` | GAP | P1 | No ephemeral/agent-specific wallet mode. Agents should get scoped ecash wallets that auto-expire. |
| No Silent Payments in Fedimint SDK | Spec §3 Feature 3 | `lib/privacy-defaults.ts` | WRONG | P0 | Privacy dashboard implies SP works with Fedimint. It doesn't — requires server-side federation module. Must fix status indicators. |
| Fedimint v0.5.0 → v0.10.0 upgrade | Spec §4 | `docker-compose.yml` | GAP | P2 | Docker uses `fedimintd:v0.5.0`. Should upgrade to `v0.10.0` ("Lighthouse"). |

---

## Doc 2: Lightning Labs AI Agent Tooling (Feb 2026)

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| 7 composable skills (lnd, remote signer, macaroon bakery, lnget, aperture, MCP, commerce) | Spec §3 Feature 2 | `lib/lightning-agent.ts`, `.mcp.json` | PARTIAL | P1 | MCP + aperture + basic LNC implemented. Missing: remote signer, macaroon bakery, lnget, commerce meta-skill. |
| 18 read-only MCP tools | Spec §3 Feature 2 | `.mcp.json` | DONE | — | MCP server config references the right package. |
| 3-tier security model (watch-only → pay-only → admin) | Not in spec | `lib/lightning-agent.ts` | GAP | P0 | Current implementation gives agents full LNC access. Must implement tiered access: watch-only default, pay-only via remote signer, admin explicitly warned against. |
| Remote signer key isolation | Not in spec | Not implemented | GAP | P0 | Agent processes should NEVER hold signing keys. Must add `litd` remote signer integration. |
| Macaroon bakery (baked scoped credentials) | Spec §3 Feature 2 mentions "scoped macaroons" | `lib/lightning-agent.ts` | GAP | P1 | No macaroon generation code. Should expose `bakeMacaroon()` with role-specific permissions. |
| `lnget` CLI for automated L402 purchasing | Spec §3 Feature 2 mentions "lnget client" | `lib/lightning-agent.ts` | PARTIAL | P2 | `l402Fetch()` implements the pattern but not via official `lnget`. Should wrap or reference `lnget`. |
| Aperture L402 reverse proxy | Spec §3 Feature 2 | `docker/aperture.yml`, `docker-compose.yml` | DONE | — | Aperture config exists with 4 gated services. |
| L402 protocol anatomy (402 → WWW-Authenticate → pay → preimage → retry) | Spec §5 Flow B | `lib/lightning-agent.ts`, `app/api/l402/route.ts` | DONE | — | Full flow implemented in `l402Fetch()` and demo endpoint. |
| Fedimint gateway preimage compatibility with L402 | Not in spec | Not implemented | GAP | P2 | L402 preimage from Lightning invoice can be routed through Fedimint gateway. Enables ecash-funded L402 payments. |
| Cashu NUT-05/NUT-08 payment_preimage on melts | Not in spec | `lib/cashu-sdk.ts` | DONE | — | Fixed to `result.quote.payment_preimage`. |

---

## Doc 3: Cashu Protocol Deep Research

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| cashu-ts v3 API (Wallet class, mint/melt) | Spec §3 Feature — Cashu Mint Fallback | `lib/cashu-sdk.ts` | DONE | — | Correct v3 API usage. |
| NUT-24 HTTP 402 (native Cashu paywalls) | Not in spec | Not implemented | GAP | P1 | Cashu has its OWN 402 spec separate from Lightning L402. Agent marketplace should accept both Lightning L402 AND Cashu NUT-24 token payments. |
| NUT-26 Bech32m TLV payment requests | Not in spec | Not implemented | GAP | P2 | Wallet panel generates plain text tokens. Should use `cashu:` URI format for QR codes and NFC. |
| NUT-18 payment request format | Not in spec | Not implemented | GAP | P2 | Structured payment requests for merchant flows. |
| NUT-28 P2BK (Pay-to-Blind-Key) | Not in spec | Not implemented | GAP | P3 | Privacy upgrade for spending conditions. Future enhancement. |
| CDK cloud-native (Postgres, Prometheus, K8s) | Not in spec | `docker-compose.yml` uses basic Nutshell | GAP | P2 | Upgrade from Nutshell to CDK for production. Add Prometheus metrics, structured logging, deployment profiles. |
| Coco toolkit (multi-mint management) | Not in spec | `lib/cashu-sdk.ts` (single-mint only) | GAP | P2 | No multi-mint support. Coco enables managed balances across mints and multi-mint payments. Critical for inter-community commerce. |
| Numo NFC tap-to-pay PoS | Not in spec (merchant directory is placeholder) | Not implemented | GAP | P3 | Reference Numo for merchant in-person payments. Integration point for merchant directory. |
| Proof state checking (NUT-07) | Spec implies wallet manages proofs | `lib/cashu-sdk.ts` has `checkProofs()` | PARTIAL | P2 | Method exists but no periodic background verification. Proofs could be stale/double-spent without active checking. |

---

## Doc 4: Ark Protocol and Arkade

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| VTXOs (virtual UTXOs) for off-chain private transfers | Spec §3 Feature 3 — Ark spends | `lib/privacy-defaults.ts` | PARTIAL | P2 | Type system includes `arkSpends: boolean` but no actual SDK integration. |
| `@arkade-os/sdk` TypeScript SDK | Spec §4 references "Arkade SDK" | Not implemented | GAP | P2 | Need `SovereignArkClient` wrapper similar to Fedimint/Cashu clients. |
| Hybrid bridge pattern (Ark → on-chain → eCash mint) | Not in spec | Not implemented | GAP | P2 | Maximum privacy flow. Ark VTXOs → on-chain → deposit into ecash mint. Should be "privacy maximum" preset. |
| Spend router (selects ecash/LN/Ark/on-chain by amount + privacy) | Not in spec | Not implemented | GAP | P1 | Doc 4 provides pseudocode. Wallet panel has no routing logic — user manually chooses. Should auto-select optimal path. |
| arkd v0.9.0-rc.3 Docker service | Not in spec | Not in `docker-compose.yml` | GAP | P2 | No Ark service in Docker stack. Should add `arkd` container for communities enabling Ark. |
| Covenant-less variant (clArk) | Not in spec | Not implemented | GAP | P3 | Alternative Ark implementation without covenants. Track for future. |
| Ark VTXOs in wallet balance | Spec types include `WalletBalance` | `lib/store.ts`, `lib/types.ts` | GAP | P2 | `WalletBalance` type has no `arkSats` field. Should add Ark balance tracking. |

---

## Doc 5: BIP352 Silent Payments

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| BIP352 Status: Complete, v1.0.2 | Spec §3 Feature 3 | `lib/privacy-defaults.ts` | PARTIAL | — | Listed as privacy layer but maturity status needs update. |
| Fedimint SP requires server-side module (NOT client toggle) | Spec §3 Feature 3 implies SP works everywhere | `lib/privacy-defaults.ts` | WRONG | P0 | Privacy dashboard shows SP as configurable per-backend. For Fedimint peg-outs, SP requires federation wallet module changes. Must show honest per-backend status. |
| Cashu SP is wallet-layer (implementable) | Not differentiated in spec | `lib/cashu-sdk.ts` | GAP | P2 | For on-chain sends via Cashu wallet, SP address parsing is wallet-side work. Add `sp1q` address support. |
| `@silent-pay/core` + `@silent-pay/wallet` TypeScript packages | Not in spec | Not in `package.json` | GAP | P2 | Pre-alpha but functional. Add as optional dependency for SP sending. |
| Scanning infrastructure (indexer required for receiving) | Not in spec | Not in Docker stack | GAP | P2 | Receiving SPs requires `silent-pay-indexer` or `silentiumd`. Add to Docker compose for full SP support. |
| Feature flags (`ARXMINT_SP_ENABLED`, `ARXMINT_SP_SCAN_MODE`, etc.) | Not in spec | `.env.example` | PARTIAL | P2 | Env flags are now standardized in `.env.example`; remaining work is wiring these flags into runtime behavior. |
| K_max scanning limit (Feb 2026 proposal) | Not in spec | Not implemented | GAP | P3 | Future constraint. Design APIs to enforce configurable caps. |
| BIP392 descriptors + BIP376 PSBT spending | Not in spec | Not implemented | GAP | P3 | Needed for hardware wallet support and recovery. Future phase. |
| Scan key delegation (scan/spend separation) | Not in spec | Not implemented | GAP | P2 | Mobile wallets need scan key on hot device, spend key cold. Important for security. |

---

## Doc 6: Federated Chaumian eCash and Agent-Native Commerce

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| L402 as THE agent commerce standard | Spec §3 Feature 2 | `lib/lightning-agent.ts`, `app/api/agent/route.ts` | DONE | — | Correctly implemented as core pattern. |
| Cashu NUT-13 vulnerability (keyset ID collision → theft) | Not in spec | `lib/cashu-sdk.ts` | GAP | P0 | **SECURITY-CRITICAL.** Our cashu-sdk does NOT validate keyset IDs against mint pubkeys. Must add: (1) keyset ID verification, (2) anti-collision checks, (3) safe restore semantics. Agent wallets amplify this risk. |
| STARK/Cairo programmable spending conditions (NUT-XX) | Not in spec | Not implemented | GAP | P3 | Programmable eCash enables conditional agent payments (escrow, subscriptions, proof-of-service). Future enhancement. |
| ZK verified reissuance (stateless agent wallets) | Not in spec | Not implemented | GAP | P2 | Paper argues agent wallets should be ephemeral ("transaction independence"). Our localStorage proof storage is a compromise risk. |
| ProxyGPT circular economy pattern | Validates spec §1 concept | N/A (validation) | DONE | — | Directly validates our human↔agent circular economy model. |
| CTV+CSFS for Ark non-interactive receive | Not in spec | Not implemented | GAP | P3 | Depends on Bitcoin soft fork. Track but don't implement. |
| Agent wallet safety requirements (mint identity verification, anti-collision, safe restore) | Not in spec | `lib/cashu-sdk.ts` | GAP | P0 | Must treat as hard security requirements for any agent holding ecash. |

---

## Doc 7: Bitcoin Circular Economies

| Research Finding | Spec Section | Implementation File | Status | Priority | Action Required |
|---|---|---|---|---|---|
| FBCE grant program (Round 1: 50M sats, Round 2: 42 BCEs in 19 countries) | Spec §7 Monetization — mentions grants | Not in code | PARTIAL | P2 | Spec references grants. Need structured grant application templates as a feature or doc. |
| OpenSats Wave 16 funding CDK, cashu-ts/Coco, Nutshell | Spec §4 Core Integrations | `package.json` | PARTIAL | P2 | We use cashu-ts but not CDK or Coco. Track upstream releases. |
| BCE maturity metrics (merchant count, MAU, spend velocity, payment success rate) | Not in spec | Not in dashboard | GAP | P1 | Dashboard shows privacy score and cycle signals but no BCE health metrics. Add community KPI tracking. |
| KPI framework for circular economies | Spec §9 Success Metrics (basic) | Not implemented | GAP | P1 | Spec has high-level metrics (10 communities, 5 agents, 0.5 BTC/month). Need per-community operational KPIs in the dashboard. |
| Grant application template (tailored to ArxMint) | Not in codebase | Not implemented | GAP | P2 | Doc 7 provides a complete template. Should be a built-in export from the dashboard or a doc. |
| Indonesia deployment (10-20k users, Fedi + Bitcoin Indonesia) | Validates spec concept | N/A (validation) | DONE | — | Proves the model at scale. Reference in pitch materials. |
| Fedimint "second-party trust" and guardian governance | Spec §3 Feature 1 | `lib/community-generator.ts` | PARTIAL | P2 | Generator creates guardian configs but no governance framework (rotation, incident response, quorum policy). |
| Monitoring/observability (Prometheus, Grafana) | Not in spec | Not in Docker stack | GAP | P2 | CDK and OpenSats both emphasize operator-grade monitoring. Add Prometheus + Grafana to Docker stack. |
| Merchant onboarding workflow | Spec §3 Feature 4 mentions "directory" | `app/community/[id]/page.tsx` (placeholder) | GAP | P1 | Just a "List Your Business" button. Need actual onboarding flow: business info, QR generation, POS setup guidance. |
| Reporting structure (monthly progress, KPI snapshots, budget tracking) | Not in spec | Not implemented | GAP | P3 | For grant compliance. Built-in reporting export from dashboard. |

---

## Gap Summary by Priority

### P0 — Security-Critical (Fix Immediately)

| # | Gap | Source Doc | File to Fix |
|---|---|---|---|
| 1 | Cashu keyset ID validation missing (NUT-13 collision vulnerability) | Doc 6 | `lib/cashu-sdk.ts` |
| 2 | Silent Payments status misrepresented for Fedimint (requires server-side module, not client toggle) | Doc 1, Doc 5 | `lib/privacy-defaults.ts` |
| 3 | No tiered security model for Lightning agent access (agents get full LNC access) | Doc 2 | `lib/lightning-agent.ts` |
| 4 | No remote signer key isolation (agents hold signing keys) | Doc 2 | `lib/lightning-agent.ts` |

### P1 — Core Architecture (Next Sprint)

| # | Gap | Source Doc | File to Fix |
|---|---|---|---|
| 5 | No NUT-24 HTTP 402 support (ecash-native paywalls alongside Lightning L402) | Doc 3 | New: `lib/cashu-paywall.ts`, `app/api/agent/route.ts` |
| 6 | No spend router (auto-select ecash/LN/Ark/on-chain by amount + privacy) | Doc 4 | New: `lib/spend-router.ts`, `components/wallet-panel.tsx` |
| 7 | No BCE maturity metrics in dashboard | Doc 7 | `app/dashboard/page.tsx`, New: `lib/bce-metrics.ts` |
| 8 | No merchant onboarding workflow | Doc 7 | `app/community/[id]/page.tsx` |
| 9 | G-Bot integration for federation bootstrap | Doc 1 | `lib/community-generator.ts` |
| 10 | Macaroon bakery for scoped agent credentials | Doc 2 | `lib/lightning-agent.ts` |
| 11 | Agent wallet pattern (ephemeral, scoped ecash wallets) | Doc 1, Doc 6 | `lib/fedimint-sdk.ts`, `lib/cashu-sdk.ts` |

### P2 — Important Features (Following Sprints)

| # | Gap | Source Doc | File to Fix |
|---|---|---|---|
| 12 | Fedimint Docker v0.5.0 → v0.10.0 upgrade | Doc 1 | `docker-compose.yml` |
| 13 | ConnectorRegistry transport config | Doc 1 | `lib/fedimint-sdk.ts` |
| 14 | NUT-26 Bech32m TLV for QR/NFC | Doc 3 | `lib/cashu-sdk.ts` |
| 15 | NUT-18 payment request format | Doc 3 | `lib/cashu-sdk.ts` |
| 16 | CDK cloud-native upgrade (Nutshell → CDK) | Doc 3 | `docker-compose.yml` |
| 17 | Coco multi-mint management | Doc 3 | `lib/cashu-sdk.ts` |
| 18 | Ark SDK integration (`@arkade-os/sdk`) | Doc 4 | New: `lib/ark-sdk.ts` |
| 19 | Ark VTXOs in wallet balance + Docker service | Doc 4 | `lib/types.ts`, `lib/store.ts`, `docker-compose.yml` |
| 20 | SP indexer in Docker stack | Doc 5 | `docker-compose.yml` |
| 21 | Wire SP feature flags from `.env.example` into runtime behavior | Doc 5 | `.env.example`, SP runtime modules |
| 22 | Fedimint gateway → L402 preimage bridge | Doc 2 | `lib/fedimint-sdk.ts`, `lib/lightning-agent.ts` |
| 23 | ZK verified reissuance / ephemeral proof handling | Doc 6 | `lib/cashu-sdk.ts` |
| 24 | Prometheus + Grafana monitoring stack | Doc 3, Doc 7 | `docker-compose.yml` |
| 25 | Guardian governance framework | Doc 7 | `lib/community-generator.ts` |
| 26 | Grant application templates | Doc 7 | New: `docs/grant-template.md` |
| 27 | Proof state background verification | Doc 3 | `lib/cashu-sdk.ts` |
| 28 | Scan key delegation for mobile SP | Doc 5 | Future |

### P3 — Enhancements (Future)

| # | Gap | Source Doc |
|---|---|---|
| 29 | STARK/Cairo programmable spending conditions | Doc 6 |
| 30 | CTV+CSFS tracking for Ark non-interactive receive | Doc 6 |
| 31 | NUT-28 P2BK privacy upgrade | Doc 3 |
| 32 | K_max scanning limit design | Doc 5 |
| 33 | BIP392/BIP376 descriptor + PSBT support | Doc 5 |
| 34 | Numo NFC tap-to-pay merchant integration | Doc 3 |
| 35 | clArk covenant-less Ark variant | Doc 4 |
| 36 | Reporting/export for grant compliance | Doc 7 |

---

## Cross-Reference: Research Docs → Existing Spec Sections

| Research Doc | Spec §1 Overview | Spec §2 Users | Spec §3 Features | Spec §4 Architecture | Spec §5 User Flows | Spec §7 Monetization | Spec §8 Pilot | Spec §9 Metrics |
|---|---|---|---|---|---|---|---|---|
| Doc 1: Fedimint | Validates | — | Updates F1, F3 | Updates stack versions | Updates Flow A | — | — | — |
| Doc 2: Lightning Agent | Validates | Updates User 2 | Updates F2 (security model) | Updates security arch | Updates Flow B | — | — | — |
| Doc 3: Cashu | Validates | — | Adds NUT-24, NUT-26 | Updates Docker (CDK) | — | — | — | — |
| Doc 4: Ark | Validates | — | Updates F3 (Ark SDK) | Adds Ark Docker, spend router | Adds Flow D (routed spend) | — | — | — |
| Doc 5: Silent Payments | Corrects F3 | — | Corrects SP status | Adds indexer infra | — | — | — | — |
| Doc 6: eCash + Agent Commerce | Validates | Adds agent safety | Adds NUT-13 security | — | — | — | — | — |
| Doc 7: Circular Economies | Validates | Updates User 1, 3 | Adds BCE metrics, merchant flow | Adds monitoring | — | Validates grants | Updates pilot plan | Major updates |

---

## Cross-Reference: Research Docs → Implementation Files

| Implementation File | Doc 1 | Doc 2 | Doc 3 | Doc 4 | Doc 5 | Doc 6 | Doc 7 |
|---|---|---|---|---|---|---|---|
| `lib/fedimint-sdk.ts` | ConnectorRegistry, agent wallets | Gateway preimage | — | — | — | Ephemeral wallets | — |
| `lib/cashu-sdk.ts` | — | — | NUT-24, NUT-26, Coco, proofs | — | — | **NUT-13 security fix** | — |
| `lib/lightning-agent.ts` | — | **3-tier security, remote signer, macaroon bakery** | — | — | — | — | — |
| `lib/privacy-defaults.ts` | **Fix SP/Fedimint status** | — | — | Ark status update | **Fix SP maturity per-backend** | — | — |
| `lib/community-generator.ts` | G-Bot, Community Generator | — | — | — | — | — | Guardian governance |
| `lib/store.ts` | — | — | — | Add `arkSats` | — | — | Add BCE metrics |
| `lib/types.ts` | — | Security tier types | NUT-24 types | `arkSats` in WalletBalance | SP config types | Agent wallet types | BCE metric types |
| `lib/cycle-monitor.ts` | — | — | — | — | — | — | — |
| `app/dashboard/page.tsx` | — | — | — | — | — | — | **BCE metrics panel** |
| `app/community/[id]/page.tsx` | — | — | — | — | — | — | **Merchant onboarding** |
| `app/api/agent/route.ts` | — | — | Add NUT-24 402 | — | — | — | — |
| `docker-compose.yml` | **Upgrade Fedimint v0.10.0** | — | **CDK upgrade** | **Add arkd** | **Add SP indexer** | — | **Add Prometheus/Grafana** |
| `.env.example` | — | — | — | — | **SP feature flags** | — | — |
| `components/wallet-panel.tsx` | — | — | NUT-26 QR | Spend router UI | — | — | — |

---

## Validation Summary

### What the Research CONFIRMS We Got Right

1. **L402 as agent commerce standard** — Docs 2, 6 confirm this is THE pattern. Our full implementation is correct.
2. **Fedimint SDK is client-only** — Doc 1 confirms. Our architecture correctly separates client SDK from Docker-based federation creation.
3. **cashu-ts v3 API** — Doc 3 confirms. Our Wallet class usage, mint/melt flows, and preimage access path are correct.
4. **Prompt-driven community creation** — Docs 1, 7 validate this approach. Fedimint's own Community Generator (Jan 2026) and FBCE grant patterns confirm demand.
5. **Human + Agent convergence on same rails** — Docs 2, 6 (ProxyGPT) validate this unique positioning. No competitor does this.
6. **Circular economy model** — Doc 7 (FBCE grants, Bitcoin Beach, Indonesia) confirms the model works and is funded.
7. **Privacy-by-default philosophy** — All 7 docs support this. The privacy dashboard concept is validated.
8. **Cycle monitoring** — Doc 7 (BCE patterns) confirms "cycle-aware" communities make better economic decisions.

### What the Research Says We Got WRONG

1. **Silent Payments availability** — Docs 1, 5 say SP for Fedimint requires server-side module, NOT a client toggle. Our dashboard overpromises.
2. **Agent security model** — Doc 2 says agents should NEVER get admin access. Our implementation gives full LNC access.
3. **Cashu wallet safety** — Doc 6 reveals NUT-13 keyset ID collision vulnerability. Our SDK doesn't validate keyset IDs.
4. **Fedimint version** — Doc 1 says v0.10.0 is current. Our Docker uses v0.5.0.
