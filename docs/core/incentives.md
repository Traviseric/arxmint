# ArxMint Incentives

**How we get merchants to accept Bitcoin and customers to spend it.**

---

## The Problem

Two sides, both resistant:

- **Customers** hoard Bitcoin because it appreciates. Why spend good money when you can spend bad money? (Gresham's Law.)
- **Merchants** avoid Bitcoin because of volatility, tax headaches, and "why bother for 2% of my customers?"

Fee savings alone don't fix this. Both sides have to be *better off* than they are with USD — not just equivalent.

---

## How We Fix It

### For Customers: Make It Cheaper to Pay with Bitcoin

**Dual pricing.** The merchant shows two prices: "$100 via card, $95 via Bitcoin." Legal in all 50 states. The merchant can afford the discount because they're saving ~2% on processing fees and still netting more per transaction than they would with Visa.

This is the single most effective lever for changing payment behavior. It's direct, obvious, and targets the thing people actually care about: price.

**Sats-back rewards.** Pay at an ArxMint merchant, get 1-3% back in Cashu ecash. The rewards are locked to ArxMint merchants — they can't leak to exchanges. This is the Starbucks Rewards model applied to Bitcoin: closed-loop, so every reward dollar circulates back into the network.

Starbucks Rewards members account for 53-57% of US revenue and spend 3x more per visit. That's the mechanic we're replicating — except with privacy (Cashu's blind signatures mean nobody can track your spending) and without the corporate surveillance.

**Ecash gift cards.** Buy a Cashu token, send it to someone. They redeem it at any ArxMint merchant. No wallet setup, no app download — just a URL. Merchants can sell branded versions. Bitrefill proved this works: ~50,000 crypto payments a day, mostly gift cards.

### For Merchants: Make It Better Than Visa

**1% vs 2.9%.** ArxMint charges 1%. Visa charges 2.9% + $0.30. On a $500 window cleaning job, that's $5 vs $14.80. Real money, every transaction.

**Instant settlement, no chargebacks.** Lightning payments settle in seconds and are final. No 2-3 day wait. No 90-day chargeback window. For service businesses, chargebacks are a real cost — this eliminates them.

**No account freezes.** Stripe and PayPal can freeze merchant funds for 90+ days with no explanation. With ArxMint, the merchant's money is their money the instant it arrives.

**Pay your suppliers in Bitcoin.** If a restaurant accepts BTC but has to sell it for dollars to pay their cleaning service, the friction kills it. But if their cleaning service is also on ArxMint, the restaurant routes incoming BTC directly to them. No off-ramp. BTC circulates. Every supplier onboarded is another merchant in the network.

### For AI Agents: Programmable Commerce

AI agents don't care about loyalty cards or discounts. They need APIs, instant settlement, and cryptographic receipts. ArxMint's L402 + Cashu stack gives them that. A procurement bot can discover a service, pay for it, and get a verifiable receipt — no human in the loop.

---

## The Flywheel

```
Merchant saves on fees (1% vs 2.9%)
  → Offers BTC discount to customers
  → Customer pays in BTC, earns Cashu sats-back
  → Sats-back only spendable at ArxMint merchants
  → Customer spends rewards at another merchant
  → That merchant gets more volume
  → Merchant pays their own suppliers in BTC (also on ArxMint)
  → Supplier is now a merchant too
  → Network grows without ArxMint doing direct sales
  → Repeat
```

The Cashu mint is what makes this closed-loop. Without it, rewards leak to exchanges and the flywheel breaks.

---

## What We Build, In Order

### Phase 1: Dual Pricing + Tax Reports

A config toggle per merchant. Checkout shows: "Pay $X or save Y% with Bitcoin." Plus a year-end CSV export of all transactions — because every BTC purchase is a taxable event under IRS rules, and without this, tax-aware customers won't spend.

Low effort. Highest immediate impact.

### Phase 2: Cashu Rewards + Gift Cards

Issue Cashu ecash tokens on payment completion. Redeemable at any ArxMint merchant. Merchant-branded gift card tokens. This is the moat — BTCPay can't do it (no mint), Strike can't do it (custodial, no ecash), Fold/Lolli can't do it (open-loop rewards leave the ecosystem).

High effort. Creates defensible competitive advantage.

### Phase 3: B2B Routing + Referrals + Agent API

Merchant dashboard "pay vendor" feature — auto-split incoming payments to suppliers. Referral bounties in Cashu tokens for customer-refers-merchant and merchant-refers-merchant. Agent commerce endpoints compatible with L402 and emerging standards (x402, AP2).

Medium-high effort. Creates network effects. Self-sustaining growth.

---

## Who Spends Bitcoin (and Why)

Not everyone. But these segments do:

- **Ideological Bitcoiners** — Spend-and-replace. Actively seek BTC merchants. (7,000+ transactions at BTC Prague from this crowd.)
- **Travelers** — Avoid 3-5% FX fees on credit cards. Lightning is cheaper than any travel card.
- **Unbanked populations** — In regions where banking is exclusionary, Lightning is the only frictionless digital payment option.
- **Privacy-focused buyers** — Cashu's blind signatures mean no one can track spending patterns. You can't get that with a credit card.
- **B2B operators** — Instant global settlement, no 2-3 day ACH, no 2.9% interchange on high-value invoices.

---

## What Doesn't Work

We looked at these and deprioritized them:

- **Gamification / badges / explorer maps** — High novelty, fast decay. Behavioral research shows extrinsic gamification in payment contexts doesn't sustain without real financial incentive underneath.
- **Volume-based fee tiers** — Good sales pitch for onboarding merchants. But the cashier doesn't care if the business saves 0.25% on backend reconciliation. Doesn't change customer behavior.
- **Time-limited promos** — Spikes volume temporarily, but trains customers to wait for the next promo. Creates a "discount trap."
- **Community round-ups** — Nice for goodwill. Doesn't have the economic force to change anyone's payment decision.

---

## What We're Watching

- **De minimis tax exemption** — Would exempt small BTC purchases (under $200) from capital gains. Failed in Congress late 2025. If it passes, removes the biggest spending blocker overnight.
- **Agent payment standards** — AP2 (Google), x402, L402. Fragmenting fast. Our stack aligns with x402.
- **Instant fiat hedging** — BTCPay Prague proved StableSats (instant USD peg) was the #1 driver of merchant willingness. Evaluating whether to offer optional stablecoin settlement.
