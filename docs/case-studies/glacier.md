# Case Study: Glacier Ice Cream — Fort Collins, CO

**First Bitcoin circular economy transaction in Northern Colorado**

---

## The Business

The Ice Cream Parlor by Glacier has been serving hand-crafted ice cream to Fort Collins since [year]. Located in the heart of Old Town, Glacier attracts local families, Colorado State University students, and tourists exploring the city's vibrant downtown.

Like many small local businesses, Glacier operated on cash and card — subject to 2-3% card processing fees, multi-day settlement delays, and the constant overhead of managing a payment terminal.

---

## The Problem

**Cash-only limits reach. Card payments cost too much.**

Owner [Name] wanted to reach the growing community of Bitcoin users in Fort Collins — a college town with strong technology roots — but traditional Bitcoin processors came with the same friction as cards: KYC forms, monthly fees, technical complexity.

The bigger vision was to participate in a local circular economy: connect with other Fort Collins merchants, enable customers to earn and spend Bitcoin locally, and reduce dependence on banking rails.

> *"I wanted to accept Bitcoin, but I didn't want to set up a server or deal with hardware. I just wanted to plug in and take payments."*
> — [Owner Name], The Ice Cream Parlor by Glacier *(placeholder — to be filled in with merchant quote)*

---

## The Solution

ArxMint activated Glacier's checkout page in under 10 minutes:

1. **Submitted merchant application** at [arxmint.com/merchants](https://arxmint.com/merchants)
2. **Received merchant ID** (`seed-glacier`) upon approval
3. **Linked checkout URL** (`arxmint.com/pay/seed-glacier`) from their website and printed QR code for the counter

No hardware required. No app to install. Customers pay with any Lightning wallet by scanning a QR code.

---

## How It Works In-Store

1. Customer orders ice cream
2. Cashier taps the Glacier checkout link (or customer scans counter QR)
3. Customer opens their Lightning wallet, scans the QR, pays in under 3 seconds
4. Payment confirmed instantly — no waiting, no receipt printer needed

The default checkout amount is 500 sats (approximately $0.50 at $100K BTC) — customers can adjust the amount up or down for their order.

---

## Results

*(Placeholder metrics — to be updated with live data from the pilot)*

| Metric | Value |
|--------|-------|
| Time to go live | < 10 minutes |
| Processing fees | 0% |
| Settlement time | Instant (< 3 seconds) |
| Lightning wallets accepted | All (BOLT11 standard) |
| Transactions to date | [X] |
| Unique customers | [X] |
| Average transaction | [X] sats |

---

## What's Next

Glacier is one of the **founding merchants in the Fort Collins Bitcoin Circular Economy pilot**, alongside [other local businesses]. As the network grows:

- Customers who spend Bitcoin at Glacier can earn it back at participating merchants
- Merchants will be able to pay each other in Lightning (B2B circular spend)
- The network will use ArxMint's BCE health dashboard to track community maturity

---

## Replicate This

Any merchant can join the ArxMint network:

1. Apply at [arxmint.com/merchants](https://arxmint.com/merchants)
2. Get approved (typically within 48 hours)
3. Go live with a hosted checkout page — no code, no hardware

Developers can also use the [ArxMint SDK](../sdk-reference.md) to build custom checkout integrations.

---

*Want to be featured as a case study? Email [travis@arxmint.com](mailto:travis@arxmint.com).*
