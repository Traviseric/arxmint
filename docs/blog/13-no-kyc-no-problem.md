# No KYC, No Problem: Why ArxMint Doesn't Need Your Identity

**Target publish date:** May 27, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** no kyc bitcoin, accept bitcoin no verification, nostr identity, bitcoin merchant no id, censorship resistant payments

---

Stripe asks for your SSN, bank statements, a photo of your government ID, and your business registration documents. Square wants the same. PayPal wants the same. Before you can accept your first dollar, every major payment processor demands you prove who you are, where you live, and that you're authorized to run a business.

ArxMint asks for a store name.

That's not a loophole. It's the legal consequence of a fundamentally different architecture.

## Why Stripe Needs Your Identity

Stripe is a registered Money Services Business. It holds your money — even for just a few seconds — between the customer paying and you receiving settlement. That makes Stripe a money transmitter under FinCEN regulations. Money transmitters are legally required to know their customers: Anti-Money Laundering programs, Bank Secrecy Act compliance, suspicious activity reporting.

This is why Stripe asks for your SSN. Not because they're curious. Because federal law says they have to.

PayPal, Square, Adyen, every hosted payment processor — same story. If they touch your money, they have to know who you are.

## Why ArxMint Doesn't

When you run an ArxMint node, payments flow directly from your customer to your node. ArxMint (the software) never touches, holds, or routes the funds. There's no middleman to regulate because there is no middleman.

FinCEN's 2019 guidance explicitly addresses this. A merchant accepting cryptocurrency as "payment for goods or services" is classified as a "user" of the network — not a money transmitter. Users are exempt from MSB registration requirements. You're selling your own goods and accepting payment. That's commerce, not money transmission.

The DOJ's 2025 safe harbor extends this further: software that "solely automates peer-to-peer transactions" where "a third party does not have custody and control over user assets" is explicitly exempt.

ArxMint is open-source software running on your own hardware. You hold the keys. You run the node. ArxMint the company has no access to your funds, your customer data, or your transaction history. There's nothing to report because there's nothing to see.

## What About Identity?

No KYC doesn't mean no identity. It means identity is your choice, not a requirement.

Many merchants *want* to be known. A coffee shop wants its name on the door. A freelancer wants clients to find them. The question is whether identity should be a prerequisite for accepting payment — or something you add when it benefits you.

ArxMint supports Nostr-based identity as an optional layer. Nostr is a simple protocol: you get a cryptographic keypair (a public key and a private key), and that keypair is your identity across every Nostr-compatible app.

What this means in practice:

- **Your Nostr public key** is your merchant identifier. It works across payment systems, social networks, marketplaces, and directories — all without uploading a single document.
- **Your Nostr profile** can include your store name, description, location, and photo. As much or as little as you want.
- **Verification** happens through community trust, not corporate gatekeeping. Customers who've bought from you before can vouch for you. Your reputation builds through transactions, not paperwork.
- **Portability.** If you switch platforms, your identity comes with you. A Nostr key isn't owned by ArxMint or any other service. It's yours.

## The Deplatforming Problem

In 2022, PayPal updated its Acceptable Use Policy to include fines of $2,500 per violation for "misinformation." They walked it back after public backlash — but the underlying power didn't change. PayPal can still close your account and hold your funds for any reason, at any time.

Stripe can too. So can Square. Every hosted payment processor has an acceptable use policy that gives them unilateral authority to deplatform you. Your business depends on someone else's terms of service.

When you run your own payment node, there is no acceptable use policy. No one can deplatform you because there's no platform. The node is software on your hardware. The domain is yours (or a managed subdomain you can replace). The funds are in your wallet. The only person who can shut down your payment processing is you.

This isn't a hypothetical benefit. Real businesses have been cut off from payment processing for selling legal products that a payment processor deemed "high risk" — firearms accessories, supplements, adult content, political merchandise. Not illegal. Just unpopular with the processor's risk department.

## The Practical Angle

For most merchants, the KYC issue isn't about censorship resistance. It's about friction.

Setting up a Stripe account takes days. You submit documents, wait for verification, sometimes get asked for additional documentation. Business verification can take a week. If you're a sole proprietor, a freelancer, or a small operation in a country where Stripe barely operates, the process is worse.

ArxMint takes 15 minutes. You answer three questions, your node provisions, and you're accepting payments. No documents uploaded. No verification wait. No "your account is under review."

For a farmer's market vendor who wants to accept Bitcoin this Saturday, that difference matters more than any philosophical argument about sovereignty.

## What Customers See

From the customer's perspective, the experience is the same whether the merchant used KYC or not. They see a checkout page, a QR code, a price. They pay. They get their product.

The difference is invisible to the customer and enormously valuable to the merchant: no third party sitting between them, no one who can freeze the relationship, no one selling the transaction data.

## The Honest Caveat

No KYC for accepting payments doesn't mean no tax obligations. If you're a business earning income, you're responsible for reporting it according to your jurisdiction's laws. ArxMint provides transaction logs and export tools for exactly this purpose. What ArxMint doesn't do is report your sales to anyone on your behalf — because ArxMint never sees your sales.

The merchant handles their own bookkeeping, the same way any cash-based business always has. The difference: your transaction log is structured, timestamped, and exportable — better records than a cash drawer.

## The Bottom Line

KYC exists because payment processors hold your money and regulators require them to know whose money they're holding. When you run your own node, nobody holds your money but you. The identity requirement disappears because the legal trigger for it — third-party custody — doesn't exist.

Your business. Your node. Your keys. No permission needed to sell your own work.
