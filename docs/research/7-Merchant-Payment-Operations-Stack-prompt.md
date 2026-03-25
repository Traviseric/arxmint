# ArxMint — Deep Research Prompt: Merchant Payment Operations Stack

**Purpose:** Feed this into Gemini Deep Research (or similar) to get concrete recommendations on every decision point needed to take a real merchant (Black Bear Window Cleaning, Boulder CO) from "listed on the directory" to "accepting Bitcoin payments and seeing funds in their wallet."

**Output expected:** A spec-ready document with concrete recommendations, tradeoffs acknowledged, and implementation tasks that can be added to the roadmap for agents to build.

---

## Context: What ArxMint Is

ArxMint is an open-source AI Sovereign Circular Economy Builder — a Next.js 15 web app that lets anyone create private Bitcoin circular economies. It generates Fedimint federations, Cashu mints, Lightning L402 agent commerce rails, and privacy defaults, deployable via Docker.

**Current state (March 2026):**
- Phases A–E (Foundation through Hardening) are code complete
- Phase 4 (Citadel — Longmont pilot) is in progress
- Phase 5 (Bazaar — decentralized Stripe merchant platform) is early prototype
- Production Readiness Gate is pending testnet VPS deployment
- Deployed on Vercel at arxmint.com (frontend only, no Lightning node connected)
- First real merchant signed up: **Black Bear Window Cleaning** (Boulder, CO — 5.0 stars, 15 Google reviews, real business)
- Grant applications submitted/ready for OpenSats ($100K), HRF ($100K), Spiral ($100K-$200K)

**Tech stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Zustand, Supabase (Vercel deployment), Prisma (Docker self-hosted path), @cashu/cashu-ts 3.5.0, @lightninglabs/lnc-web 0.3.5-alpha, Docker Compose.

## Context: What's Already Built

### Checkout Flow (functional in demo mode)
- `/pay/[merchant-id]` — renders amount entry → Lightning QR code → payment polling → confirmation
- `POST /api/checkout` — creates Lightning invoice, stores session in Supabase
- `GET /api/checkout/status/[id]` — polls payment status every 2 seconds
- `POST /api/checkout/webhook` — marks session as paid, triggers merchant webhook
- Rate limiting (10/hour per IP), idempotency keys, 10-minute invoice TTL
- **Demo mode** works in development (fake invoices). Production returns 503 without LND.

### Invoice System (schema exists, partial API)
- Prisma model: Invoice with line items, status tracking (draft → sent → paid → overdue → void)
- `GET/POST /api/invoices` — CRUD endpoints exist
- `GET /api/invoices/[id]/pdf` — PDF generation stub (not implemented)
- Checkout can accept `invoiceId` to tie payment to an invoice
- No email delivery (stub comment: "replace with Resend/SendGrid when ready")

### Merchant API Keys (API exists, no UI)
- Key format: `arx_{scope}_{base58_token}` (live, pub, test scopes)
- CRUD via `/api/merchant-keys` endpoints
- No merchant-facing dashboard to manage keys

### Lightning Infrastructure (code exists, not connected)
- `lib/payment-sdk.ts` — calls LND REST API (`/v1/invoices`) for invoice creation
- `lib/lightning-agent.ts` — LNC-Web WASM client for client-side node connection
- L402 challenges: macaroon + BOLT11 invoice (HMAC-SHA256 signed)
- Requires: `LND_REST_URL`, `LND_MACAROON_HEX` environment variables
- Tier system designed: watch-only → pay-only (remote signer) → admin

### Cashu / Ecash (code exists, not connected to merchant flow)
- `lib/cashu-sdk.ts` — Cashu v3 client (createMintQuoteBolt11 → mintProofs)
- `lib/cashu-paywall.ts` — NUT-24 ecash paywall for L402 machine-to-machine payments
- Separate `te-btc/cashu-l402` library is production-ready (265/265 tests passing)
- Separate `te-btc/cashu-mint` TypeScript mint at Phase 1 (33 unit tests passing)

