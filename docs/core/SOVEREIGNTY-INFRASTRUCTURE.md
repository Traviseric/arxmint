# ArxMint — Sovereignty Infrastructure Audit

**Date:** 2026-06-30
**Status:** Living document — updated as gaps close.
**Audience:** Contributors building on or extending ArxMint's self-custodial infrastructure.

---

## What "Sovereign" Means Here

ArxMint provides **protocol-level sovereignty** — not platform sovereignty. Users own their keys, run their own nodes, join (or create) their own federations, and transact without custodial intermediaries. The architecture enforces this structurally:

- **Self-custodial ecash** — users run their own Cashu mint or join a Fedimint federation. No bank, no stablecoin issuer, no Lightning custodian.
- **Privacy-first defaults** — ecash (40 base privacy points) + Silent Payments (+15) as standard. No KYC. Nostr identity, not Google/OAuth.
- **Agent autonomy** — software agents pay each other via L402 or Cashu NUT-24 with budget-enforced wallets. No platform takes a cut.
- **Economic sovereignty** — communities run their own circular economy (merchants, bazaar, escrow, grants) settling natively in BTC.

---

## Infrastructure Gaps (Ranked by Impact)

### Tier 1 — Ship-Killers

These close the gap between "generates a config file" and "creates a live sovereign economy."

#### 1. Federation Bootstrapping Automation

**Current state:** `community-generator.ts` produces valid Docker Compose YAML but `setupFederation()` requires manual guardian coordination. The G-Bot Fedimint coordination API is scaffolded (`setupViaGBot` at `lib/community-generator.ts:1158`) but disabled behind `GBOT_ENABLED` env var. DKG ceremony is only instructional text.

**What's needed:** Automated guardian discovery + DKG ceremony coordination. A community of 3-7 guardians should be able to run a single coordinator command and emerge with a live federation, shared configs, and a running mint — no manual key exchange required.

**Scaffolded code:** `GuardianProfile`, `GovernanceConfig`, `RotationPolicy`, `QuorumPolicy`, `TreasuryPolicy`, `setupFederation()` — all in `lib/community-generator.ts:742-1200`.

#### 2. Agent Identity + Reputation

**Current state:** `lib/identity.ts` has a working Supabase-backed identity alias graph (`linkIdentity`, `resolveIdentity`, `unlinkIdentity`, `autoLinkCheckoutIdentity`) that links Nostr pubkeys, teneo-auth user IDs, and other namespaces to a unified root identity. But there is no trust layer on top — no reputation scoring, no payment history aggregation, no Web-of-Trust.

**What's needed:** A reputation engine that scores agent trustworthiness from on-chain/Lightning payment completions, escrow dispute history, and account age. Agents and merchants query reputation before accepting payments or fulfilling orders.

**Scaffolded code:** Identity graph is complete. Missing: trust scoring algorithm, payment history aggregation, reputation query API.

#### 3. Cross-Mint Atomic Swaps

**Current state:** `lib/cashu-sdk.ts` contains a full `MultiMintManager` class with `crossMintSend()` via Lightning bridge, `AtomicSwapRequest`/`AtomicSwapResult` types, and `executeAtomicSwap()`. The implementation uses Lightning as the atomic bridge — melt source proof, pay invoice, mint on destination. But it's not wired to any user-facing path or API endpoint.

**What's needed:** Expose atomic swaps via the agent API. A Fedimint user should be able to send value to a Cashu user (or vice versa) through a single agent command. This makes sovereign economies interoperable rather than siloed.

**Scaffolded code:** `lib/cashu-sdk.ts:1191-1340`, `lib/ark-sdk.ts:215` (Ark bridge), `lib/lightning-agent.ts` (LNC client for routing).

---

### Tier 2 — Power Multipliers

#### 4. Hardware Appliance Packaging

**Current state:** Docker Compose is the only deployment path. A HARDWARE_PRODUCT.md exists in the private internal repo, but no appliance-specific code ships in the public repo.

