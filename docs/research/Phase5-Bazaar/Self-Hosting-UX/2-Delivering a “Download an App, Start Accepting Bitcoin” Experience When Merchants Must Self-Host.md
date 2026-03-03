# Delivering a “Download an App, Start Accepting Bitcoin” Experience When Merchants Must Self-Host

## The constraint and what “Stripe-like” means operationally

ArxMint Phase 5’s architecture—merchant-operated Lightning node + mint + checkout + webhook engine + dashboard—creates a hard constraint: the merchant must run (and keep running) an internet-facing system with persistent state. That means the merchant experience is not just “payments UX,” it is also “operations UX,” including DNS, TLS, upgrades, backups, incident recovery, and monitoring.

The good news is that the “minimum viable server” for Lightning alone can be small if you avoid running a full Bitcoin node. The Lightning Network Daemon can run without a Bitcoin backend in Neutrino mode, and Lightning Labs’ “Get Started” guide lists minimum requirements of **2GB RAM** and **≥5GB storage** (plus a decent SSD) for LND itself. citeturn14view3 This supports the idea that an ArxMint stack that **does not include a full Bitcoin node** can plausibly run on low-end VPS specs.

The moment you require an on-chain backend (for example, running a pruned Bitcoin node locally), operational burden and storage requirements rise sharply. BTCPay Server’s deployment FAQ states that if you run Bitcoin + Lightning nodes, minimal requirements are **2GB RAM, 80GB storage with pruning, and Docker**, and their synchronization FAQ notes that a full Bitcoin node sync can take **1–5 days**. citeturn11search16turn11search35 Even if ArxMint’s architecture avoids full-node sync, merchants will still experience the *operational class* of problems BTCPay users hit: DNS, certificates, upgrades, and “why is my box down?”

So the core product goal becomes: **hide infrastructure operations behind a guided, opinionated appliance workflow**, where the merchant never SSHs, never edits DNS records unless they opt into a custom domain, and gets clear “green lights” and auto-repair behavior.

## What BTCPay’s LunaNode “one-click” teaches about real user friction

BTCPay Server’s LunaNode flow is one of the best public case studies for making “self-hosted payments infrastructure” feel close to one-click. Their official web deployment docs explicitly position it as a “one-click” approach that requires no personal ID other than phone verification, and they call out two early friction steps that are *not technical* but still block merchants: **adding billing credits** (with an invoice confirmation delay) and **phone number verification**. citeturn0search1turn1view1

### The actual LunaNode journey (steps, timing, and where users stall)

From BTCPay’s docs and the LunaNode launcher UI, the end-to-end path is roughly:

1. Create a LunaNode account, add credits, and pass phone verification. citeturn0search1turn1view1  
2. Generate a LunaNode API key. citeturn1view1  
3. Open the BTCPay LunaNode launcher page and paste API credentials. citeturn1view1turn1view0  
4. Choose hostname strategy:
   - **Auto domain**: LunaNode provides a generic domain (BTCPay docs: `*.lndyn.com`) and avoids DNS work. citeturn1view1  
   - **Custom domain**: the launcher reserves a static IP and instructs the user to create a DNS A record pointing to that IP. citeturn1view0turn2view0  
5. Enter email for Let’s Encrypt certificate issuance/expiry notices. citeturn1view0  
6. Pick resources / plan and deploy:
   - The launcher advertises “ready in ~5 minutes.” citeturn1view0  
   - BTCPay docs say the launcher sets up the VM in roughly **6–7 minutes**. citeturn1view1  

Where people get stuck is extremely consistent with your concern (“operational UX”):

- **DNS custom domain**: the launcher itself warns that the website will not be accessible until the A record is created (and DNS can take time to propagate). citeturn1view0turn2view0  
- **Resource sizing**: LunaNode’s own BTCPay guide says their 2GB plan is insufficient for Bitcoin, recommending **4GB RAM** for 1–3 non-Monero cryptocurrencies and adding that the launcher provisions **a 60GB volume per cryptocurrency** (extra monthly cost). citeturn11search13turn3view3  
- **Keeping it up to date**: the LunaNode guide’s update path is still “SSH in and run `./btcpay-update.sh`.” citeturn3view3  
- **Stability and “it went offline”**: their guide suggests increasing RAM if the site goes offline frequently, which is exactly the kind of incident a non-technical merchant can’t diagnose. citeturn3view3  

