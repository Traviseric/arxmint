# The Software Is Free. Here's How We Stay Alive.

**Target publish date:** June 10, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** open source business model, bitcoin startup funding, red hat model, sustainable open source, bitcoin grants

---

The software is free. It will always be free. MIT licensed — anyone can use it, modify it, deploy it, sell services on top of it. No "community edition" with crippled features. No license key that expires. The full ArxMint merchant stack, permanently open source.

So how does a company that gives away its product stay alive? The same way Red Hat built a $34 billion business selling support for free software: the product is the software, the business is making it effortless to run.

## Why We Can't Charge Transaction Fees

This isn't a philosophical choice. It's a legal one.

If ArxMint charged a percentage of each transaction, we'd need to touch the payment flow. Routing funds through our infrastructure — even to skim a fee — makes us a money transmitter under FinCEN regulations. That triggers federal MSB registration, up to 49 state licenses, AML compliance programs, and enough legal overhead to kill a startup before it ships anything.

The whole point of ArxMint's architecture is that we never touch merchant funds. Payments flow directly from customer to merchant's node. ArxMint can't charge fees on payments we never see, and that's by design. It's what keeps the system non-custodial and keeps merchants in full control.

## Revenue Stream 1: Managed Hosting

The core business. ArxMint provisions and manages your payment node for $15-25 per month.

What that covers:
- **VPS provisioning and management** — We set up your node on your cloud account (BYOC — Bring Your Own Cloud). The compute costs ~$5-7/month at Hetzner. You own the instance. We manage it.
- **Managed DNS** — `yourstore.arxmint.cloud` subdomain, auto-configured, auto-renewed TLS.
- **Signed stack updates** — Tested version bundles applied during your maintenance window. Automatic rollback if health checks fail.
- **Zero-knowledge encrypted backups** — Your data encrypted locally with a key derived from your seed phrase. We store the blobs, we can't read them.
- **Health monitoring** — Dashboard alerts if your node needs attention. We see uptime metrics, not transaction data.

The margin isn't on the hosting — it's on the automation. Setting up and managing a Lightning payment node yourself costs the same $5-7/month in raw compute but requires hours of operational knowledge. ArxMint compresses that into a subscription.

For self-managed merchants: you get all the same software, all the same features, and you handle operations yourself. Cost: $5-7/month for the VPS. Nothing to ArxMint.

## Revenue Stream 2: Premium Support

For merchants who need more than software:

- **Setup assistance** — Help configuring custom domains, integrating with existing websites, connecting to accounting software.
- **Migration support** — Moving from BTCPay Server, switching hosting providers, or upgrading from home node to cloud.
- **Incident response** — When something goes wrong and you need a human who understands Lightning node operations, not a chatbot.
- **Consulting** — Channel management strategy, liquidity optimization, multi-location deployment planning.

Support tiers scale with the merchant's needs. A coffee shop running 20 transactions a day needs less than an e-commerce store doing 500. Pricing reflects that.

## Revenue Stream 3: Grants

Open-source Bitcoin infrastructure gets funded. This is real money, not charity.

BTCPay Server survived its first four years primarily on grants. OpenSats, HRF (Human Rights Foundation), and Spiral (formerly Square Crypto) fund projects that advance Bitcoin's open-source ecosystem. Individual grants range from $50K to $200K.

ArxMint qualifies because it's the integration layer. OpenSats funds Cashu TS, Nutshell, Fedimint, and CDK as individual tools. HRF funds privacy-preserving Bitcoin infrastructure. ArxMint makes these funded tools work together as a single deployable merchant stack. More ArxMint deployments means more real-world users for every ecash and federation project in the ecosystem.

Grant funding covers core development — the open-source software, protocol integrations, security audits. It doesn't depend on merchant revenue, which means there's no pressure to add fees or lock-in mechanisms to generate returns.

## Revenue Stream 4: Teneo Marketplace

ArxMint handles the payment rails for the Teneo digital marketplace — courses, books, tools, and digital products sold through a shared platform. Revenue comes from a cut of marketplace transactions, processed through the same Lightning infrastructure ArxMint builds for merchants.

This is a separate revenue stream from merchant hosting. It leverages the same technology (Lightning payments, ecash, L402 paywalls) but generates income from content sales rather than infrastructure subscriptions.

## Why Not VC Funding?

Venture capital wants returns. Returns require either raising prices, adding fees, or selling the company. Each of those outcomes conflicts with ArxMint's architecture:

- **Adding fees** requires touching payments, which requires money transmission licensing
- **Raising prices** to 10x returns means squeezing merchants who chose ArxMint to avoid being squeezed
- **Selling** means the acquirer now controls infrastructure that merchants depend on

The bootstrap-plus-grants model avoids this entirely. ArxMint doesn't need an exit. It needs enough revenue to sustain development and operations. The managed hosting margin plus grants plus marketplace revenue achieves that without external pressure to extract more from merchants.

This is the Red Hat model. IBM acquired Red Hat for $34 billion — not because Red Hat owned Linux, but because enterprises paid for the confidence that their Linux infrastructure would work, stay updated, and have someone to call when it didn't.

ArxMint doesn't own Lightning. We don't own Cashu or LND or Fedimint. We make them work together for merchants who'd rather pay $20/month for managed operations than spend 20 hours learning to be a node operator.

## The Incentive Alignment

Here's what matters: ArxMint's business model only works if the software is genuinely good. If the open-source stack is unreliable, no one pays for managed hosting. If merchants don't trust the update process, they won't subscribe to managed operations.

Our incentive is to make the software so good that merchants want help running it — not to make the software deliberately complex so they need help. The self-managed path is always available, always functional, always free. The managed path is for merchants who value their time more than the $15-25 difference.

This is the same dynamic that sustains every successful open-source infrastructure company. The software earns trust. The service earns revenue. Neither works without the other.

## What This Means for You

If you're evaluating ArxMint as a merchant: the software is free and the exit cost is zero. If ArxMint disappears tomorrow, your node still runs, your seed phrase still recovers your funds, and the open-source code is still on GitHub. You're not locked in by proprietary software, migration costs, or data portability — you're staying because the service is worth it.

If you're evaluating ArxMint as a contributor: the codebase is MIT licensed and the development is grant-funded. Contributions improve software that merchants actually run. There's no corporate governance that can revoke the license or close-source the code.

If you're evaluating ArxMint as a grant organization: your funding goes directly to open-source development that increases real-world usage of the tools you already fund. Every ArxMint merchant is a running instance of Cashu, LND, and the broader Lightning ecosystem.

The software is free. The operational peace of mind is the product. Our incentive is to make your node so reliable you forget it's there — and worth the subscription when you remember.

No lock-in. No fees. No permission needed.