### Settlement / Payouts (schema exists, nothing wired)
- `PayoutConfig` Prisma model exists
- `/api/payouts/trigger` endpoint exists
- No scheduler, no execution, no UI

### What Does NOT Exist
- **Merchant dashboard** — no way for a merchant to see payments, configure settings, or manage their account
- **Payment notifications** — no email/SMS/push when payment received
- **Transaction history** — no ledger view for merchants
- **Payout execution** — schema only, no actual fund movement
- **POS integration** — no physical point-of-sale solution
- **Fiat conversion** — no auto-convert to USD for merchants who need it
- **Dispute/refund flow** — schema stubs only

---

## Research Questions — Organized by Decision Area

### 1. Lightning Node Strategy (CRITICAL — blocks everything)

ArxMint needs a Lightning node to generate real invoices. This is the #1 blocker.

```
Research the best Lightning node strategy for a Bitcoin merchant payment platform
targeting 1-30 merchants in its first 6 months, scaling to 100+ merchants in year one.

Compare these approaches with concrete pricing, setup time, and operational burden:

A. **Self-hosted LND on VPS** (Hetzner/DigitalOcean)
   - ArxMint already has Docker Compose configs for LND v0.18.0-beta
   - Requires channel management, liquidity provisioning, backup discipline
   - Full sovereignty but high ops burden
   - What's the minimum viable channel setup for 30 merchants?

B. **Voltage (managed LND hosting)**
   - Managed Lightning node, API access, no channel management
   - Pricing for a small merchant platform?
   - Can ArxMint's existing LND REST API code point at a Voltage node?
   - Voltage Flow (LSP) for inbound liquidity?

C. **LNbits as payment layer**
   - LNbits running on top of a funding source (Voltage, Phoenix, etc.)
   - Multi-tenant out of the box — each merchant gets a wallet
   - LNURL support, built-in POS, extensions ecosystem
   - Can ArxMint use LNbits API instead of raw LND?

D. **Alby Hub (self-custodial, merchant-operated)**
   - Each merchant runs their own Alby Hub
   - ArxMint generates invoices via Alby's NWC (Nostr Wallet Connect) protocol
   - Non-custodial by design — ArxMint never touches funds
   - What's the merchant setup friction?

E. **Breez SDK / Greenlight (embedded node)**
   - CLN-based, runs inside the app
   - Blockstream Greenlight: cloud-hosted node, keys stay local
   - Would ArxMint embed a node per merchant or run one shared node?
   - Licensing and pricing?

F. **Phoenix/phoenixd (ACINQ's server-side Lightning)**
   - Simplified Lightning with automated channel management
   - phoenixd runs as a daemon, REST API for invoices
   - Auto-liquidity (ACINQ LSP opens channels on demand)
   - What are the fees? (1% + mining fee for inbound?)
   - Can it handle multi-merchant use cases?

G. **Strike API or similar fiat bridge**
   - Strike handles Lightning → USD settlement
   - Merchant gets USD in bank account, never touches Bitcoin
   - For merchants like Black Bear who may want fiat
   - Fees, KYC requirements, API access?

For each option evaluate:
- Time to first real payment (hours? days? weeks?)
- Monthly cost at 30 merchants / 100 tx per month
- Monthly cost at 100 merchants / 1000 tx per month
- Custody model (who holds funds? who has keys?)
- Channel/liquidity management burden
- API compatibility with ArxMint's existing LND REST code
- Reliability/uptime guarantees
- What happens if the node goes down mid-payment?
- Can it handle both regular payments AND L402 machine-to-machine payments?
- Privacy implications for merchants and customers
- Regulatory/compliance considerations

Also research:
- What do BTCPay Server, Breez POS, and Strike use under the hood?
- What's the cheapest path to "Black Bear can accept a $50 payment today"?
- Can we start with one approach and migrate later without breaking merchant integrations?
- Is there a way to offer merchants CHOICE of backend (some want sovereignty, some want simplicity)?
```

