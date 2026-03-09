# Merchant Onboarding Kit

Everything you need to onboard a merchant to your Bitcoin circular economy in under 30 minutes.

---

## What Each Merchant Gets

| Item | Required | Notes |
|------|----------|-------|
| ArxMint merchant account | Yes | Created via arxmint.com/merchants application |
| Hosted checkout page | Yes | `arxmint.com/pay/[merchant-id]` — zero code required |
| QR code stand | Yes | Print from their checkout URL |
| Quick-start guide | Yes | 1-page PDF for counter staff |
| NFC card (Numo) | Optional | Tap-to-pay card, $5–10/card |
| Support contact | Yes | Your phone number + Telegram/Signal |

---

## Onboarding Process (30 Minutes)

### Step 1: Pre-meeting preparation (10 min, before you arrive)

- [ ] Application submitted at `arxmint.com/merchants`
- [ ] Merchant approved and ID assigned (check admin dashboard)
- [ ] Checkout URL ready: `https://arxmint.com/pay/[merchant-id]`
- [ ] QR code printed (from checkout URL) — laminated stand preferred
- [ ] Quick-start guide printed
- [ ] Test payment ready (send yourself a test payment from the checkout URL)

### Step 2: Merchant meeting (20 min)

**Opening pitch (3 min)**

> "You're already accepting cards — 2.9% fee, 2-day settlement, chargeback risk.
> Bitcoin Lightning is instant, final, and costs fractions of a penny.
> I'm going to show you how to take your first Bitcoin payment right now."

**Live demo (5 min)**

1. Show them their checkout page on your phone: `arxmint.com/pay/[their-merchant-id]`
2. Enter a small amount (100 sats ≈ $0.10)
3. Open your Lightning wallet, scan the QR, pay
4. Show them: "Payment received. Instant. Zero fees."

**Wallet setup (7 min)**

Help the merchant install a Lightning wallet for receiving:

| Wallet | Platform | Best for |
|--------|----------|---------|
| Wallet of Satoshi | iOS + Android | Easiest, custodial |
| Phoenix | iOS + Android | Non-custodial, recommended |
| Breez | iOS + Android | Non-custodial + POS mode |
| Zeus | iOS + Android | Advanced users |

Recommend **Phoenix** for most merchants — it's non-custodial, simple, and Lightning-native.

**POS setup (5 min)**

- Place the printed QR stand at the register or counter
- If using NFC: provision the Numo card (tap to pair with merchant checkout URL)
- Show counter staff how to generate an invoice for a specific amount: enter amount → show QR → wait for green ✓

**Q&A (5 min)**

Common questions and answers:

| Question | Answer |
|----------|--------|
| "What if I need fiat?" | Withdraw from Phoenix to exchange (Coinbase, Kraken) — usually next day |
| "What about volatility?" | Set prices in USD, accept sats — volatility affects you only at conversion time |
| "Is it legal?" | Yes — Bitcoin is legal to accept in the US as property. No money transmitter license needed for merchants |
| "What if the internet goes down?" | Ecash tokens work offline; Lightning requires connection. Have a cash backup plan |
| "What if a customer wants a refund?" | Lightning is final — no chargebacks. Issue store credit or cash refund manually |
| "What about taxes?" | Bitcoin income is taxable — same as any other payment. Keep records via ArxMint dashboard |

---

## Onboarding Timeline

| Month | Target | Actions |
|-------|--------|---------|
| 1 | 5 founding merchants | Hand-pick enthusiastic early adopters |
| 2–3 | 15 merchants | Door-to-door merchant push, referrals from founding merchants |
| 4–5 | 24 merchants | Events, merchant directory public, cross-merchant spend incentives |
| 6 | 30 merchants | Steady state, word-of-mouth growth |

---

## How to Find Merchants

### Warm outreach (highest conversion)

Start with existing community members who own businesses:
- Bitcoin meetup attendees
- Local tech community
- Small business owners you know personally

