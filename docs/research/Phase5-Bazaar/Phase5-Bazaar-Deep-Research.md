# Phase 5: Bazaar — Deep Research Prompt

**Purpose:** Answer all open architectural, legal, competitive, and implementation questions before writing code for Phase 5 (decentralized Stripe alternative). This research should produce locked decisions the way Research #1-6 locked decisions for Phases A-E.

**Context:** ArxMint has a working payment infrastructure (L402 + Cashu NUT-24 + Lightning + Fedimint) built across Phases A-E. Phase 5 adds a merchant-facing API layer on top: API keys, webhooks, hosted checkout, client SDK, merchant dashboard, LNURL-pay, settlement automation. The goal is Stripe-level developer experience with near-zero fees, no customer KYC, and self-hosted sovereignty.

---

## Research Questions

### 1. Legal and Regulatory Analysis

**Money Transmitter / MSB Classification:**
- Does operating a Cashu mint that processes merchant payments constitute money transmission under US federal law (FinCEN)?
- Does it matter if the mint operator is the merchant themselves (self-hosted) vs. ArxMint hosting the mint on their behalf?
- How does the "payment processor exemption" apply? Stripe operates under this exemption — can ArxMint claim the same structure?
- What about state-level money transmitter licensing? Which states have Bitcoin-specific exemptions?
- How does the custodial vs. non-custodial distinction affect classification? ArxMint's current architecture stores proofs client-side only — does the merchant API key model change this?
- What does BTCPay Server's legal structure look like? They process Bitcoin payments without MSB licensing — how?
- What about the EU (MiCA regulation), UK (FCA), and other jurisdictions where early adopter merchants might operate?

**Custody Model:**
- If ArxMint issues API keys and processes payments on behalf of merchants, does ArxMint become a custodian?
- Can the architecture be designed so ArxMint never takes custody? (e.g., merchant runs their own mint, ArxMint only provides the SDK/tooling)
- What's the legal difference between "hosted checkout that routes to the merchant's mint" vs. "ArxMint processes the payment and settles to the merchant"?
- How does Cashu ecash custody work legally? The mint operator holds the BTC backing — is that custody of the merchant's funds?

**Compliance Requirements:**
- If ArxMint operates as a payment processor (not MSB), what compliance is required? (AML/KYC on merchants? Transaction monitoring? SAR filing?)
- What are the minimum compliance requirements for a self-hosted open-source payment tool? (Compare: BTCPay Server, LNbits, Umbrel)
- Does the open-source MIT license provide any legal protection for the developers if merchants use the software for illicit purposes?

### 2. Competitive Landscape

**Direct Competitors:**
- BTCPay Server: How do they position? What's their merchant onboarding flow? What are their gaps that ArxMint fills? (Answer: BTCPay is on-chain/Lightning only, no ecash privacy, complex self-hosting)
- Strike API: How does their merchant API work? What are their fees? What's their developer experience like? Where are they weak?
- Breez SDK: They have a merchant-facing Lightning SDK. How does it compare to what we're building?
- CashApp Business / Block: What's their Bitcoin merchant offering?
- OpenNode: Lightning payment processor. How do they work? What are their fees?
- Voltage / LND as a service: How do they serve merchants?
- LNbits: Lightweight Lightning wallet with extensions. How does their merchant tooling compare?
- Fedi (the company): They have Fedimint-based community infrastructure. Do they have merchant APIs?

**Indirect Competitors:**
- Stripe (the actual benchmark): What specific API patterns should we replicate? What's their onboarding flow? What makes their DX legendary?
- Square / Block: What's their in-person POS flow? How does tap-to-pay work?
- Shopify Payments: How do they embed payments into commerce platforms? (Relevant for Teneo Marketplace integration)

