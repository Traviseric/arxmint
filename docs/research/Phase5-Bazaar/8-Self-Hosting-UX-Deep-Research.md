# Phase 5 Research #8: Making Self-Hosting as Easy as Downloading an App

**Purpose:** The legal research (Research #7/File #1) locked ArxMint into a self-hosted, non-custodial architecture. This is the right legal decision — but it creates a UX problem. BTCPay Server has been self-hosted since 2017 and still struggles with merchant adoption because deployment is intimidating. If ArxMint can't make self-hosting dramatically easier than BTCPay, the Stripe-alternative vision fails at the onboarding step. This research should produce the deployment architecture and UX decisions for Phase 5.8 (One-Command Merchant Deploy).

**Context:** ArxMint Phase 5 requires merchants to run their own payment node (LND + Cashu mint + checkout page + webhook engine + dashboard). The current Docker Compose stack works for developers but is too complex for a coffee shop owner. Research files #1-7 cover legal, competitive, architecture, DX, go-to-market, security, and infrastructure — but none address the operational UX of self-hosting: DNS, SSL, updates, backups, monitoring, and the "it just works" experience that Stripe provides.

**The core question:** How do you give a non-technical merchant the experience of "download an app, start accepting Bitcoin" when the architecture requires them to run their own server?

---

## Research Areas

### 1. Home Node Platform Analysis (Umbrel, Start9, Citadel, myNode, RaspiBlitz)

**What exists today:**
- Umbrel: App store model for Bitcoin node software. One-click install of BTCPay Server, LNbits, Thunderhub, etc. Runs on Raspberry Pi or any Linux box. 500K+ nodes deployed.
- Start9 (StartOS): Similar app store model with emphasis on sovereignty. Marketplace of self-hosted services. Runs on their own hardware or x86.
- Citadel: Open-source Umbrel alternative (forked from Umbrel v0.3).
- myNode: Focused on Bitcoin/Lightning node management. Premium features for $99 one-time.
- RaspiBlitz: DIY Lightning node on Raspberry Pi. More technical audience.

**Questions to answer:**
- How does the Umbrel app packaging system work? What's the format? How hard is it to create an ArxMint app for Umbrel's app store?
- What's Start9's service packaging format? Can ArxMint be packaged as a StartOS service?
- What percentage of Umbrel users actually use BTCPay Server? Is the "install from app store" model actually driving merchant adoption, or is it mostly hobbyists running nodes?
- What are the hardware requirements? Can ArxMint's full stack (LND + Cashu + checkout + dashboard) run on a Raspberry Pi 4 (4GB RAM)?
- What's the update/upgrade story on these platforms? Auto-updates? Manual? How do they handle breaking changes?
- Should ArxMint target Umbrel/Start9 as a distribution channel, or build its own lightweight deployment system?
- What's Umbrel's business model? How do they sustain development? What can ArxMint learn from this?

**Key insight to validate:** If ArxMint ships as an Umbrel app, a merchant who already has an Umbrel node can add payment processing in one click. Is this a meaningful adoption channel, or is the overlap between "people running Umbrel" and "merchants" too small?

### 2. Cloud Marketplace One-Click Deployment

**Platforms to analyze:**
- **DigitalOcean Marketplace:** 1-Click Apps. How does BTCPay Server's DigitalOcean image work? What's the approval process? Deployment UX?
- **Vultr Marketplace:** Similar to DO. What's the app submission process?
- **LunaNode:** BTCPay Server's primary one-click partner. How does their integration work? API-driven VPS provisioning? What does the user experience look like?
- **AWS Marketplace / Azure Marketplace:** Enterprise-grade. Worth it for ArxMint's target market?
- **Hetzner:** Cheap European hosting. No marketplace, but popular with Bitcoin node operators. Worth a deployment script?
- **Railway / Render / Fly.io:** Modern PaaS platforms. Can ArxMint deploy on these? What are the limitations (persistent storage, WebSocket support, LND gRPC)?

**Questions to answer:**
- What's the actual user journey for a BTCPay Server one-click deploy on LunaNode? How many steps? How long does it take? Where do people get stuck?
- What's the minimum VPS spec that runs the full ArxMint merchant stack? Research #7 says 2GB RAM / 1 vCPU / 20GB — is this validated?
- How do you handle DNS configuration? This is the #1 friction point for non-technical users. BTCPay uses a reverse proxy with auto-HTTPS — is there a way to provide a default subdomain (e.g., `storename.arxmint.cloud`) without taking custody?
- What about Tor-only deployments? No DNS needed, but the .onion address is ugly. Is this viable for merchants?
- How do cloud marketplace images handle updates? Does the merchant need to SSH in and `docker pull`? Can you build auto-update into the image?
- Cost comparison: What does a merchant actually pay per month to run their own node on each platform?

### 3. BTCPay Server Deployment UX — Lessons Learned

**Deep dive into BTCPay's deployment history:**
- BTCPay started with manual Docker deployment (2017-2018). What was the adoption like?
- They added LunaNode one-click (2018-2019). How did this change adoption numbers?
- They added the BTCPay Configurator web wizard. What does it do? How effective is it?
- They added Voltage hosting (managed BTCPay). How does this work without being custodial? (Voltage provisions the infrastructure but the merchant holds the keys.)
- They added third-party hosts (list of providers who run BTCPay for merchants). What's the trust model?
- What are BTCPay's most common support tickets? Where do merchants get stuck?
- BTCPay's Greenfield API vs. Legacy API — what DX lessons can we learn?

**The key question:** BTCPay has been working on this problem for 7+ years. What do they still get wrong? Where is there room for ArxMint to leapfrog?

**Hypothesis to validate:** BTCPay's core problem is that it's built for Bitcoin maximalists, not for merchants. The UI assumes you know what a Lightning channel is. ArxMint could win by hiding all the node management behind a merchant-first UI — "here's your checkout link, here's your QR code, here are today's sales" — while the node runs invisibly underneath.

### 4. The "Managed Self-Hosting" Model

**The spectrum between fully-hosted and fully-self-hosted:**

```
Stripe (hosted)  ←→  Voltage/BTCPay Cloud  ←→  One-click VPS  ←→  Docker on own server  ←→  Bare metal
Custodial            Non-custodial but          Non-custodial      Non-custodial              Non-custodial
                     managed infrastructure     self-managed       self-managed               self-managed
```

**The "Voltage model":**
- Voltage provisions LND nodes on cloud infrastructure. The merchant gets a web dashboard. Voltage handles uptime, backups, updates.
- But the merchant holds the seed phrase and macaroons. Voltage cannot move funds.
- Is this custodial? Research #7's analysis suggests it may be borderline — Voltage controls the infrastructure that the keys run on.
- Could ArxMint offer a similar model? "We manage your server, you hold your keys."

**The "ArxMint Cloud" concept:**
- What if ArxMint offered `arxmint.cloud` — a service that provisions VPS instances pre-configured with the ArxMint merchant stack?
- ArxMint provisions the server. Merchant gets SSH access + admin macaroon. ArxMint handles updates, monitoring, backups.
- ArxMint never holds keys or processes payments. The merchant's node runs on infrastructure ArxMint manages.
- Legal analysis needed: Does managing the infrastructure (without holding keys) trigger any regulatory classification?
- Revenue model: $10-20/month hosting fee (infrastructure cost + margin). Sustainable without being custodial.
- Competitive positioning: "Self-hosted sovereignty with managed convenience."

**Questions to answer:**
- Where exactly is the legal line between "managed infrastructure" and "custody"? Research #7 says custody = "unilateral ability to move, freeze, or redirect user assets." If ArxMint manages the VPS but the merchant holds the admin macaroon and seed phrase, is that custody?
- How does Voltage handle this legally? Do they have MSB licenses? How do they structure their Terms of Service?
- Could ArxMint partner with existing infrastructure providers (Voltage, LunaNode) rather than building its own managed hosting?
- What's the pricing sweet spot? BTCPay's third-party hosts charge $5-30/month. Voltage charges $16-48/month for LND nodes.

### 5. Desktop and Mobile Node Management

**Can self-hosting work without a VPS?**
- **Desktop app:** Electron/Tauri app that runs ArxMint merchant node locally. Like Umbrel but without the Raspberry Pi — runs on the merchant's existing computer.
  - Pros: No VPS cost, no DNS, no SSH. Download and run.
  - Cons: Computer must stay on. No static IP. NAT traversal issues. Not viable for 24/7 merchant operations?
  - Potential: Great for testing/development. Maybe viable for farmers market / pop-up shop use cases where 24/7 uptime isn't needed.

- **Mobile app:** React Native or Flutter app that manages the merchant's remote node (wherever it's hosted).
  - Not running the node on the phone — just a management dashboard.
  - Push notifications for payments. Quick POS mode. Invoice generation.
  - BTCPay has a mobile app (BTCPay Vault for hardware wallet signing, plus community POS apps). What's the UX?
  - Would a mobile dashboard app differentiate ArxMint from BTCPay?

