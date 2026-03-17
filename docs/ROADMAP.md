# ArxMint — Roadmap

**Last Updated:** 2026-03-15
**Purpose:** Canonical roadmap for ArxMint sovereign commerce infrastructure.
**Related:** [SOVEREIGN_STACK_ROADMAP.md](../../../.claude/guides/reference/SOVEREIGN_STACK_ROADMAP.md)

---

## Current State

ArxMint is the payment and sovereign commerce layer of the TE Code ecosystem. All phases A-E + 0-2 complete. Production readiness gate pending testnet VPS deployment.

### What's Built
- Fedimint SDK (client WASM, joins existing federations)
- Cashu SDK (v3 API, Nutshell/CDK backends)
- Lightning / LNC (L402 + NUT-24 paywall flows, macaroon baking)
- Privacy layers (BIP-352 Silent Payments, CoinJoin, PayJoin, Ark VTXOs)
- Spend router (ecash → Lightning → Ark → on-chain by amount + privacy score)
- Merchant onboarding + directory
- BCE health metrics + grant-ready export
- Full Docker stack (LND + CDK/Nutshell + Fedimint + Aperture + Prometheus + Grafana)

### Existing Phases
| Phase | Codename | Status |
|-------|----------|--------|
| 0 | Fortify — Security hardening | Complete (remote signer partial) |
| 1 | Keystone — Core architecture | Complete |
| 2 | Spire — Full privacy + commerce | Complete |
| 3 | Aether — Advanced (STARK eCash, ZK, governance) | Experimental |
| 4 | Citadel — Production pilot + grants | Planning (Longmont, CO) |

### Pending
- [ ] Testnet VPS deployment (human task — production readiness gate)
- [ ] Remote signer integration completion
- [ ] Grant submissions (OpenSats, FBCE, Fedi)

---

## Sovereign Stack Integration (SPINE Items)

> **Source:** [SOVEREIGN_STACK_ROADMAP.md](../../../.claude/guides/reference/SOVEREIGN_STACK_ROADMAP.md) — maps TE Code to a 7-layer sovereign institutional stack. ArxMint is **Layer 2: Value Movement** — how value moves without depending on Visa, Stripe, PayPal, banks, or platform rules.

### SPINE-ARX-01: Invoice Primitive [P1]

**Status:** planned
**Depends on:** SPINE-AUTH-01 (org entity in teneo-auth — invoices are org-to-org)
**Unlocks:** FinForensics auto-bookkeeping, OpenBazaar B2B, WorkforceOS payroll

First-class invoice object:
- [ ] Prisma models: `invoices`, `invoice_line_items`
- [ ] Invoice fields: from_org, to_org, line_items[], due_date, currency (BTC/USD), status
- [ ] Invoice states: `draft` → `sent` → `paid` → `overdue` → `void`
- [ ] Payment links: Lightning invoice, Cashu token request, or Stripe checkout URL
- [ ] Webhook on state change (→ FinForensics auto-bookkeeping, → WorkforceOS payroll)
- [ ] PDF generation for traditional business use
- [ ] API routes: `/api/invoices/*`

**Why:** B2B commerce, merchant operations, and bookkeeping all need invoices. WorkforceOS payroll needs invoices. OpenBazaar orders need invoices. FinForensics needs invoice events for automatic journal entries. This is a core value-movement primitive.

### SPINE-ARX-02: Escrow Module [P1]

**Status:** planned
**Depends on:** Existing Cashu/Lightning infrastructure
**Unlocks:** OpenBazaar trustless trade, agent-to-agent commerce, local economy trust

Hold-and-release payment mechanism:
- [ ] New module: `src/escrow/`
- [ ] Create escrow (payer, payee, amount, release_conditions[])
- [ ] Release conditions: manual, time-based, delivery-confirmed, dispute-resolved
- [ ] Dispute flow: either party can raise, resolution by timeout or mediator
- [ ] Cashu-native: ecash tokens locked to escrow contract
- [ ] Lightning-native: HODL invoices for time-locked escrow
- [ ] API routes: `/api/escrow/*`

**Why:** OpenBazaar marketplace cannot do trustless trade without escrow. Agent commerce (agent buys service from another agent) needs programmatic escrow. Local circular economies need trust patterns for strangers transacting.

### SPINE-ARX-03: Merchant Payout Automation [P2]

**Status:** planned
**Depends on:** Existing payment infrastructure
**Unlocks:** Glacier pilot completion, Longmont Citadel pilot, any merchant deployment

Scheduled settlement from arxmint to merchant wallets:
- [ ] New module: `src/payouts/`
- [ ] Configurable payout schedule (daily, weekly, on-threshold)
- [ ] Route selection: ecash → Lightning → on-chain (by merchant preference)
- [ ] Payout receipts (→ FinForensics for bookkeeping)
- [ ] Dashboard visibility in merchant portal
- [ ] Webhook on payout completion

**Why:** A merchant who accepts Bitcoin through arxmint should get paid automatically, not manually sweep. Completes the merchant sovereignty story.

### Sovereign Stack Cross-References

| Layer | System | How ArxMint Connects |
|-------|--------|----------------------|
| L1 Identity | teneo-auth | Org = merchant, agent wallet binding |
| L2 Value | **ArxMint** | Owns payments, invoices, escrow, settlement, ecash |
| L3 Coordination | WorkforceOS | Payroll invoices, labor cost payments |
| L4 Market | openbazaar-ai | Checkout rails, escrow for trustless trade |
| L5 Intelligence | aibridge | Agent commerce SDK (x402/L402), dynamic pricing |
| L5 Intelligence | FinForensics | Payment events → auto-bookkeeping |

---

## Grant Strategy

ArxMint has a credible grant case. Target funders:
- **OpenSats** — open-source Bitcoin infrastructure
- **Spiral** — merchant sovereignty / self-hosted payments
- **HRF** — censorship resistance, privacy, financial freedom
- **FBCE** — circular economy pilots

**Framing:** "An open-source, self-hosted Bitcoin merchant and sovereign commerce stack that reduces custody, improves usability, and expands real-world Bitcoin utility."

See [spine of an alternative stack.md](../../../.claude/guides/reference/spine%20of%20an%20alternative%20stack.md) for full grant positioning analysis.