**Key Questions:**
- What's the actual addressable market for Bitcoin merchant payments in 2026? How many merchants currently accept Bitcoin?
- What's the merchant churn rate on existing Bitcoin payment processors? Why do merchants stop accepting Bitcoin?
- Is the "zero fees" pitch sufficient, or do merchants also need fiat conversion (which adds fees and regulatory burden)?
- What's the minimum viable feature set for a merchant to switch from Stripe? (Not the full Phase 5 — what's the MVP?)

### 3. Architecture Decisions

**Multi-Tenant vs. Self-Hosted:**
- Should ArxMint be a multi-tenant hosted service (like Stripe) or a self-hosted toolkit (like BTCPay Server)? Or both?
- If multi-tenant: how do you isolate merchant payment data? One mint per merchant? Shared mint with merchant-scoped keysets?
- If self-hosted: how do you make the setup as easy as BTCPay Server's one-click deploy?
- Can you start multi-tenant (faster to market) and add self-hosted later? Or does the architecture need to support both from day one?

**Mint Architecture:**
- Should each merchant get their own Cashu mint? Or share a community mint?
- If shared mint: how do you track which proofs belong to which merchant? (Cashu proofs are bearer tokens — they don't have a "merchant" field)
- If per-merchant mint: how do you manage dozens/hundreds of mint instances? Resource requirements?
- What's the trust model? Merchant trusts ArxMint (hosted) vs. merchant trusts themselves (self-hosted) vs. merchant trusts their community federation (Fedimint)?

**Payment Flow Architecture:**
- Should hosted checkout create a new Lightning invoice per payment (like BTCPay) or use LNURL-pay (reusable endpoint)?
- How do you handle payment expiry? Lightning invoices expire. Cashu challenges expire. What happens to the merchant's checkout page?
- Should the SDK support "payment intents" (Stripe-style, where you create an intent server-side and confirm client-side)?
- How do you handle partial payments? (Customer sends 400 sats for a 500 sat item)
- How do you handle overpayments? (Customer sends 600 sats for a 500 sat item)

**Webhook Architecture:**
- Synchronous (inline with payment verification) vs. asynchronous (queue-based)?
- What happens if the merchant's webhook endpoint is down? How many retries? What's the retry schedule?
- Should there be a webhook log/dashboard for debugging? (Stripe has this — it's critical for developer adoption)
- How do you prevent webhook replay attacks? (Stripe uses timestamp + signature verification)

**Settlement Architecture:**
- Instant settlement (merchant gets sats immediately) vs. batched (daily/weekly)?
- If instant: do you forward the Lightning payment directly to the merchant's node? Or mint ecash and push it?
- If batched: where do the sats sit between payment and settlement? (This is the custody question again)
- How does settlement work for Cashu payments? (Customer sends ecash → ArxMint verifies → ArxMint mints new ecash to merchant? Or forwards the same proofs?)
- What about the "Cashu swap" approach? (Customer's proofs are swapped for merchant's proofs at the same mint — no Lightning involved)

### 4. Developer Experience Research

**SDK Design:**
- Study Stripe.js source and API design. What patterns make it so easy to integrate?
- Study Square Web Payments SDK. How do they handle in-person vs. online?
- What's the minimum viable SDK? (Just a `<script>` tag + one function call? Or a full npm package?)
- Should the React components be in the same package or separate? (Stripe separates @stripe/stripe-js from @stripe/react-stripe-js)
- How do you handle framework-agnostic components? (Stripe uses iframes. Should ArxMint?)

**API Design:**
- RESTful? GraphQL? Both?
- Versioning strategy? (Stripe uses dated versions like 2024-12-18)
- Pagination pattern? (Cursor vs. offset — Stripe uses cursor)
- Error response format? (Stripe's error object is well-designed — study it)
- Rate limiting strategy per API key?
- Idempotency key implementation details? (Stripe's is well-documented)

**Documentation:**
- What makes Stripe's docs the gold standard? Interactive examples? Code snippets in every language? "Try it" buttons?
- What's the minimum viable documentation for launch?
- Should there be a "Quick Start" that gets a merchant from zero to first payment in under 15 minutes?

### 5. Go-to-Market and Adoption

**Merchant Acquisition:**
- How do you get the first 10 merchants? (Longmont pilot — but what about online merchants?)
- What's the pitch to a merchant who already uses Stripe? "Save $320/month" is compelling — but what about the friction of accepting a new payment method?
- Is the target market Bitcoin-native merchants (already want to accept BTC) or mainstream merchants (need convincing)?
- Should there be a "dual mode" where merchants accept both Stripe AND ArxMint, with ArxMint as the preferred method?

**Pricing Model:**
- Should ArxMint charge anything? If so, what?
- Possible models: completely free (open source, self-hosted), freemium (free for small volume, paid for high volume), percentage-based (0.1% — still 30x cheaper than Stripe), flat monthly fee
- How does BTCPay Server sustain itself? (Donations, grants, optional hosted service)
- How does the fee model interact with the grant applications? (Funders want sustainability, not just "we're free forever")

**Integration with Teneo Marketplace:**
- Teneo Marketplace already has `arxmintService.js` scaffolded. What's the exact integration path?
- Should ArxMint be a "plugin" that any commerce platform can add? (Like Stripe plugins for WooCommerce, Shopify, etc.)
- How do you handle the federation revenue share settlement? (Teneo tracks `network_revenue_shares` — ArxMint needs to auto-settle these)

### 6. Security Considerations

**API Key Security:**
- How do you securely generate and store merchant API keys?
- Key rotation: what happens to in-flight payments when a key is rotated?
- Should there be IP allowlisting for server-side keys? (Stripe offers this)
- How do you prevent API key leakage in client-side code? (pk_ keys should be safe to expose — sk_ keys must never be)

**Payment Security:**
- How do you prevent double-spend attacks in the hosted checkout flow?
- What about timing attacks on payment verification?
- How do you handle the "race condition" where two webhooks fire for the same payment?
- CSRF protection on the hosted checkout page?

**Webhook Security:**
- HMAC-SHA256 signature verification (Stripe's pattern)
- Replay attack prevention (timestamp window)
- What if the merchant's endpoint is compromised? Can an attacker trigger false fulfillments?

### 7. Infrastructure and Scaling

**Performance Requirements:**
- What's the target latency for payment creation? (Stripe: <200ms)
- What's the target latency for webhook delivery? (Stripe: <5 seconds)
- How many concurrent payments should the system handle?
- What's the database load for payment status polling? (SSE vs. WebSocket vs. polling trade-offs)

**Hosting and Deployment:**
- If multi-tenant: what infrastructure is needed? (Load balancer, multiple LND nodes, database cluster)
- If self-hosted: what's the minimum VPS spec? Can it run on a $5/month VPS?
- How does this interact with the existing Docker Compose stack?
- Should there be a managed hosting option? (BTCPay Server has LunaNode integration)

---

## Expected Deliverables

This research should produce:

1. **Legal decision:** Custodial vs. non-custodial architecture choice, with regulatory implications mapped
2. **Architecture decision:** Multi-tenant vs. self-hosted vs. hybrid, with specific technical design
3. **Mint architecture decision:** Per-merchant vs. shared, with trust model implications
4. **Settlement architecture decision:** Instant vs. batched, with custody implications
5. **SDK design spec:** API patterns, package structure, minimum viable SDK
6. **Competitive positioning:** Clear differentiation from BTCPay Server, Strike, OpenNode
7. **Go-to-market plan:** First 10 merchants, pricing model, dual-mode strategy
8. **Security architecture:** API key management, webhook security, payment flow security
9. **MVP scope:** The minimum feature set to ship Phase 5.1-5.4 and get merchant feedback
10. **Grant narrative:** How Phase 5 strengthens grant applications (OpenSats, HRF, FBCE)