**Script:**
> "Hey [name], I know you're interested in Bitcoin. I'm setting up a Bitcoin payment network for local businesses. It's free, instant, and zero fees. Can I show you how it works? Takes 15 minutes."

### Cold outreach (after warm list exhausted)

Walk-in visits to local businesses:

**Best categories for early adoption:**

1. **Coffee shops & cafes** — Small, frequent transactions; tech-savvy customers
2. **Food trucks** — Mobile, cash-heavy, love low-fee alternatives
3. **Independent bookstores** — Community-oriented, privacy-conscious owners
4. **Barber shops** — Cash businesses, appreciate alternatives to card fees
5. **Farmers market vendors** — Accept cash and alternative payments already

**Door-to-door script:**
> "Hi, I'm [name] with the [City] Bitcoin Network. We help local businesses accept Bitcoin Lightning payments with zero fees. Do you have 5 minutes to see a demo? There's no commitment — it's free to join."

### Digital outreach

- Post in local Facebook groups, Nextdoor, Telegram community channels
- LinkedIn message to local business owners
- Partner with local Bitcoin meetup groups
- Email list from Chamber of Commerce (if available)

---

## QR Code and NFC Setup

### Generating the merchant QR code

```
Checkout URL: https://arxmint.com/pay/[merchant-id]

For fixed-price payments add ?amount=SATS:
https://arxmint.com/pay/glacier?amount=500

For shipping collection add ?shipping=1:
https://arxmint.com/pay/merch-store?shipping=1
```

**Print specs:**
- Minimum size: 2" × 2" (for reliable mobile scanning)
- Recommended: 4" × 4" laminated stand
- Include: merchant name, "Pay with Bitcoin Lightning", QR code

### Numo NFC Card Setup

1. Tap NFC card to your phone (NFC must be enabled)
2. Enter merchant checkout URL when prompted
3. Card stores the URL — customers tap card to open checkout on their phone
4. Test with your own phone before leaving

Order Numo cards: [numo.app](https://numo.app) (~$7/card)

---

## Merchant Dashboard

Merchants can track payments at:

```
https://arxmint.com/dashboard
```

After logging in with Nostr (or email), they see:
- Transaction history
- Total received (sats and USD equivalent)
- Payment success rate
- Monthly summary (useful for tax records)

For the tech-savvy: point them to the API reference at `docs/api-reference.md` if they want to integrate with their POS system.

---

## Quick-Start Guide (Print for Counter Staff)

> **Print and laminate this for each merchant's counter.**

---

**Accept Bitcoin Lightning Payments**

**Step 1:** Show customer this QR code
**Step 2:** Ask them to scan with their Lightning wallet
**Step 3:** Wait for the green checkmark (usually < 5 seconds)
**Step 4:** Done — payment received!

**Need a specific amount?** Open `arxmint.com/pay/[YOUR-MERCHANT-ID]` on your phone, enter the amount, show the QR to the customer.

**Questions?** Contact [YOUR NAME] at [YOUR PHONE] or [YOUR EMAIL]

---

## Follow-Up Schedule

| Time | Action |
|------|--------|
| Day 7 | Check in — any issues? How many payments? |
| Month 1 | Share their payment stats, celebrate milestones |
| Month 3 | Review: are they recommending to other merchants? |
| Ongoing | Include in monthly community newsletter |

---

## Circular Spend Incentives

The goal is for merchants to **spend Bitcoin at other merchants** — creating the circular economy.

Ideas that work:
- **"Spend where you earn" pledge** — Merchants commit to spending 10% of Bitcoin received at other network merchants
- **Monthly circular spend leaderboard** — Public recognition for top circular spenders
- **Merchant meetups** — Host monthly breakfast or coffee at a participating merchant
- **Joint promotions** — "Buy at Glacier, get 5% off at the Bookshop" cross-merchant deals