- **Hybrid: Local node + Tor + mobile management:**
  - Merchant runs ArxMint on a home server or old laptop.
  - Tor hidden service provides .onion address (no DNS needed).
  - Mobile app connects to .onion via Tor for management.
  - QR codes at the register point to the .onion checkout page.
  - Viable? Or is Tor too slow for checkout UX?

### 6. DNS and Domain Friction

**The hardest part of self-hosting for non-technical users:**
- Setting up a domain, pointing DNS records, configuring SSL certificates.
- BTCPay's solution: reverse proxy (nginx) with Let's Encrypt auto-SSL. But merchant still needs to configure DNS.
- Caddy (ArxMint's current choice) handles auto-HTTPS beautifully — but DNS is still on the merchant.

**Potential solutions:**
- **Default subdomain:** `storename.arxmint.pay` — ArxMint runs the DNS, merchant runs the node. ArxMint's DNS just points to the merchant's VPS IP. No custody, no fund routing — just a DNS record.
  - Legal question: Does providing DNS for merchant nodes create any regulatory exposure?
  - Technical question: How do you handle dynamic IPs? DynDNS-style updates?

- **Tor-only mode:** No DNS at all. Merchant gets a `.onion` address. Works with any Lightning wallet that supports Tor.
  - Viable for tech-savvy merchants. Not viable for mainstream.

- **Cloudflare Tunnel / ngrok-style:** Merchant runs a tunnel agent that exposes their local node to the internet via a stable URL.
  - `arxmint tunnel start` → `https://abc123.tunnel.arxmint.com`
  - ArxMint runs the tunnel infrastructure. Merchant runs the node.
  - Legal question: Is running a tunnel for merchant traffic "arranging" under UK FCA?

- **IP-only with QR:** For POS-only use, the checkout page can run on the local network. Customer connects to merchant's WiFi, scans QR → pays. No internet-facing setup needed.
  - Works for coffee shops, farmers markets, physical retail.
  - Doesn't work for online stores.

### 7. Auto-Updates, Backups, and Operational Resilience

**The "day 2" problem:**
- Getting a node running is step 1. Keeping it running is step 2. Most merchant churn on BTCPay happens because the node breaks and the merchant doesn't know how to fix it.

**Questions to answer:**
- How should ArxMint handle updates? Auto-update (Umbrel model) or manual update with notification?
- What about breaking changes? (e.g., LND major version upgrade that requires channel close/reopen)
- Automated backups: What needs backing up? (LND channel.backup, Cashu mint database, merchant config, transaction history)
- Where do backups go? Local disk? Off-site? Cloud storage? Encrypted?
- Monitoring: Can the merchant dashboard show "your node is healthy" / "your node needs attention" without requiring Prometheus/Grafana expertise?
- Disaster recovery: "My VPS died, how do I restore?" — this needs to be a one-command process.
- Channel management: LND channel liquidity is a real operational burden. How do you abstract this away from merchants? Auto-pilot? LSP integration? Turbo channels?

### 8. Competitive UX Benchmarking

**For each competitor, document the exact user journey from "I want to accept Bitcoin" to "first payment received":**

1. **BTCPay Server (LunaNode one-click):** Steps, time, friction points, cost
2. **BTCPay Server (manual Docker):** Steps, time, friction points, cost
3. **Strike Merchant:** Steps, time, friction points, cost (custodial — baseline for UX comparison)
4. **OpenNode:** Steps, time, friction points, cost (custodial)
5. **Breez SDK:** Steps, time, friction points, cost
6. **LNbits (self-hosted):** Steps, time, friction points, cost
7. **Square (Bitcoin):** Steps, time, friction points, cost (custodial — mainstream baseline)

**Target for ArxMint:** Fewer steps and less time than BTCPay Server. Same sovereignty guarantees. The gold standard is "download → configure → accept payment" in under 15 minutes.

---

## Expected Deliverables

1. **Distribution channel decision:** Umbrel app store, cloud marketplace, managed hosting, or all three? Priority order.
2. **Deployment architecture:** The exact `arxmint merchant init` flow — what it generates, what it configures, what it abstracts away.
3. **DNS solution:** How merchants get a stable URL without ArxMint taking custody. Default subdomain vs. Tor vs. tunnel.
4. **Managed hosting model:** Legal and technical assessment of "ArxMint Cloud" — managed VPS with merchant-held keys. Revenue model.
5. **Update and backup strategy:** Auto-update mechanism, backup targets, disaster recovery flow.
6. **Channel management strategy:** How to abstract LND liquidity from merchants. LSP integration? Auto-pilot? Pre-funded channels?
7. **Mobile management app:** Build or skip? If build, what's the MVP feature set?
8. **UX benchmark:** Side-by-side comparison of merchant onboarding across competitors with specific step counts, times, and friction points.
9. **BTCPay leapfrog strategy:** Specific UX decisions where ArxMint can beat BTCPay's 7-year head start.
10. **Minimum viable deployment:** The smallest possible merchant setup that still works. What can be cut from the full stack for a "lite" mode?