### 2. Custody Model & Fund Flow

```
Research the optimal custody model for a multi-merchant Bitcoin payment platform
where the operator (ArxMint) wants to minimize custodial liability while maximizing
merchant UX.

Decision matrix — for each model, evaluate regulatory risk, merchant UX, and technical complexity:

A. **Fully custodial (ArxMint holds all funds)**
   - ArxMint runs one node, receives all payments, settles to merchants
   - Simplest UX but maximum regulatory exposure
   - Is this legal without a money transmitter license?
   - What states require MTL for this model? Colorado specifically?

B. **Non-custodial (merchant operates own node)**
   - ArxMint generates invoices against merchant's own Lightning node
   - Zero custodial risk for ArxMint
   - High friction for merchants (they need technical setup)
   - NWC (Nostr Wallet Connect) as the connection protocol?

C. **Hybrid pass-through (ArxMint receives, instantly forwards)**
   - Payment hits ArxMint's node, immediately forwarded to merchant wallet
   - Brief custodial window (seconds)
   - Is this still considered money transmission?
   - What's the legal precedent for "hot potato" custody?

D. **Cashu ecash model (mint-based)**
   - ArxMint operates a Cashu mint backed by Lightning
   - Payments converted to ecash, merchant redeems when ready
   - Mint is custodial by nature — what are the regulatory implications?
   - Privacy benefits (blinded tokens, no transaction graph)

E. **Fedimint federation model**
   - Community operates a federated custody system
   - Multiple guardians hold keys (2-of-3, 3-of-5)
   - Reduces single-point-of-failure risk
   - Is a federation considered a money transmitter?

For the Colorado Front Range pilot specifically:
- What does Colorado's money transmitter law say about Bitcoin custody?
- Does the Colorado Digital Token Act provide any exemptions?
- What's the minimum viable compliance for a 30-merchant pilot?
- Should ArxMint register as an MSB (Money Services Business)?
- What do BTCPay Server operators do about this? (They argue they're software, not custodians)

Research what other Bitcoin merchant platforms do:
- BTCPay Server: non-custodial (merchant runs own node)
- Strike: fully custodial, licensed
- OpenNode: custodial, licensed
- Breez: non-custodial (embedded SDK)
- CoinOS: custodial
- How does each handle the regulatory question?
```

### 3. Merchant Onboarding & Dashboard

```
Research what a minimum viable merchant dashboard needs for a Bitcoin payment platform,
based on what successful platforms provide and what merchants actually use.

Black Bear Window Cleaning is a real window cleaning business in Boulder, CO.
The owner (Evan D'Agostino) is not a Bitcoin developer. He needs:

1. **Onboarding flow** — from "I signed up on arxmint.com/merchants" to "I can accept my first payment"
   - What steps are required?
   - What information does the merchant need to provide?
   - How long should this take? (BTCPay: ~15 min, Strike: ~5 min, Square: ~3 min)
   - What's the drop-off rate at each step for competing platforms?

2. **Dashboard MVP** — what's the minimum set of features for day-one?
   Research what BTCPay Server, Strike for Business, Square, and Stripe dashboards
   show merchants on their home screen:
   - Today's sales / recent transactions
   - Payment link / QR code to share
   - Balance / available funds
   - Payout status
   - What can we cut for v1?

3. **Payment link / QR experience**
   - Merchant needs a shareable link: arxmint.com/pay/black-bear
   - Also needs a printable QR code for the physical storefront window
   - Should the QR encode the payment link or a Lightning address?
   - What format works with the most customer wallets?
   - LNURL-pay vs BOLT11 vs Lightning Address vs Unified QR (BIP21)?

4. **Notification system**
   - How should the merchant be notified when a payment comes in?
   - Email? SMS? Push notification? Telegram bot? All of the above?
   - What's the latency expectation? (Stripe: <1 second webhook)
   - ArxMint already has a Telegram webhook integration — should we use that?

5. **Payout / settlement**
   - When does the merchant get their money?
   - Options: instant (stay in Bitcoin), daily batch, on-demand withdrawal
   - If merchant wants USD: who converts? At what rate? What fee?
   - What do Strike, OpenNode, and BTCPay Server do?

Research the "first 5 minutes" experience for competing platforms:
- Square: download app → create account → accept first card payment
- Stripe: sign up → copy API key → first charge
- BTCPay Server: deploy → connect wallet → create store → first invoice
- Strike for Business: sign up → verify identity → share payment link
- What's the fastest path for ArxMint to match the best of these?
```

