# Managed Self-Hosting for ArxMint Phase 5

## The operational UX gap

Phase 5’s “merchant runs their own payment node” implies an operations surface area that is fundamentally different from “install an app.” Even mature self-hosted payment stacks acknowledge that: BTCPay’s documentation explicitly discourages manual installs for production and points to a Docker-based deployment because it wires components together, provides an update system, and sets up HTTPS automatically—precisely because these are recurring operational burdens. citeturn20search3turn13search16

What breaks for a non-technical merchant is not the *concept* of non-custodial payments, but the hidden work required to keep a server reliable and safe:

- **DNS + edge routing**: even “one-click” wizards frequently ask the user to point a hostname to an IP (create DNS records) and pick a public hostname. citeturn12view0turn12view1  
- **TLS certificates**: production-grade HTTPS implies certificate issuance and renewals; wizards often ask for an email specifically because Let’s Encrypt will send expiration notices. citeturn12view0turn7search5turn7search8  
- **Updates**: a merchant can’t safely reason about version compatibility across Bitcoin node sync, Lightning, database migrations, and the Cashu mint layer; yet updates are a security-and-uptime necessity. (BTCPay’s Docker deployment exposes an “update script” model, which is still too “terminal-centric” for most merchants.) citeturn20search7turn13search0  
- **Backups in a Lightning world**: backups are unusually treacherous because old Lightning channel states can be “toxic” in recovery scenarios; BTCPay explicitly warns that restoring outdated channel state can cost channel funds and recommends active/continuous handling of the static channel backup, not just nightly snapshots. citeturn13search0turn13search21turn21view0  
- **Monitoring + incident response**: merchants do not want Grafana; they want “green check / red check,” alerts, and fast human support—without giving an operator the ability to move funds.

So the core product question becomes: how do you *productize* the operational layer such that a merchant never touches DNS/SSL/updates/backups, yet still “holds the keys”?

## What existing solutions reveal about “managed non-custodial” ops

The closest real-world precedent to “we manage infrastructure; you hold keys” is the entity["company","Voltage","bitcoin lightning infrastructure firm"] approach to Lightning node hosting.

Voltage is unusually explicit about the trust boundary: they state they have no access to a customer’s seed phrase, passwords, or macaroons and therefore cannot see transactions or spend funds—while still emphasizing that customers are trusting them with uptime, networking, and infrastructure. citeturn8view1 Their Terms of Service also include a “Noncustodial Agreement” section asserting they do not keep backups or copies of passwords/seed phrases that would allow access to user funds. citeturn8view0 (In parallel, their documentation describes client-side encryption of backed-up sensitive material such that Voltage cannot view it, which is a common way non-custodial hosts operationalize “we can store encrypted blobs, but cannot decrypt them.”) citeturn9view0turn8view1

Voltage’s engineering choices are directly relevant to ArxMint’s “managed self-hosting” problem because they target the exact operational pain points merchants struggle with:

- **Trusted TLS by default**: Voltage discusses adding support for TLS certificates signed by a trusted CA, improving UX and enabling modern browser-based integrations while keeping traffic encrypted end-to-end to the node. citeturn8view1turn21view0  
- **Secrets never landing where the host can trivially read them**: they describe approaches like “stateless-init” so macaroons aren’t written to disk, and browser-side encryption of credentials before any backup is stored. citeturn8view1turn9view0  
- **Operational monitoring without internal node visibility**: their docs state they monitor infrastructure health, but because they don’t have macaroons, they can’t see “inside” the node; the boundary is enforced as a product constraint. citeturn9view0

On the “appliance UX” end of the spectrum, consumer-grade node systems show what non-technical operations can look like when you control the environment:

- entity["company","Umbrel","home server software company"] markets Lightning/Bitcoin node operation as “one-click easy,” and even exposes backup-related updates in its app release notes—i.e., backups are a first-class UX feature, not a sysadmin exercise. citeturn20search4turn20search0  
- entity["company","Start9","self-hosted server company"] emphasizes a simple graphical interface with “no command line required,” and discusses backup operation models (e.g., diff-based backups). citeturn20search5turn20search1

