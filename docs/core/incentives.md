# ArxMint Incentives

**How we get Bitcoin into the hands of merchants and give people with Bitcoin places to spend it.**

---

## Who's Actually Spending Bitcoin (and Why)

The conventional framework says people hoard Bitcoin because it appreciates (Gresham's Law) and need rational incentives — discounts, rewards — to overcome that. That framework describes a future market. The actual market right now is simpler and weirder.

Bitcoin commerce in 2026 is a **renaissance faire.** People buy 3D printed node cases from CryptoCloaks, leather goods, Bitcoin merch — completely irrational from a pure market perspective. They do it because spending Bitcoin at an aligned business feels like building the future. It's ideological, not economic.

The people spending Bitcoin today aren't doing it because of fee savings. They're doing it because:

- **They're living on it.** People sitting on significant holdings who spend directly rather than converting to fiat through exchanges.
- **They believe in it.** Spending Bitcoin at a Bitcoin business is an act of conviction, not a financial optimization.
- **They're curious.** First-timers who want to experience what paying with Bitcoin actually feels like.
- **They want privacy.** Paying without handing over identity data to payment processors and data brokers.

And here's the uncomfortable truth about rational incentives: **capital gains taxes eat them.** A 5% merchant discount gets wiped out by a 15-20% capital gains hit for anyone sitting on appreciated BTC. The "savings" math only works for people at a loss, spending freshly purchased BTC, or people who don't care about the tax event — which is exactly the ideological crowd.

The concentrations of Bitcoin wealth are asymmetric. A small number of people hold a lot and want to spend it. They don't need convincing. They need **places to spend.**

ArxMint's job: give them those places.

---

## How We Do It

### Phase 1: Merchant Density + Frictionless Checkout (now)

The intransigent minority of Bitcoin spenders already exists. They need merchants, not incentives. So we focus on:

- **Getting more merchants on the network.** Every new merchant is a new place for existing BTC spenders to use their money.
- **Making checkout fast.** These people have already decided to spend. Don't slow them down with banners and modals. Lightning QR, tap, done.
- **Making merchants findable.** BTCMap integration, local discovery, merchant listings.
- **No-exchange spending.** The value prop for BTC-native spenders isn't "save 5%" — it's "spend your Bitcoin directly without touching an exchange, without KYC, without conversion."

### Phase 2: The Cashu Trap Door (next)

Once merchant density exists, the Cashu closed-loop becomes powerful — not as a rational incentive for mainstream consumers, but as **the bazaar currency.**

**Sats-back rewards.** Pay at an ArxMint merchant, get 1-3% back in Cashu ecash. The rewards are locked to ArxMint merchants — they can't leak to exchanges. Every reward circulates back into the network.

Starbucks Rewards members account for 53-57% of US revenue and spend 3x more per visit. Same closed-loop mechanic — except with privacy (Cashu's blind signatures mean nobody can track your spending) and without the corporate surveillance.

**Ecash gift cards.** Buy a Cashu token, send it to someone. They redeem it at any ArxMint merchant. No wallet setup, no app download — just a URL. Merchants can sell branded versions. Bitrefill proved this works: ~50,000 crypto payments a day, mostly gift cards.

**Dual pricing.** Merchant shows two prices: "$100 via card, $95 via Bitcoin." Legal in all 50 states. The merchant can afford the discount because they're saving ~2% on processing fees. Note: this mostly helps with the *next* wave of adoption — the rational spenders. For the current ideological market, the discount is a nice bonus but not the reason they're paying in Bitcoin.

### Phase 3: The Circular Economy (later)

**B2B supplier routing.** A restaurant on ArxMint pays their cleaning service (also on ArxMint) directly in Bitcoin. No off-ramp to fiat. BTC circulates. Every supplier onboarded is another merchant in the network.

**Referral bounties.** Cashu tokens for customer-refers-merchant and merchant-refers-merchant. The community becomes the sales force.

**Agent commerce.** AI agents don't care about loyalty cards. They need APIs, instant settlement, and cryptographic receipts. ArxMint's L402 + Cashu stack gives them that.

---

## For Merchants: Why Accept Bitcoin

**1% vs 2.9%.** ArxMint charges 1%. Visa charges 2.9% + $0.30. On a $500 window cleaning job, that's $5 vs $14.80. Real money, every transaction.

**Instant settlement, no chargebacks.** Lightning payments settle in seconds and are final. No 2-3 day wait. No 90-day chargeback window.

**No account freezes.** Stripe and PayPal can freeze merchant funds for 90+ days. With ArxMint, the merchant's money is theirs the instant it arrives.

**Access to a spending class that's looking for you.** The intransigent minority of Bitcoin spenders actively seeks out businesses that accept BTC. Being on the ArxMint network makes you discoverable to people who *want* to give you their money.

---

## The Flywheel

```
Bitcoin holders want to spend → need merchants
  → ArxMint onboards merchants (fast, cheap, sovereign)
  → Merchants become findable to BTC spenders
  → Spenders pay, merchants get hooked (1% fees, instant settlement)
  → Merchants tell other merchants (referrals)
  → Merchants pay their own suppliers on ArxMint (B2B)
  → Suppliers become merchants
  → More merchants = more places to spend
  → Cashu rewards keep value circulating inside the network
  → Network grows
```

Phase 1 is the top of this funnel: merchant density. Everything else amplifies it.

---

## What We Build, In Order

| Phase | What | Why Now |
|---|---|---|
| **1. Merchant density** | Fast onboarding, frictionless checkout, BTCMap discovery, tax CSV for merchants | The spenders exist. Give them places to spend. |
| **2. Cashu trap door** | Sats-back rewards, ecash gift cards, closed-loop circulation | Lock value inside the network. The bazaar gets its own currency. |
| **3. Circular economy** | B2B routing, referral bounties, dual pricing, agent API | Network effects. Self-sustaining growth. Cross into rational-market adoption. |

Dual pricing and rational incentives land in Phase 3 — not because they're bad ideas, but because the current market is ideological, not price-sensitive. They become powerful when we're ready to cross from the Bitcoin renaissance faire into broader adoption.

---

## What Doesn't Work (Yet)

- **Gamification / badges** — High novelty, fast decay. Doesn't sustain without real financial incentive underneath.
- **Volume-based fee tiers** — Good sales pitch for merchants. Doesn't change customer behavior at all.
- **Time-limited promos** — Creates a "discount trap" where customers wait for the next promo.
- **Rational discount incentives as primary driver** — Capital gains taxes eat the savings. The current BTC spending market isn't rational. Don't solve for a market that doesn't exist yet.

---

## What We're Watching

- **De minimis tax exemption** — Would exempt small BTC purchases (under $200) from capital gains. Failed in Congress late 2025. If it passes, the rational-incentive playbook instantly becomes viable.
- **Agent payment standards** — AP2 (Google), x402, L402. Fragmenting fast. Our stack aligns with x402.
- **Instant fiat hedging** — BTCPay Prague proved StableSats (instant USD peg) was the #1 driver of merchant willingness. Evaluating whether to offer optional stablecoin settlement for risk-averse merchants.
- **The ideological-to-rational transition** — When does Bitcoin commerce cross from renaissance faire to mainstream? That's when dual pricing and sats-back become the primary growth drivers instead of merchant density.