The key product insight: **BTCPay’s “one-click” is not primarily about Docker automation; it’s about avoiding DNS and TLS decision points by default.** That’s why the “auto domain” (`*.lndyn.com`) option matters so much. citeturn1view1

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["BTCPay Server point of sale interface screenshot","LunaNode dashboard screenshot","DigitalOcean Marketplace 1-Click App page screenshot","Fly.io dashboard app deployment screenshot"],"num_per_query":1}

## Marketplace-style deployment on VPS providers

A “cloud marketplace one-click” can compress **provisioning** into a single UI action, but it does not automatically solve the hard parts: domain identity, TLS, backups, upgrades, and support. The marketplace path is still valuable, but only if your image behaves like a *productized appliance* after boot.

### DigitalOcean Marketplace (Droplet 1-Click Apps)

DigitalOcean’s docs describe Droplet 1-Click Apps as **pre-built Droplet images with preconfigured software** intended to minimize setup requirements, and users can create a Droplet from the Marketplace page or via API/CLI using image slugs. citeturn26search3

For the vendor side, DigitalOcean’s Marketplace partner tooling repo outlines the workflow: create a Droplet, install/configure software, clean up machine-specific data, snapshot, then submit via the vendor portal; it also documents an API approach for vendors to update their listing (e.g., updating an app image UUID via vendor portal APIs). citeturn5view0turn25view0

The Marketplace terms matter because they shape what you can realistically promise. DigitalOcean’s Marketplace terms state DigitalOcean can reject applications at its discretion (including “any or no reason”), and Marketplace services are provided “as is” / “as available,” which is relevant if you plan to market “it just works” guarantees that depend on marketplace infrastructure. citeturn0search10

**BTCPay-specific note:** BTCPay is not currently positioned in DigitalOcean’s Marketplace as a maintained 1-click app; a BTCPay community thread explicitly discusses adding BTCPay as a DigitalOcean Marketplace listing and frames it as something that would require someone to become a vendor and manage it. citeturn26search0

### Vultr Marketplace

Direct Vultr Marketplace docs were not retrievable in this research environment (HTTP access errors), but Vultr’s own GitHub repository for Marketplace work points developers to Vultr Marketplace documentation and tooling. citeturn5view2

A practical implication: you can likely build a Vultr Marketplace artifact, but you should expect **less public documentation transparency** than DigitalOcean’s partner tooling ecosystem, and you will need to test the full “merchant journey” UX in Vultr’s control panel rather than relying on docs alone.

### AWS Marketplace and Azure Marketplace (enterprise-grade)

For ArxMint’s stated target (“coffee shop owner”), AWS/Azure marketplaces are usually the wrong first move:

- **Seller-side overhead** is non-trivial. AWS Marketplace seller guidance indicates sellers must provide **tax and banking information** to create paid offers (and details like US W‑9 for US entities, banking requirements, etc.). citeturn33search10turn33search25  
- Microsoft’s marketplace publishing docs emphasize that you must have a Partner Center marketplace account and meet listing/content validation requirements, and VM offers are “transactable” and billed through Microsoft Marketplace—again, heavy compared to a small-merchant flow. citeturn33search7turn33search11turn33search3  

Even on the buyer side, “use AWS Marketplace” implies the merchant has an AWS/Azure account, understands regions/instances, and can navigate billing and networking. That is not a realistic coffee-shop onboarding path.

A further real-world risk signal: there are third-party repackaged open-source BTCPay VM offers on AWS Marketplace that charge for support, illustrating the marketplace dynamic (someone else can list “your” open-source stack with their own UX and pricing). citeturn26search15

### Hetzner

Hetzner has no marketplace in the same sense, but it is popular among node operators because of price/performance and its straightforward VM model. Hetzner’s cloud server overview shows a low-end “regular performance” option (e.g., CPX11: **2 vCPU, 2GB RAM, 40GB SSD**) with a monthly cap that (as of today) can be around **$4.99/month** depending on region/IPv4 selection in their pricing UI. citeturn19view0turn18view0

