# Why ArxMint

**Accept Bitcoin payments. Zero fees. No middleman. Any wallet.**

---

## The Problem

There's no good way for a small business to accept Bitcoin today.

**Option A: Easy but custodial** (Strike, OpenNode, Square)
You sign up, they hold your money, they require KYC, they can freeze your account, and they still take fees. You've traded Stripe for another middleman.

**Option B: Sovereign but hard** (BTCPay Server)
You get a VPS, install Docker, configure a Lightning node, manage channels, set up DNS, and maintain it forever. Realistic for developers. Not realistic for a farmer's market vendor with five businesses.

**Option C: Nothing.**
Most local merchants choose this. They'd accept Bitcoin, but the setup is too hard and the custodial options defeat the purpose.

ArxMint is Option D.

---

## What ArxMint Does

ArxMint gives any business sovereign Bitcoin payment infrastructure — without the DevOps.

**Three questions. Fifteen minutes. Live.**

A merchant describes their business in plain language. ArxMint generates a complete payment stack: Lightning node, ecash mint, privacy defaults, and a checkout page. Deployed as a single Docker command or managed for you.

No SSH. No channel management. No DNS configuration. No KYC. No custody.

---

## How It Works — Both Sides

### For customers (the person paying):

**You don't need anything new.** Any Lightning-compatible wallet works:

- Cash App
- Strike
- Phoenix
- Muun
- Wallet of Satoshi
- Blue Wallet
- Zeus
- Any other Lightning wallet

Customer scans a QR code, confirms, done. Payment settles in seconds. No new app to download, no account to create, no special network to join.

For more privacy, customers can pay with Cashu ecash — unlinkable, instant, and zero-knowledge. But it's optional. Lightning works out of the box.

### For merchants (the business):

You keep 100% of every payment. Settlement is instant — not 2-3 business days. No chargebacks. No account freezes. No one between you and your money.

Your payment infrastructure runs on your terms:
- **Your node, your keys** — funds go directly to you
- **Your data stays yours** — transaction history never leaves your infrastructure
- **No platform risk** — no one can freeze, pause, or close your account
- **Zero processing fees** — Lightning routing costs less than $0.001 per transaction

---

## The Gap ArxMint Fills

| | Stripe | Strike / OpenNode | BTCPay Server | ArxMint |
|---|---|---|---|---|
| **Fees** | 2.9% + 30c | 1-2% | 0% | 0% |
| **Settlement** | 2-3 days | Same day | Instant | Instant |
| **Custody** | They hold it | They hold it | You hold it | You hold it |
| **KYC required** | Yes | Yes | No | No |
| **Can freeze your funds** | Yes | Yes | No | No |
| **Setup difficulty** | Easy | Easy | Hard (VPS, Docker, DNS, channels) | Easy (3 questions) |
| **Chargebacks** | Yes ($4.7B disputed in 2023) | Limited | No | No |
| **Privacy** | They see everything | They see everything | Good | Strong (ecash blinding) |
| **Any wallet can pay** | Cards only | Lightning only | Lightning + on-chain | Lightning + ecash + on-chain |
| **Open source** | No | No | Yes | Yes |

**ArxMint is the only option that is simultaneously self-custodial, easy to set up, and open source.**

---

## The Circular Economy

This isn't just about one merchant accepting Bitcoin. It's about what happens when many do.

**Today:** Customer pays merchant via Stripe. Stripe takes 2.9%. Merchant pays supplier via Stripe. Stripe takes 2.9% again. Every transaction leaks value out of the community to payment processors.

**With ArxMint:** Customer pays merchant in sats. Merchant pays supplier in sats. Supplier pays another local business in sats. Money circulates locally instead of being extracted by intermediaries.

When a cluster of merchants in the same area all run ArxMint:
- Payments between them are instant and free
- Transaction data stays private and local
- No value extracted by Visa, Mastercard, Stripe, or banks
- The community builds real economic sovereignty

This is what a Bitcoin circular economy looks like in practice. Not buying and holding — actually spending and earning Bitcoin as money.

---

## Who It's For

**Local merchants** who want to accept Bitcoin without hiring a sysadmin. A coffee shop, a farmer's market vendor, a barbershop, a freelancer — anyone selling goods or services.

**Online businesses** that want a "Pay with Bitcoin" button on their website without going through a custodial payment processor.

**AI agents** that need to buy and sell services programmatically. ArxMint provides L402 Lightning paywalls and Cashu ecash for machine-to-machine commerce — no identity, no accounts, no custody. Agents and humans share the same payment infrastructure.

**Communities** that want to bootstrap a local Bitcoin economy. One deployment serves an entire network of merchants, customers, and agents.

---

## The Math

A business doing $10,000/month in revenue pays Stripe **$320/month** ($3,840/year).

With ArxMint, that same business pays **$0 in processing fees**. Lightning routing costs are negligible — typically under $0.01 per transaction.

| Monthly Revenue | Stripe Fees/Year | ArxMint Fees/Year | Annual Savings |
|---|---|---|---|
| $5,000 | $1,920 | ~$0 | **$1,920** |
| $10,000 | $3,840 | ~$0 | **$3,840** |
| $50,000 | $17,760 | ~$0 | **$17,760** |
| $100,000 | $36,000 | ~$0 | **$36,000** |

For a community of 20 merchants averaging $10K/month each, that's **$76,800/year** staying in the local economy instead of going to payment processors.

---

## How It's Built

ArxMint integrates the best open-source Bitcoin tools into a single deployable stack:

- **Lightning Network** — instant global payments, any wallet can pay
- **Cashu ecash** — private bearer tokens, unlinkable transactions
- **Fedimint federations** — community-governed custody, no single point of failure
- **L402 paywalls** — machine-native payments for AI agent commerce

Each of these tools is powerful alone but hard to deploy and connect. ArxMint is the integration layer that makes them work together as one system. More ArxMint deployments means more real-world users for every ecash and federation project in the ecosystem.

**Open source. Self-hostable. No vendor lock-in.**

---

## Current Status

- Merchant signup directory live at [arxmint.com/merchants](https://www.arxmint.com/merchants)
- First seed merchant: Glacier Ice Cream (Fort Collins, CO)
- Community generator and deployment wizard built
- Grant applications submitted to OpenSats, HRF, and Spiral
- Pilot planned for Colorado Front Range — farmer's markets, local businesses, artist co-ops

---

## Get Involved

**Merchants:** Sign up at [arxmint.com/merchants](https://www.arxmint.com/merchants) to join the pre-launch network.

**Developers:** The codebase is open source. Built with Next.js, TypeScript, and Tailwind. PRs welcome.

**Communities:** If you want to bring a Bitcoin circular economy to your area, reach out. The replication playbook is ready.