A “one-click VPS wizard” example also shows where friction remains: the entity["company","LunaNode","canadian vps provider"] BTCPay launcher still requires API keys, funds on account, and DNS A-record changes for custom hostnames. citeturn12view0turn12view1 Even when the UX is optimized, initial chain sync time is framed in days and may require paid acceleration to reduce from ~7 days to ~2–3 days. citeturn12view0turn12view1

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Voltage Cloud dashboard lightning node","BTCPay Server point of sale interface","UmbrelOS dashboard lightning node","Start9 StartOS marketplace interface"],"num_per_query":1}

The key lesson: the “Voltage model” is not just pricing or legal posture—it’s an operational product: default TLS, managed lifecycle, encrypted backups, and an opinionated trust boundary.

## A reference design for ArxMint Cloud

A workable approach is to treat “self-hosting” as an implementation detail hidden behind a merchant-facing **control-plane app** and a restricted **data-plane node**. The merchant experiences “download app, start accepting,” while the architecture remains: merchant has their own node instance and holds secrets.

A reference design for entity["company","ArxMint","merchant bitcoin payments stack"] Cloud naturally decomposes into six operational guarantees, each with concrete design implications.

**Identity, DNS, and SSL without merchant action**  
The fastest path to “Stripe-like” is not letting merchants touch DNS at all. The default should be a first-party domain (e.g., `merchant-id.arxmint.cloud`) where ArxMint’s control plane provisions DNS and certificates automatically.

- Use automated certificate issuance via ACME; Let’s Encrypt’s own documentation describes ACME-based automated domain validation and issuance as the intended workflow, and RFC 8555 defines the ACME protocol precisely for automating verification and certificate issuance. citeturn7search5turn7search8turn7search14  
- Only expose “custom domain” as an advanced feature, and if you do, prefer a single CNAME instruction over “add multiple records,” because the LunaNode wizard demonstrates that “create an A record at your registrar” is already beyond many users’ comfort zone. citeturn12view0turn12view1

**Updates with rollback, not “docker compose pull”**  
Merchants cannot be asked to reason about version matrices. The update system has to be controlled, staged, and reversible. BTCPay’s model of providing explicit update scripts is a step toward operationalization but still presumes SSH/terminal access. citeturn20search7turn20search15  
For ArxMint Cloud, the equivalent needs to be “tap Update” (or fully automatic with maintenance windows) with:

- a pinned release channel (stable vs. beta),  
- health-checked deployments,  
- automated rollback if payment acceptance or mint functions degrade.

**Backups designed around Lightning and mint state, not disk snapshots**  
The biggest trap in “managed self-hosting” is thinking “VM snapshot = backup.” For Lightning, naïvely restoring old state is dangerous: BTCPay warns that old channel state is “toxic” and can cause channel fund loss if a node closes based on outdated state; their guidance recommends more continuous handling of the static channel backup rather than relying on nightly backups in a disaster scenario. citeturn13search0turn13search21

A robust ArxMint Cloud backup model should separate:

- **Recoverable-by-resync data**: Bitcoin chain data is typically re-downloadable; BTCPay’s backup process even excludes blockchain `blocks` and `chainstate` directories. citeturn13search0  
- **Irreplaceable operational state**: Lightning wallet seed + the latest static channel backup stream, plus the Cashu mint’s key material and DB.

Voltage’s LND security documentation describes both the importance of the seed phrase and the need for static channel backups; it also describes streaming channel backup updates via LND APIs as an automation-friendly method. citeturn21view0 The Lightning Labs API documentation also makes clear that restoring channel backups is a dedicated node recovery pathway. citeturn13search21

**Key custody boundary enforced by least-privilege credentials**  
Even if “ArxMint can’t SSH,” the more realistic threat is *software supply chain or operator-level access causing credential exfiltration*. One critical mitigation is to **engineer the node so that the only credentials available to the merchant stack are incapable of spending funds**.

LND’s macaroon system is designed for granular permissioning, and documentation explicitly frames macaroons as capability tokens that can restrict permissions down to specific RPC calls. citeturn0search16turn21view0 Voltage’s LND documentation also distinguishes default macaroons (admin vs read-only vs invoice) and warns that anyone with an admin macaroon can act as the node over RPC—exactly why the merchant stack should not possess admin authority unless the merchant explicitly enables it. citeturn21view0turn13search15