However, pricing is changing: Hetzner’s docs and press statement say price adjustments take effect **April 1, 2026**, impacting existing products and new orders; their price adjustment table shows CPX11 in the USA moving from **$4.99/month to $6.99/month**. citeturn16view1turn16view0

For Hetzner, the “one-click” equivalent is typically: **a robust cloud-init / provisioning script** (or a tool like Coolify-style self-hosted control planes), not a marketplace listing.

## Modern PaaS platforms: can they host an LND-based payments stack?

PaaS products can simplify TLS and deployment, but Lightning introduces requirements that many PaaS platforms either don’t support well or support in ways that complicate merchant UX.

### Railway

Railway’s docs explicitly support:
- **Public networking via HTTP/HTTPS** with automatic SSL and instant Railway domains. citeturn27view1  
- **TCP proxy** to expose non-HTTP services publicly via TCP. citeturn27view0  
- **Persistent volumes**, with explicit caveats: single volume per service, replicas can’t be used with volumes, and redeployments with volumes involve a small amount of downtime to prevent corruption. citeturn27view3  

But the TCP proxy design is a UX problem for Lightning: Railway provides a proxy hostname and a **generated port** (example `*.proxy.rlwy.net:15140`), and even with a custom domain, the port stays the Railway-provided port. citeturn27view0 This means your LND “public address” would not be the standard `:9735` and would be harder for peers and tooling unless you build strong abstraction around it.

Railway pricing also doesn’t map cleanly to “merchant pays $X/month” because it mixes subscription minimums (Hobby: $5 minimum; Pro: $20 minimum) with consumption-based CPU/RAM billing and separate persistent volume pricing. citeturn20view3turn14view2

### Render

Render is structurally misaligned with Lightning’s network needs:

- Render’s documentation states that public web services must bind to a single port to receive **HTTP** requests from the public internet, and inbound traffic is forwarded to only **one HTTP port** per web service; additional ports can be used only over the private network. citeturn21view1  
- Render private services can listen on almost any port and any protocol, but they are **unreachable via the public internet**. citeturn12search21  

So you cannot cleanly run a public Lightning P2P port (or anything that expects raw inbound TCP from arbitrary peers) in the way LND/Lightning nodes are commonly deployed.

Render does offer good “ops UX” features—persistent disks are supported on paid services and include encryption at rest and automatic daily snapshots. citeturn21view2 But the networking model is the blocker.

### Fly.io

Fly.io is the strongest PaaS-like candidate for Lightning-style workloads because it supports exposing arbitrary TCP ports and persistent state, but there are important caveats that affect merchant UX and cost.

- Fly documents multi-port exposure and general public service configuration via `fly.toml`. citeturn29search10turn30view2  
- For networking, Fly notes that if your app uses a **non-HTTP protocol that doesn’t use TLS**, you need a **dedicated IPv4**; shared IPv4 routing is domain-based and expects TLS handling for non-80/443 ports. citeturn30view1  
- Fly’s pricing doc states **dedicated IPv4 addresses are $2/month**. citeturn31view0  
- Fly’s compute pricing lists a **shared-cpu-1x with 2GB RAM** at **$10.70/month** (monthly cap). citeturn30view0  
- Persistent volumes are **$0.15/GB-month** of provisioned capacity, and Fly also charges for snapshot storage (starting Jan 1, 2026) at **$0.08/GB-month** with the first 10GB free. citeturn32view0  

For LND specifically, Lightning transport is encrypted but is not “TLS with SNI routing,” so you should assume you’ll need the dedicated IPv4 to make inbound P2P connectivity broadly reliable on IPv4.

## Solving the operational UX tax without taking custody

This section answers the “how do we make this feel like an app?” question directly, using tactics that are compatible with merchant self-hosting and self-custody.

### Validating the minimum server spec for the ArxMint stack

The spec in your infrastructure research (“2GB RAM / 1 vCPU / 20GB”) is plausible for an **LND-in-Neutrino** architecture plus lightweight web services, but there are two caveats:

