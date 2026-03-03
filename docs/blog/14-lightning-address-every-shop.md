# Lightning Address for Every Shop: The Physical-World Guide to Bitcoin Payments

**Target publish date:** June 3, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** lightning address merchant, bitcoin point of sale, accept lightning payments, bitcoin qr payment, bitcoin tap to pay

---

Print a QR code. Tape it to the counter. You're now accepting Bitcoin.

That's not a simplification. That's the actual setup for in-person Lightning payments. No card reader. No merchant account. No monthly hardware rental. A QR code on a piece of paper, and a dashboard on your phone or a tablet behind the counter.

Here's how it works in practice — the daily reality of a brick-and-mortar shop accepting Lightning payments.

## Your Lightning Address

When you set up an ArxMint node, you get a Lightning Address. It looks like an email address:

`yourshop@pay.arxmint.cloud`

Or, with a custom domain:

`pay@yourshop.com`

That address is where people send you money. They type it into their Lightning wallet, enter an amount, and send. The payment arrives in your wallet instantly. Think of it as a permanent, reusable payment destination — your shop's financial address.

Customers can also use this address to pay you from anywhere in the world. A regular who moved away can still buy a gift card from your store by sending sats to your Lightning Address. No shipping a card reader. No international processing fees.

## The Counter Experience

Here's what a typical in-person payment looks like:

**The merchant side:** Your dashboard (open on a tablet or phone behind the counter) has a "New Invoice" button. Tap it, enter the amount — $4.50 for a coffee — and a QR code appears on screen. Or, for fixed-price items, you can pre-generate QR codes.

**The customer side:** They open any Lightning wallet on their phone (Phoenix, Breez, Zeus, Cash App, Wallet of Satoshi — there are dozens). They scan the QR code. Their wallet shows "$4.50 — confirm?" They tap yes.

**What happens next:** Your tablet makes a sound. "Payment received." The whole thing took about three seconds from scan to confirmation. The customer puts their phone away. You hand them their coffee.

No "chip and wait." No "tap again." No "sorry, declined." Lightning payments either arrive instantly or they don't arrive at all — there's no ambiguous "processing" state.

## Static QR vs. Dynamic Invoice

Two ways to display payment QR codes, and both have their place:

**Static QR code** — A printed QR code that encodes your Lightning Address or an LNURL-pay endpoint. The customer scans it and their wallet asks them to enter an amount. Good for tip jars, donation boxes, or any situation where the amount varies. Print once, use forever.

**Dynamic invoice** — A QR code generated per transaction with the exact amount baked in. The customer scans and just confirms — no amount to enter. Good for point-of-sale where you want speed and accuracy. The QR disappears once paid.

Most shops use both. Static QR taped to the counter for quick payments and tips. Dynamic invoices on the tablet for precise orders.

## NFC Tap-to-Pay

For shops that want the fastest possible checkout, NFC tags take it one step further. A small NFC sticker (like a NuMo tag) sits on the counter. The customer taps their phone to it. Their Lightning wallet opens with the payment pre-loaded. One tap to confirm.

The experience is faster than contactless cards. Tap the sticker, confirm the amount, done. No "hold your card steady" failures. No "please try again."

NFC tags are cheap — a few dollars each — and contain a URL that points to your LNURL-pay endpoint. When the customer taps, their phone reads the URL, opens their wallet app, and presents the payment. All the merchant needs to program is the LNURL, which ArxMint generates automatically.

## The POS Setup

For a basic setup, you need:

- **Your ArxMint node** running (cloud VPS or home hardware)
- **A tablet or phone** behind the counter showing your dashboard
- **A printed QR code** on the counter (optional but recommended for speed)
- **WiFi or mobile data** for the tablet

That's it. No card reader. No thermal printer (though ArxMint can generate printable receipts if you want them). No monthly POS hardware subscription.

The ArxMint dashboard is a Progressive Web App — it works in any browser and can be "installed" on your tablet's home screen. It looks and feels like a native app. The invoice screen is designed for counter use: large QR code, clear amount display, unmissable "paid" confirmation.

For shops that want more structure: the dashboard supports itemized orders, inventory tracking, and shift reports. But none of that is required. The simplest setup is "tap New Invoice, type amount, show QR."

## Tips and Split Payments

**Tips:** Your static QR code or LNURL-pay endpoint can include a tip prompt. The customer scans, sees the suggested amounts (15%, 20%, custom), and adds a tip before confirming. The total arrives as a single payment.

**Split payments:** Two customers want to split a $30 bill. Generate a $15 invoice, one person pays. Generate another $15 invoice, the other pays. Two payments, two confirmations, two seconds each. Simpler than the card reader's "split tender" mode.

**Tabs:** A customer wants to run a tab and pay at the end. Track their orders in the dashboard and generate one invoice at close-out. They scan, pay the total, done.

## What Customers Need

The most common question from merchants: "Do my customers need anything special?"

They need a Lightning wallet on their phone. That's the only prerequisite. The good news: Lightning wallets are free, available on iOS and Android, and take less than five minutes to set up.

The wallets most of your customers will already have or can easily get:

- **Phoenix** — Best overall. Self-custodial. Handles channel management automatically. Free.
- **Breez** — Clean interface, built-in point-of-sale mode. Self-custodial. Free.
- **Zeus** — Connects to your own node or runs embedded. For the sovereignty-minded customer.
- **Cash App** — Yes, Cash App supports Lightning sends. Many customers already have it.
- **Wallet of Satoshi** — Simplest to use. Custodial (they hold the keys), but frictionless for beginners.

You don't need to pick one wallet for your customers. All Lightning wallets are interoperable — any wallet can pay any Lightning invoice. Let customers use what they already have.

## The Table Tent

Many ArxMint merchants print a simple table tent or counter card:

> **We accept Bitcoin**
>
> Scan the QR code with any Lightning wallet.
> Phoenix, Breez, Cash App, and more.
>
> [QR CODE]
>
> No account needed. No fees. Instant.

This answers the three questions customers have: "What do I scan?", "What app do I use?", and "Is it complicated?" The answer to the last one is no.

## What the Numbers Look Like

At the end of the day, your dashboard shows:

- Total payments received
- Number of transactions
- Average transaction size
- Payment timeline (when were your busy hours)

No dispute queue. No "pending settlements." No "on hold for review." Every payment that arrived is final and in your wallet.

Your daily close-out is: glance at the total, compare to your sales count, done. The reconciliation that takes Stripe merchants 30 minutes takes you 30 seconds.

## The Bottom Line

A Lightning Address is your shop's payment destination. A QR code on the counter is your payment terminal. A tablet with a browser is your POS system. The total hardware cost is whatever you already own plus a piece of paper.

Your address, your counter, your money. Every transaction final. Every sale yours.