Practically, for a merchant checkout/webhook engine, “invoice creation + invoice read + basic node info” is usually sufficient; “send coins” should be out-of-scope for the runtime services.

**Monitoring that proves reliability without becoming custody**  
Voltage’s docs illustrate a sharp line: they monitor infrastructure, but because they don’t have macaroons, they can’t see what’s happening inside the node, and they explicitly tell users they must also monitor their node. citeturn9view0  
ArxMint Cloud can do better for non-technical merchants by offering:

- infrastructure-level monitoring by default (CPU/disk/network, process health), and  
- **opt-in** application-level telemetry via a read-only capability (no-spend) that enables “synced / not synced,” “invoice creation healthy,” and “mint responding.”

**Wallet unlock and “it just works” restarts**  
A practical merchant experience must anticipate reboots and restarts. Many node systems require wallet unlock after reboot; RaspiBlitz’s documentation explains that LND requires a password to unlock the wallet after reboot. citeturn20search10turn21view0 Voltage’s FAQ similarly indicates they cannot automatically unlock because they don’t know the user’s password; they notify users when unlock is required. citeturn9view0

That creates a direct UX-vs-custody tradeoff:

- If ArxMint stores unlock secrets in plaintext, you improve uptime but move toward custody-like control.  
- If ArxMint never stores unlock secrets, you preserve the non-custodial story but need a “tap to unlock” workflow in the merchant app.

Voltage’s documentation even references an “auto unlock via webhooks” mechanism as an option for production deployments—implying that “non-custodial + high availability” often requires a secondary automation channel that is carefully designed. citeturn21view0  
For ArxMint, the cleanest merchant UX is likely: **push notification → merchant taps “Unlock” → app sends the unlock secret directly to the node** (never to ArxMint), and the node resumes accepting payments. This preserves the “host cannot move funds” posture while achieving a near-Stripe recovery from routine restarts.

## Custody and regulatory triggers

This section is not legal advice; it is a synthesis of how major regulatory frameworks describe custody-like activity and how “managed infrastructure” maps onto those descriptions.

**What regulators tend to care about is “control,” not branding**  
FinCEN’s 2019 guidance is unusually explicit: regulatory treatment of intermediaries is “not technology-dependent” and depends on criteria including whether the intermediary has “total independent control over the value.” citeturn11view0 FinCEN distinguishes:

- **Hosted wallet providers** as account-based money transmitters that “receive, store, and transmit” convertible virtual currency on behalf of accountholders, and where “the host has total independent control over the value.” citeturn11view0  
- **Unhosted wallets** as software on a person’s own device where the user interacts with the payment system directly and has independent control. citeturn11view0

FinCEN also draws a line between (a) providing tools used in money transmission and (b) performing money transmission: it notes that software providers enabling functions (e.g., anonymizing software) are not money transmitters, and cites an exemption for “delivery, communication, or network access services used by a money transmitter.” citeturn10view0

**How “managed VPS but keys held by merchant” fits this framework**  
If ArxMint provisions infrastructure but:

- does **not** hold the seed phrase,  
- does **not** hold admin macaroons,  
- cannot unilaterally sign transactions or redirect funds, and  
- the merchant is the party with “independent control,”

then, under the FinCEN framing, ArxMint is closer to an infrastructure/tooling provider than a hosted wallet provider—because “total independent control” would remain with the merchant. citeturn11view0turn10view0

The “gray” part is not the definition; it is the factual question of whether ArxMint, as infrastructure operator, can *in practice* take control (e.g., by accessing plaintext secrets in backups, by pushing a malicious update, or by having privileged access to node credentials). This is exactly why Voltage emphasizes both “we cannot spend funds” and “this still requires trust for uptime/networking.” citeturn8view1turn9view0

**UK and EU definitions also pivot on keys/control**  
The UK entity["organization","Financial Conduct Authority","uk financial regulator"] definition of a custodian wallet provider includes providing services to safeguard cryptoassets or private cryptographic keys on behalf of customers (to hold/store/transfer cryptoassets). citeturn2search2turn2search29  
EU MiCA descriptions of custody similarly emphasize “safekeeping or controlling” crypto-assets or the “means of access” (often private keys). citeturn2search3turn2search38turn2search34