- LND’s own “Get Started” prerequisites explicitly call for **2GB RAM** and **≥5GB storage**, but also mention a **1 GHz quad core** CPU baseline. citeturn14view3 In cloud terms, that suggests **1 vCPU is the true edge case**, and 2 vCPU is a safer baseline for “merchant-grade” reliability.
- If you ever require a local Bitcoin backend (even pruned), BTCPay’s minimal requirements jump to **80GB storage** for Bitcoin+LN nodes (with pruning). citeturn11search16

A practical, merchant-safe baseline (still inexpensive on most VPS providers) is therefore: **2GB RAM + 2 vCPU + 40–50GB SSD** (which also matches common low-end VPS SKUs like Hetzner CPX11). citeturn19view0turn14view3

### DNS and TLS: make “custom domain” an optional upgrade, not a prerequisite

DNS configuration is the most common “fatal friction” for non-technical operators because it has:
- multiple external systems (registrar + cloud IP)
- propagation delays
- failure modes that look like “the app is broken.”

BTCPay’s LunaNode flow explicitly avoids DNS by default with a generic domain option (`*.lndyn.com`). citeturn1view1 When users choose a custom hostname, the launcher immediately makes DNS the gating step by requiring an A record pointed at the reserved static IP. citeturn1view0turn2view0

**Actionable ArxMint pattern:** provide a default subdomain such as `storename.arxmint.cloud` as the standard path, and treat “bring your own domain” as an advanced/optional step.

This does not require taking custody of funds. It does create a dependency on ArxMint’s DNS control plane (availability and integrity), but it is not custody of merchant keys. The key is to make the merchant’s funds and signing keys remain local to their node.

TLS should be automatic and invisible wherever possible. The LunaNode launcher requires an email for Let’s Encrypt and uses it for cert expiry notices, which is the exact “merchant-friendly” default you want. citeturn1view0 Railway similarly advertises automatic SSL for public networking. citeturn27view1 Fly uses Let’s Encrypt for managed certificates and documents certificate pricing. citeturn31view0

### Updates: eliminate SSH by shifting to an appliance update model

This is where most “Docker Compose works for devs” stacks fail in production for merchants. BTCPay’s LunaNode guide still assumes terminal access for updates (`./btcpay-update.sh`). citeturn3view3

Cloud marketplaces do not inherently solve this: DigitalOcean marketplace tooling shows how vendors update the marketplace image for *future deployments*, but that doesn’t magically patch existing merchant instances. citeturn5view0

**Actionable ArxMint pattern:** ship a self-updating appliance with:
- a single “ArxMint Agent” service running as a system daemon
- a signed release manifest + version channels (stable/beta)
- automatic rollback if health checks fail
- no SSH required for normal upgrades

You can justify “signed updates” as a best practice by pointing to Lightning Labs’ own guidance: LND releases are signed by multiple developers and they recommend signature verification for production. citeturn14view3

### Backups and recovery: treat Lightning state as first-class

Backups are not optional for a merchant-grade Lightning node. LND recovery planning and disaster recovery emphasize static channel backups (SCBs) as the recovery mechanism when the node suffers catastrophic failure. citeturn25search1turn25search29 Independent protocol documentation also emphasizes SCBs only need updates when channels open/close and enable recovery attempts by contacting peers. citeturn25search17

BTCPay’s Docker deployment includes a dedicated Backup & Restore process that covers:
- setting a backup passphrase
- automating backups via cron
- explicit Lightning channel backup considerations. citeturn25search0

BTCPay also documents that the seed is necessary to perform static channel backups and provides an LND seed backup service in its UI (reflecting real-world operator needs). citeturn25search3

**Actionable ArxMint pattern:** design backups around three artifacts:
1. **Encrypted application data** (Cashu mint DB, merchant config, invoices, webhooks)
2. **LND seed material** (merchant-controlled, ideally displayed once and then removed from server UI)
3. **Automated SCB export** whenever channels change (and push encrypted copies to user-selected storage)

The UX you want: “Backups are on” (with a clear last-success timestamp), not “here’s a tarball.”

### Monitoring and support: the merchant wants a green checkmark, not Prometheus

