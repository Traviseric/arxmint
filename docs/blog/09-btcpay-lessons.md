# BTCPay Server Taught Us Everything (And Where We Diverge)

**Target publish date:** April 29, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** btcpay server, bitcoin payment processor comparison, self-hosted payments, lightning merchant, btcpay alternative

---

If you accept Bitcoin payments without a middleman today, you probably owe BTCPay Server something. It proved the model works — seven years of real merchants, real payments, fully open source. ArxMint wouldn't exist without the path BTCPay cut.

But BTCPay was built for merchants who are willing to be operators. ArxMint is built for merchants who just want to stop paying 2.9% per transaction. Same goal — no middleman — different audience. Here's what we learned studying BTCPay, and where we're taking a different path.

## Lesson 1: The One-Click Deploy Is About DNS, Not Docker

BTCPay's LunaNode integration is often described as a "one-click Docker deploy." That undersells the actual insight. The breakthrough isn't automating `docker compose up` — it's the auto-generated `*.lndyn.com` subdomain that ships with every LunaNode deployment.

DNS is the merchant-killer. Not Docker, not Linux, not SSH. Our research across 11 studies confirmed this: non-technical merchants abandon onboarding at the "configure your domain" step more than any other. Buying a domain, setting A records, waiting for propagation, configuring TLS — each step is a cliff.

BTCPay solved this with managed subdomains. ArxMint applies the same pattern: `storename.arxmint.cloud` as the default, managed by ArxMint's DNS zone. Custom domains available as an upgrade, never as a prerequisite.

## Lesson 2: The Configurator Proves Deployment Is a Product Surface

BTCPay's Configurator is a web-based tool that generates deployment configurations. It's not just a convenience — it's a statement that deployment is a first-class product surface, not a README appendix.

ArxMint takes this further: the three-question wizard isn't generating a config file for the merchant to run. It's provisioning actual infrastructure. The merchant answers three questions ("where will it run," "store name," "online or in-person"), and the provisioning service creates a VPS, installs the stack, assigns DNS, and opens an LSP channel. The merchant's next interaction is with their dashboard, not a terminal.

## Lesson 3: Documentation Is Operator Documentation

BTCPay has extensive documentation on DNS configuration, Tor setup, tunnel alternatives, backup scripts, and manual recovery procedures. It's thorough and well-maintained.

But here's the pattern: it's operator documentation. It assumes the reader is comfortable with SSH, Docker, and networking concepts. That's appropriate for BTCPay's audience — technically inclined Bitcoiners who value sovereignty and are willing to learn operations.

ArxMint is targeting a different persona: the coffee shop owner who wants to stop paying 2.9% to Stripe. That merchant doesn't want more documentation — they want fewer operational modes and safe defaults. ArxMint's approach is to eliminate the decisions that require documentation, not to document them better.

## Lesson 4: Full Chain Sync Is the Silent Killer

A BTCPay deployment with a full Bitcoin node takes 1-7 days for the initial blockchain sync, depending on hardware and bandwidth. During that time, the merchant can't accept payments. They've committed to the setup, paid for hosting, configured their domain — and now they wait.

Many merchants don't come back after the wait.

ArxMint uses LND with Neutrino, a light client that validates block headers without downloading the full 600+ GB chain. The node is operational within minutes. Full node mode is available as an upgrade path for merchants who want maximum verification, but it's not the default and it's not blocking onboarding.

This is arguably the highest-impact single decision in ArxMint's merchant stack.

## Lesson 5: Broken Links Erode Trust

During our competitive benchmarking, we found that BTCPay's `/filter/hosts` directory link returned a 404. A small thing. But for a merchant evaluating whether to trust a platform with their business, broken onboarding surfaces signal fragility.

This isn't a criticism of BTCPay — link rot happens to every project. It's a reminder that onboarding is the moment of maximum scrutiny. Every dead link, confusing error, or unexplained delay is a merchant lost.

## Where We Diverge

### Ecash-First, Not Lightning-Only

BTCPay is fundamentally a Lightning (and on-chain) payment processor. ArxMint adds Cashu ecash as a first-class payment method. Ecash payments are instant, free, and provide sender-receiver unlinkability that Lightning alone can't match.

For a coffee shop, the difference matters. A Lightning payment requires the customer to have a Lightning wallet with sufficient outbound capacity, and the merchant to have sufficient inbound capacity. An ecash payment requires the customer to have ecash tokens — which can be as simple as scanning a QR code to receive them.

### Managed Infrastructure Layer

BTCPay is software you install. ArxMint is software plus optional managed infrastructure. The provisioning service, managed DNS, signed stack updates, encrypted backup storage, and health monitoring are services that sit on top of the open-source software.

BTCPay deliberately avoids this layer — their philosophy is that the merchant should own and operate everything. ArxMint's position is that most merchants won't, and the infrastructure layer can be non-custodial while still reducing operational burden.

### Appliance Updates vs. Manual Docker Pulls

BTCPay updates are manual: SSH into the server, run the update script, hope nothing breaks. ArxMint ships tested stack BOMs (bill of materials) — locked versions applied as a unit during the merchant's configured maintenance window. Automatic rollback on failed health checks. Canary rings for staged rollout.

The merchant sees "update available" in their dashboard and taps apply. Or, if they've opted into auto-updates for patches, they don't see anything at all — the node quietly applies the patch during the maintenance window and verifies itself.

### The BTCPay 2024 Roadmap Validates the Gap

BTCPay's 2024 roadmap announced a cross-platform app with LDK and LSP integration — a mobile-first merchant experience that doesn't require a full server. This confirms the gap ArxMint is targeting: the space between "install a server" and "use a custodial service."

BTCPay is approaching it from the server side, adding mobile as an interface. ArxMint is approaching it from the merchant side, making the server invisible.

## Respect Where It's Due

BTCPay Server runs real merchants processing real payments. It has seven years of battle-testing, a large contributor community, and a track record that no other self-hosted Bitcoin payment solution can match. ArxMint wouldn't exist without the path BTCPay cut.

The difference isn't quality — it's target audience. BTCPay is built for merchants who are willing to be operators. ArxMint is built for merchants who just want to accept Bitcoin.

Both are needed. The market is big enough.