Across frameworks, managing “servers” is not automatically the trigger; **controlling the means of access** is the trigger. citeturn2search2turn2search38turn11view0

**Operational design choices that materially affect the legal posture**  
Voltage’s published implementation points to what matters in practice:

- Client-side encryption of sensitive backups so the host cannot decrypt them. citeturn8view1turn9view0  
- CA-trusted TLS to improve UX without routing secrets through the host’s application layer. citeturn8view1turn21view0  
- Minimizing human access to production nodes (no SSH / restricted access model) as an operational control to support the non-custodial claim. citeturn8view1

If ArxMint Cloud uses full VM snapshots that include decryptable key material, or if ArxMint retains admin macaroons, the model could drift toward the “host has independent control” characteristics that FinCEN associates with hosted wallets. citeturn11view0turn21view0

## Partnering versus building

There are three practical paths to deliver “managed self-hosting,” and the right answer may be to support all three as product tiers.

**Partner with a non-custodial infrastructure host**  
A partnership with Voltage-like providers is attractive because they already solved several hard problems (trusted TLS, credential handling patterns, operational monitoring boundaries) and have public material describing their trust model. citeturn8view1turn9view0turn8view0 They also publicly describe expanding infrastructure with entity["company","Google Cloud","cloud computing provider"] for node deployment footprint. citeturn2search8turn8view1

The integration risk is that ArxMint’s full stack includes more than LND: it includes a Cashu mint, checkout UI, webhooks, dashboard. A partnership must decide whether ArxMint deploys those components into the same managed environment (requiring a deployment surface and opinionated hosting constraints) or splits responsibilities (which can reintroduce operational complexity).

**Use “one-click VPS” providers as a deployment substrate**  
The LunaNode wizard plus BTCPay docs show that wizards can dramatically reduce complexity, but they still surface merchant tasks like API keys, billing, and DNS records. citeturn12view0turn12view1  
This model is strongest when the hosting provider can supply a temporary domain (so DNS is optional) and when ArxMint can package everything into a single “control-plane guided” flow. BTCPay explicitly notes that LunaNode can provide a generic domain to get started, while custom domains require more comfort with CLI—again reinforcing the value of a first-party default domain under ArxMint Cloud. citeturn12view1

**Build “ArxMint Cloud” as a managed control plane with per-merchant nodes**  
Building your own managed layer gives the cleanest merchant UX (no DNS, “single button updates,” unified monitoring, integrated support), but it forces ArxMint to adopt the same hard constraints Voltage documents: store only encrypted secrets, enforce least privilege, and design the system so ArxMint cannot unilaterally move funds. citeturn8view1turn8view0turn11view0

A useful operational framing is: ArxMint Cloud is “self-hosted sovereignty with managed convenience,” but the convenience must be implemented as **automation + controls** (not as “support engineers can SSH in and fix it”), because “human root access” is exactly what undermines the credibility of “you hold the keys.”

## Pricing and positioning

The market anchor points for non-custodial infrastructure are visible in public deployments:

- A LunaNode BTCPay deployment is framed at roughly **$15.80/month** for a BTC + Lightning setup on their wizard, and the wizard itself shows the pricing and additional storage costs for chain data. citeturn12view0turn12view1  
- “App-like” node appliances (Umbrel/Start9) compete less on monthly hosting price and more on perceived simplicity and reduced operational burden (GUI, app store experience, backup features). citeturn20search4turn20search5turn20search0turn20search1  
- Voltage’s public-facing site emphasizes non-custodial infrastructure and enterprise posture; their Terms and technical explainers are built around “we do not have access to your funds,” while their pricing pages appear to have shifted over time toward free/enterprise contact flows—suggesting that mainnet infrastructure is often sold based on support/SLA rather than purely metered VPS economics. citeturn8view0turn8view1turn15view0

For ArxMint Cloud, the $10–20/month target is defensible as a *merchant-friendly* price point when the product clearly bundles the operational work (TLS renewals, backups that respect Lightning’s failure modes, monitored uptime, managed updates) that open-source stacks otherwise push onto the merchant. The differentiation is not “a VPS,” but “a non-custodial ops team encoded into software,” using the same trust-boundary storytelling Voltage uses: the merchant holds secrets; ArxMint manages availability and lifecycle. citeturn8view1turn11view0turn13search0