PaaS platforms advertise monitoring primitives that are closer to what merchants need. Render’s pricing page lists health checks, quick rollbacks, metrics, notifications, and log retention as built-in platform features. citeturn22view1 Railway advertises CPU/RAM/disk/network metrics and configurable alerts on its pricing page. citeturn14view2 Fly has a cost management model based on defined monthly caps and explicit pricing for core resources that can simplify “what will I pay?” expectations. citeturn28search18turn32view0

**Actionable ArxMint pattern:** implement a narrow, merchant-centric SLO surface:
- “Can accept Lightning payments” (inbound liquidity + LND synced)
- “Checkout reachable”
- “Mint database healthy”
- “Backups current”
- “Disk > 20% free”
- “Updates available / applied”

This can be exposed in the merchant app/dashboard without giving them raw infra metrics.

### Tor-only deployments: viable as a *backchannel*, not as the main merchant UX

Tor can remove DNS and port-forwarding friction. BTCPay’s Lightning-in-a-Box deployment guide explicitly treats port forwarding as optional if using Tor only. citeturn24view2 A modern glossary explanation also states you do not need router port forwarding when running a node over Tor because onion services provide inbound pathways. citeturn23search28

But Tor-only has significant merchant UX downsides:
- .onion addresses are not brandable and are hard to communicate
- many user agents require Tor Browser or special handling
- it complicates “customer-facing checkout” if the customer must reach your hosted page directly.

A more viable pattern is: **Tor or tunnel for operator/backoffice access**, clearnet domain for checkout/dashboard when needed.

### Port 9735 reality check: you can receive without port-forwarding, but “merchant-grade” prefers reachability

There is persistent confusion about whether a Lightning node must be reachable on 9735. A clear explanation is: you can send/receive and open channels without port forwarding; port forwarding is mainly for being a public routing node / accepting inbound peer connections. citeturn23search1 Lightning Labs’ routing guidance emphasizes that for routing nodes, port 9735 must be externally accessible. citeturn23search12

For a coffee shop, you want the “most boring reliable” posture: don’t require the merchant to understand this; set up whatever network exposure is needed by the chosen platform (VPS with IPv4 + firewall rules, or tunnels if you must).

## A concrete ArxMint strategy: “self-hosted data plane + managed control plane + default domain”

To get to “download an app, start accepting Bitcoin” while preserving the architecture constraint (“merchant runs their own server”), the most realistic approach is to split responsibilities:

- **Data plane (merchant-owned):** LND + Cashu mint + checkout + webhook engine + dashboard run on a merchant-controlled VM with persistent storage.
- **Control plane (ArxMint-managed, non-custodial):** a provisioning/orchestration service that:
  - creates the VM (via provider API or marketplace image)
  - assigns a default domain or coordinates DNS
  - reports health and backup status
  - applies signed updates safely

This is *not custody* if keys never leave the merchant VM and signing is local (or, even better, done with a merchant-controlled remote signer).

### Recommended deployment targets by phase

**Phase A: Fastest path to “it just works”**
- Focus on standard VPS providers where you control networking and storage with minimal abstraction (DigitalOcean, Hetzner). “One-click” comes from your app’s provisioning wizard, not the provider marketplace. DigitalOcean’s own droplet pricing for 2GB/1vCPU/50GB is $12/month. citeturn14view0 Hetzner CPX11-class instances make the low end even cheaper (with known pricing increases coming April 1, 2026). citeturn19view0turn16view0

**Phase B: Add marketplace distribution where it helps acquisition**
- DigitalOcean Marketplace can be useful for discovery, but you still need post-boot appliance behavior and your own DNS/TLS defaults. DigitalOcean describes 1-click apps as prebuilt images launched from marketplace pages and supports using image slugs via API/CLI. citeturn26search3 Vendor tooling exists to manage image lifecycle and updates for listings. citeturn5view0  
- Vultr Marketplace is plausible but should be treated as “extra surface area” after your appliance is stable, given reduced docs accessibility in this research environment. citeturn5view2