**What's needed:** One-click install packages for Umbrel, Start9, and Raspiblitz. A NUC image that ships pre-configured. This is the difference between "developers run this" and "communities run this."

#### 5. Stable-Value Ecash

**Current state:** Single mention in `docs/core/incentives.md:117` — "BTCPay Prague proved StableSats was the #1 driver of merchant willingness." Zero implementation code.

**What's needed:** A USD-pegged ecash token that merchants can hold without BTC volatility risk. Options: DLC-based synthetic dollar, fiat-backed mint (higher trust), or LN Markets perpetual swap hedged.

#### 6. Social Recovery + Inheritance

**Current state:** No code, no docs, no roadmap mention. Completely absent.

**What's needed:** Guardian-based key recovery with time-locked inheritance. The biggest UX blocker for non-technical users adopting self-custody. A recovery scheme where 3-of-5 designated guardians can restore wallet access after a configurable timeout.

---

### Tier 3 — Protocol-Dependent (Blocked Upstream)

#### 7. ZK Attestations for Mint Reserves

**Current state:** `lib/cashu-sdk.ts` has `CustomScriptCondition` type scaffolded for future STARK/Cairo integration. The evaluator at line 1849 returns "requires mint-side STARK verifier (NUT-XX upstream)." `AuditedAgentWallet` uses SHA-256 hash chains, not ZK proofs.

**Blocked on:** Cashu protocol NUT-XX (ZK proof support in mints).

#### 8. Agent Discovery Protocol

**Current state:** Mentioned in grant templates as "Iroh-based ConnectorRegistry" — zero implementation code. The `packages/agent-commerce/src/merchant.ts` header says "Merchant discovery" but only implements checkout session create/poll/pay.

**What's needed:** A peer-to-peer agent registry where agents announce their service endpoints, prices, and capabilities. Nostr relay-based or Iroh gossip-based. Enables the agent marketplace to function without a centralized directory.

---

## What's Already Real

Not everything is gaps. These sovereignty features are production-grade:

| Feature | File | Status |
|---------|------|--------|
| Dual paywall (L402 + Cashu NUT-24) | `lib/cashu-paywall.ts`, `app/api/l402/route.ts` | Production-ready |
| Lightning agent with remote signer | `lib/lightning-agent.ts` | 3-tier security enforced |
| Agent budget enforcement | `@te-btc/agent-wallet` | BudgetPolicy, VelocityLimiter, CapabilityAllowlist |
| Community Docker generation | `lib/community-generator.ts` | NL prompt → valid deployable YAML |
| Privacy scoring | `lib/privacy-defaults.ts` | Honest backend availability tracking |
| Cycle monitoring | `lib/cycle-monitor.ts` | Real CoinGecko data → MVRV/NUPL signals |
| Network intelligence | `lib/mempool-data.ts` | Live mempool.space data |
| Compute engine | `lib/compute-engine.ts` | Async job queue (hash, verify, merkle) |
| Escrow engine | `lib/escrow.ts` | Full state machine with mediator arbitration |
| Bazaar webhook delivery | `lib/webhook-engine.ts` | HMAC-signed, retry, idempotent |
| Identity alias graph | `lib/identity.ts` | Supabase-backed, multi-namespace |
| Nostr NIP-98 auth | `lib/auth-middleware.ts` | Session HMAC |
| NFC bolt card support | `lib/nfc-bolt-card.ts` | LNURLw + bolt card merchant login |
| Agent Commerce SDK | `packages/agent-commerce/` | L402 auto-pay, merchant checkout, 18 tests |

---

## Build Order Recommendation

1. **Agent reputation** (this session) — foundation for autonomous agent trust, enables dynamic pricing
2. **Cross-mint swaps** — connects sovereign economies, highest protocol ROI
3. **Federation bootstrapping** — closes the prompt-to-deployment gap, ship-killer
4. **Hardware appliance** — unlocks non-technical user adoption
5. **Social recovery** — removes the biggest self-custody adoption barrier