### 4. Point-of-Sale (POS) Integration

```
Research POS options for a Bitcoin merchant payment platform targeting
service businesses (window cleaning, restaurants, retail) in Colorado.

Black Bear Window Cleaning needs to accept payment:
- At the customer's home after completing a job (mobile/field service)
- Via invoice sent by email/text after quoting a job
- Via their website (online booking + payment)

Research these POS approaches:

A. **Web-based POS (phone browser)**
   - Simple webpage the merchant opens on their phone
   - Enter amount → show QR → customer pays
   - No app install required
   - Examples: BTCPay Server POS, LNbits TPoS, Breez POS mode

B. **Native mobile app**
   - Dedicated ArxMint merchant app (React Native or similar)
   - NFC tap-to-pay (if hardware supports it)
   - Push notifications on payment
   - Offline capability?
   - Build cost and timeline?

C. **NFC tap-to-pay (Bolt Card / CoinCorner)**
   - Customer taps NFC card or phone
   - Uses LNURL-withdraw or LNURL-pay under the hood
   - ArxMint's codebase already has NFC/NuMo references in merchant-onboard.tsx
   - What hardware is needed? Cost per merchant?
   - Which customer wallets support NFC Lightning?

D. **Integration with existing POS systems**
   - Square plugin? Clover plugin? Shopify integration?
   - Does BTCPay Server have existing integrations we could leverage?
   - WooCommerce, Shopify, and other e-commerce plugins?
   - ArxMint already has a Shopify feasibility doc (docs/research/shopify-feasibility.md)

E. **Invoice / payment request via text/email**
   - Merchant sends customer a payment link via SMS or email
   - Customer clicks link, pays Lightning invoice
   - Perfect for service businesses (invoice after job completion)
   - How to generate and deliver these? Twilio for SMS?

For a window cleaning business specifically:
- What's the most practical payment flow when the tech is at the customer's house?
- Customer may not have a Lightning wallet — what's the fallback?
- Should ArxMint provide a customer-facing "pay with any wallet" page?
- What about tipping?

Research what Breez POS, BTCPay Server POS, CoinOS, and Strike do for in-person payments.
What's the fastest path to "Black Bear completes a window cleaning job and gets paid in Bitcoin on the spot"?
```

### 5. Invoicing & Billing System

```
Research best practices for Bitcoin-native invoicing for service businesses,
and what ArxMint needs to build to support merchants like a window cleaning company.

ArxMint already has an Invoice Prisma model with:
- Invoice number, line items, status tracking, payment rail (lightning/cashu/stripe)
- Links to checkout sessions via paymentSessionId
- PDF generation stub (not implemented)
- No email delivery

Research questions:

1. **Invoice generation**
   - What fields does a service business invoice need? (Business name, address, tax ID, line items, due date, payment terms)
   - Should invoices be denominated in USD with BTC payment option, or BTC-native?
   - How do BTCPay Server and Strike handle fiat-denominated Lightning invoices?
   - Exchange rate lock: how long is the BTC price locked when customer opens the invoice?
   - What happens if the customer underpays or overpays?

2. **Invoice delivery**
   - Email (Resend, SendGrid, Postmark — which is cheapest/best for transactional email?)
   - SMS via Twilio or similar
   - Shareable link (like Stripe invoice links)
   - WhatsApp Business API?
   - What's the open rate / payment rate for each channel?

3. **Recurring invoices / subscriptions**
   - Can Lightning handle recurring payments? (No native support — requires workarounds)
   - LNURL-pay with fixed amounts?
   - Cashu-based subscription tokens?
   - What do other Bitcoin payment platforms do for recurring billing?
   - Is this even needed for a window cleaning business? (Probably yes — monthly service contracts)

4. **Tax & accounting integration**
   - Do Bitcoin payments need to be reported as income? (Yes)
   - What format do merchants need for their accountant? (CSV export? QuickBooks integration?)
   - Colorado sales tax implications for Bitcoin-paid services
   - Does ArxMint need to track USD-equivalent value at time of payment for tax purposes?

5. **PDF generation**
   - What library? (@react-pdf/renderer, puppeteer, jsPDF)
   - Should PDFs be generated server-side or client-side?
   - Branded with merchant's logo and colors?
   - Include QR code for payment on the PDF itself?
```