**Phase C: PaaS only if you are confident in Lightning networking**
- Fly.io is the only modern PaaS in this set that cleanly supports your needs, but you must plan for **dedicated IPv4** if your protocol is non-TLS raw TCP (likely for LND P2P) and understand volume + snapshot cost. citeturn30view1turn32view0turn31view0  
- Railway TCP proxy can expose TCP but introduces random public ports and domain+port UX complications. citeturn27view0turn27view3  
- Render’s networking model blocks public raw TCP services. citeturn21view1turn12search21  

### Cost comparison for a minimal always-on merchant node

The table below is scoped to “merchant stack without a full Bitcoin node,” assuming something like LND in Neutrino mode plus your application services. LND minimums alone support 2GB RAM as a baseline. citeturn14view3

| Platform | Example smallest “merchant-safe” plan | Approx monthly infrastructure cost (Mar 2, 2026) | Notes that affect merchant UX |
|---|---:|---:|---|
| DigitalOcean | Basic Droplet 2GB / 1vCPU / 50GB | **$12/mo** citeturn14view0 | Simple VM model. Still need domain/TLS defaults unless you ship them. |
| Hetzner | CPX11 2vCPU / 2GB / 40GB | **~$4.99/mo** today; **$6.99/mo** in USA after Apr 1, 2026 citeturn19view0turn16view0 | Extremely cost-effective. No marketplace; scripts/cloud-init are the path. |
| Fly.io | shared-cpu-1x @ 2GB + 20GB volume + dedicated IPv4 | **$10.70 + $3.00 + $2.00 ≈ $15.70/mo** citeturn30view0turn32view0turn31view0turn30view1 | Works for TCP/ports, but requires more platform-specific config and IPv4 planning for non-TLS protocols. |
| Railway | Hobby + always-on resources + volume | **$5 minimum + usage** (high variance) citeturn20view3turn14view2 | Great DX, but TCP proxy uses generated ports; volumes cause redeploy downtime. citeturn27view0turn27view3 |
| Render | Standard web service 2GB/1 CPU + SSD | **$25/mo + $0.25/GB-month** (e.g., 20GB ≈ $5) → **~$30/mo** citeturn22view2turn21view2 | Public networking is HTTP-only; not suited for public Lightning P2P. citeturn21view1turn12search21 |
| LunaNode (BTCPay reference point) | m.4 (4GB) + 60GB/coin volume | **~$15.80/mo for BTC** (m.4 + 1 volume) citeturn11search13turn3view3turn1view0 | Shows the “default domain + auto HTTPS” trick; still uses SSH for updates. citeturn3view3 |
| Vultr | 1vCPU/2GB class VPS | **~$10/mo** (third-party pricing mirrors; official page not accessible here) citeturn13search28turn13search13 | Treat as “verify in-product” before committing to merchant promises. |
| AWS (not recommended for this target) | t3.small (2 vCPU, 2 GiB) | **$0.0208/hr ≈ $15.18/mo compute** + storage/egress citeturn33search4turn33search29 | Marketplace selling is heavy (tax/bank). citeturn33search10turn33search25 Also T3 Unlimited can add CPU credit charges for sustained burst. citeturn33search0 |
| Azure (not recommended for this target) | B2s class (2 vCPU, 4 GiB) | **$0.0416/hr ≈ $30.37/mo compute** + storage/egress citeturn33search9 | Publishing through Microsoft Marketplace requires Partner Center + listing validation. citeturn33search7turn33search11 |

### The “app-like” merchant workflow you actually need to ship

BTCPay’s LunaNode experience shows that solving DNS/TLS defaults matters more than solving Docker. citeturn1view1turn1view0 For ArxMint, the “download an app” experience becomes feasible if your merchant app does three things:

1. **Provision on behalf of the merchant** (or guide them through a truly minimal provider auth flow), creating the VM and storage automatically.
2. **Assign a default domain automatically** (ArxMint-managed subdomain) and issue/renew TLS automatically (merchant only provides email). citeturn1view0turn27view1  
3. **Operate the node as an appliance**:
   - automatic signed updates (no SSH) citeturn14view3turn3view3  
   - automatic encrypted backups + SCB export cadence citeturn25search0turn25search29turn25search17  
   - clear health states and auto-remediation (restart, disk warning, snapshot restore paths when possible) citeturn21view2turn22view1turn27view3  

That combination is what converts “self-hosted infrastructure” into “feels like a product.”