### 6. Multi-Payment Rail Strategy

```
ArxMint supports three payment rails: Lightning, Cashu ecash, and (planned) Stripe fiat.
Research how to present these to merchants and customers.

Questions:

1. **Which rail for which use case?**
   - Lightning: real-time payments, standard checkout
   - Cashu: privacy-preserving, offline-capable, micropayments
   - Stripe: fiat fallback for customers without Bitcoin
   - L402: machine-to-machine (AI agent payments)
   - When should ArxMint auto-select vs let the customer choose?

2. **Unified checkout page**
   - Should the checkout show one QR (unified BIP21) or separate options?
   - What's the UX research on multi-option payment pages?
   - Stripe Checkout vs BTCPay Server checkout UX — what converts better?

3. **Fiat on/off ramp for merchants**
   - If merchant wants USD settlement, who provides the conversion?
   - Strike API, Kraken, River, Cash App auto-sell — which works for a platform?
   - What are the fees for auto-conversion?
   - KYC implications for the merchant

4. **Agent commerce (L402)**
   - ArxMint has L402 infrastructure built (lib/cashu-paywall.ts, lib/lightning-agent.ts)
   - How should merchant API endpoints be L402-gated?
   - Can Black Bear sell "schedule a cleaning" as an L402 endpoint?
   - What's the market for agent-to-merchant commerce in 2026?
```

### 7. Security & Compliance

```
Research the minimum viable security and compliance requirements for a
Bitcoin merchant payment platform operating in Colorado.

Questions:

1. **Money transmitter licensing**
   - Does ArxMint need an MTL in Colorado?
   - What triggers MTL requirements? (Custody? Settlement? Both?)
   - Colorado Digital Token Act — does it exempt Bitcoin payment processors?
   - FinCEN MSB registration — is it required?
   - What's the cost and timeline to get licensed if needed?

2. **PCI DSS considerations**
   - Lightning/Bitcoin payments don't use card data — is PCI relevant?
   - If ArxMint adds Stripe as a fiat fallback, does that trigger PCI?
   - What's the simplest way to stay PCI-compliant? (Use Stripe.js, never touch card data)

3. **Data protection**
   - Merchant PII (name, email, address) — storage and encryption requirements
   - Customer payment data — what should ArxMint store vs not store?
   - CCPA/CPA (Colorado Privacy Act) implications
   - Right to deletion — can we delete merchant data while maintaining audit trail?

4. **Fraud prevention**
   - Lightning payments are irreversible — no chargebacks
   - But what about merchant fraud? (Fake businesses, money laundering)
   - KYC for merchants: how much identity verification is needed?
   - What level of KYC do BTCPay Server, Strike, and OpenNode require?

5. **Insurance and liability**
   - If ArxMint's node is hacked and funds are lost, who's liable?
   - Is there insurance for Lightning node operators?
   - Should ArxMint's terms of service limit liability?
```

### 8. Go-to-Market: First 20 Founding Merchants

```
Research the most effective go-to-market strategy for onboarding the first 20
Bitcoin-accepting merchants in the Colorado Front Range area.

Context:
- Black Bear Window Cleaning (Boulder) is merchant #1
- ArxMint has a "Founding Merchant" program (first 20 get special status)
- Target geography: Boulder → Longmont → Fort Collins → Denver metro
- Target verticals: service businesses, food & drink, retail, tech companies
- Value prop: zero processing fees, instant settlement, no middlemen

Questions:

1. **Merchant acquisition channels**
   - Local Bitcoin meetups (Boulder Bitcoin, Denver Bitcoin)
   - BTCMap.org listings as social proof
   - Door-to-door / cold outreach to businesses
   - Referral program (existing merchants refer others)
   - Local business associations / chambers of commerce
   - Which channel has the highest conversion rate for Bitcoin merchant adoption?

2. **Incentive structure for founding merchants**
   - Free setup, forever zero fees?
   - Featured placement on arxmint.com?
   - Physical "Bitcoin Accepted Here" signage provided?
   - Free NFC hardware?
   - What incentives have worked for BTCPay Server, CoinOS, Bitcoin Beach, Bitcoin Jungle?

3. **Merchant objection handling**
   - "My customers don't use Bitcoin" → What's the counter?
   - "I need USD, not Bitcoin" → Fiat conversion options
   - "It's too complicated" → How simple is the setup really?
   - "I'm worried about tax implications" → Clear guidance needed
   - "What if Bitcoin price drops?" → Instant conversion option
   - Research: what are the top 5 merchant objections from other Bitcoin payment platforms?

4. **Community flywheel**
   - Bitcoin Beach (El Salvador), Bitcoin Jungle (Costa Rica), Bitcoin Ekasi (South Africa)
   - What made these circular economies work?
   - What's the minimum merchant density needed for a self-sustaining economy?
   - How do you get customers to actually USE Bitcoin at these merchants?

5. **Metrics and KPIs**
   - What should ArxMint track for grant reporting?
   - Merchant count, transaction volume, customer count, retention rate?
   - What KPIs do OpenSats, HRF, and Spiral care about?
   - What's a realistic 6-month target for the Colorado pilot?
```

---

## Deliverable Format Requested

For each of the 8 sections above, provide:

1. **Concrete recommendation** — not "it depends," pick a winner and defend it
2. **Tradeoffs acknowledged** — what we're giving up with this choice
3. **Implementation tasks** — specific, actionable items that can be assigned to coding agents
4. **Timeline estimate** — how long each task takes (days, not weeks of hand-waving)
5. **Cost estimate** — monthly/annual cost for the recommended approach
6. **Migration path** — how to evolve from MVP to production scale
7. **Dependencies** — what blocks what, what can be parallelized

Additionally, provide:
- A **recommended implementation order** across all 8 sections (what to build first)
- A **"Black Bear is live" milestone** — the minimum set of tasks to get ONE real merchant accepting ONE real payment
- A **"20 Founding Merchants" milestone** — what needs to be true for the full founding cohort
- **Roadmap items** formatted as tasks that can be added to ArxMint's AGENT_TASKS.md

## Prior Research to Reference

ArxMint already has extensive research docs. Do not re-research what's already been decided — build on these:

- `docs/research/1-Database & Persistence Strategy` → **Decision: Supabase for Vercel, Prisma for Docker**
- `docs/research/2-Pilot VPS & Deployment Architecture` → **Decision: NUC for self-hosted pilot**
- `docs/research/3 & 4-CDK vs Nutshell` → **Decision: Nutshell for pilot, CDK for production**
- `docs/research/5-Cashu Proof Persistence` → **Decision: hybrid localStorage + server backup**
- `docs/research/Phase5-Bazaar/3-Architecture Decisions` → **Extensive analysis of deployment topologies, mint architecture, API design**
- `docs/research/Phase5-Bazaar/Self-Hosting-UX/` → **11 studies on merchant self-hosting UX**
- `docs/research/shopify-feasibility.md` → **Shopify plugin feasibility analysis**

Focus this research on the OPERATIONAL gap: not architecture theory, but "what do we build THIS MONTH to get Black Bear accepting payments?"
