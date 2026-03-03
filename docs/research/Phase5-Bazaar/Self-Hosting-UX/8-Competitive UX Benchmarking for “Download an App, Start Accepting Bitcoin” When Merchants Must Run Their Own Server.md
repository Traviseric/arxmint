# Competitive UX Benchmarking for “Download an App, Start Accepting Bitcoin” When Merchants Must Run Their Own Server

## Scope, definitions, and measurement method

This benchmark focuses on the operational user journey from “I want to accept Bitcoin” to “first payment received,” with special attention to the operational UX gaps that matter for non-technical merchants (DNS, TLS/SSL, updates, backups, and the “it just works” expectations merchants learn from mainstream payment platforms). The products benchmarked are entity["organization","BTCPay Server","bitcoin payment processor"] (both entity["company","LunaNode","vps hosting provider"] one-click and manual Docker), entity["company","Strike","bitcoin payments company"], entity["company","OpenNode","bitcoin payments processor"], entity["company","Breez","lightning wallet sdk"] (SDK + Breez POS mode in Breez Mobile), entity["organization","LNbits","lightning accounts system"] (self-hosted), and entity["company","Square","pos payments platform"] (Bitcoin Payments + wallet tooling), plus entity["company","Shopify","ecommerce platform"] where it materially changes the Strike onboarding flow. citeturn4view0turn3view0turn12view0turn11search0turn16view0

To make “time” meaningful, I separate:
- **Hands-on setup time**: what the merchant must actively do (click/type/scan/confirm).
- **Blocking wait time**: what the merchant waits for (chain sync, KYB/KYC review, app store approval, etc.).
- **Time-to-first-payment** is the earliest moment a real customer can pay and the merchant can observe the payment as received (on the dashboard/POS or in the node’s wallet). When tools explicitly state settlement timing (e.g., “settles in seconds”), I treat that as post-setup behavior rather than setup effort. citeturn11search2turn16view0turn16view3

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["BTCPay Server point of sale app screenshot","LNbits TPoS extension screenshot","OpenNode payment request POS screenshot","Square Bitcoin payments Lightning invoice QR code screenshot"],"num_per_query":1}

## Benchmark journeys for sovereignty-first self-hosting

### BTCPay Server on LunaNode one-click

**Path from intent to first payment received (documented steps)**  
BTCPay’s own LunaNode Web-Wizard guide breaks the journey into a fairly explicit sequence: create a LunaNode account and add credits (including waiting for invoice confirmation), create an API key, open the web wizard, paste API credentials, select a domain (provider-generated or custom), configure options, launch the VM and wait ~6–7 minutes for deployment; if using a custom domain, SSH into the VM to re-run setup with the right host/protocol settings; then visit the BTCPay URL to register the first (admin) account and proceed. citeturn4view0turn13search2

**Time**  
The web-wizard VM deployment itself is explicitly called out as ~6–7 minutes. citeturn4view0  
However, BTCPay’s LunaNode deployment guide also explicitly calls out that you must wait for blockchain sync before you can accept payments; it estimates **1–7 days** depending on plan and enabled coins, with a faster band of **~1–2 days** if you enable CPU utilization, and notes a one-time **$3** charge for faster sync when enabling CPU utilization. citeturn4view0  
LunaNode’s own guide similarly notes you can get the site online quickly (within minutes), but you **cannot accept payments until blockchains are fully synchronized**, which can take **several days**. citeturn4view1  

**Friction points that show up in the “coffee shop owner” UX**
- **Account funding + “invoice confirmation” wait** is explicitly mentioned in BTCPay’s guide (a non-technical “what is an invoice confirmation?” moment). citeturn4view0  
- **Custom domain requires SSH + shell commands**; BTCPay’s guide states LunaNode can provide a generic domain to get started, but custom domain setup requires comfort with the command line. citeturn4view0  
- **Full-node sync is the dominant blocker** to “first payment received.” citeturn4view0turn4view1  

**Cost**
- BTCPay’s LunaNode Web-Wizard page cites a **~$15.80/month** figure for a self-hosted BTCPay instance that includes a Bitcoin full node and Lightning node. citeturn4view0  
- LunaNode’s BTCPay guide gives concrete pricing mechanics: e.g., a recommended **m.4 plan at $14/month**, plus **$1.80/month per 60GB volume per cryptocurrency**, with the launcher showing total monthly price before deployment. citeturn4view1  
- BTCPay’s guide also notes a **$3 one-time** fee option tied to faster sync when enabling CPU utilization. citeturn4view0  

### BTCPay Server via manual Docker deployment

**Path from intent to first payment received (documented steps)**  
BTCPay’s Docker introduction documents a “manual” (but still scripted) path that assumes you already have a server + domain, then: login as root, create a directory, clone `btcpayserver-docker`, set multiple environment variables (host, network, crypto, reverse proxy, lightning, etc.), and run `./btcpay-setup.sh -i`. It also explicitly lists what the setup script does (install Docker, install Docker-Compose, configure startup at reboot, install utilities, and start BTCPay). citeturn3view0  

After the stack is up, BTCPay’s onboarding docs state the first created account on a fresh instance is automatically admin, and then you proceed to create/store configuration. citeturn13search2turn13search0  
To reach “first payment received” for a retail-facing flow, BTCPay’s Apps docs give a fairly direct path: create a Point of Sale app inside BTCPay (Apps → Create, choose POS type, select store, configure items, save, view app), then use the resulting URL on a phone/tablet and present invoices to customers. citeturn13search6turn13search1  

**Time**  
The blocking time for a default full-node setup is still the critical limiter: BTCPay’s Synchronization FAQ states **full Bitcoin node synchronization should take between 1 and 5 days**, and notes CPU constraints/throttling can materially affect this. citeturn3view1  
BTCPay’s FastSync documentation states that validating from genesis typically takes **1–2 days on “affordable servers”** and can take **~two weeks on low-powered devices** like a Raspberry Pi; it claims FastSync can reduce this to **minutes or a few hours**, but also documents the security downside (malicious UTXO set snapshots). citeturn3view2  

**Friction points**
- **Server + domain + TLS prerequisites** are implicit in the manual Docker flow (you must have a domain and configure reverse proxy/HTTPS if you follow the documented Nginx path). citeturn3view0  
- **Sync + resource troubleshooting** (CPU throttling, swap) appear prominently in BTCPay’s own synchronization troubleshooting guidance, meaning “first payment received” is not just waiting—it can turn into diagnosing performance issues. citeturn3view1  
- BTCPay’s “Choosing a Deployment Method” page explicitly warns that manual deployments and hardware builds are **not recommended for production** and require technical knowledge. citeturn3view3  

**Cost**
- No single “manual Docker” price exists because it depends on server + storage, but BTCPay’s documentation repeatedly frames the relevant decision axis as monthly hosting cost vs. ease/support and includes a reference price point of “affordable servers (around $10/month)” in FastSync discussion. citeturn3view2turn3view3  

## Benchmark journeys for “download an app” non-custodial setups

### Breez SDK

This is the most important benchmark in your context because it demonstrates a **self-custody** pattern that can *feel* like “download an app and receive,” by offloading liquidity/channel complexity into SDK + LSP mechanics rather than asking the merchant to run a full stack.

**Path to first payment received (as designed by the SDK)**  
Breez SDK’s Liquid documentation is explicit: you are **not required to open a channel and set up inbound liquidity**, and “once the SDK is initialized, you can directly begin receiving payments.” It states the receive process is: (1) prepare, (2) receive. citeturn12view0  

Breez SDK’s Greenlight documentation adds the missing operational detail for “what happens when inbound liquidity is insufficient”: if the intended receive amount exceeds inbound liquidity, **a new channel will be opened by the LSP**, and the SDK provides an `open_channel_fee` call to calculate those fees. citeturn12view2  

**Time**
- The key time property here is not “how long does chain sync take,” but “can I begin receiving immediately after initialization?” Breez Liquid’s docs explicitly say yes (receive without pre-configuring inbound liquidity). citeturn12view0  
- Any remaining delay becomes payment-rail dependent (Lightning vs. on-chain vs. Liquid) and fee confirmation UX, because the SDK’s “prepare” step returns relative fees for confirmation. citeturn12view0  

**Friction points**
- The merchant-facing friction is shifted from “operate a server” to “accept LSP-mediated liquidity management” and fee disclosure/acceptance flows, rather than running infrastructure. citeturn12view2turn12view0  
- If you rely on background notifications for “receipt confirmed,” the Greenlight docs explicitly recommend implementing a notification plugin with webhooks for mobile background payment notifications—this is a developer friction point, but it directly influences merchant UX for reliability at the counter. citeturn12view2  

**Cost**
- Breez SDK surfaces fees as part of the receive flow: Liquid documentation shows prepare returns `fees_sat` and (in some language bindings) also references a percentage-based “swapper fee rate,” and Greenlight explicitly supports calculating LSP channel-opening fees via `open_channel_fee`. citeturn12view0turn12view2  
- Practically, this means costs are not “monthly hosting,” but “per-liquidity / per-swap fee surfaces,” and must be handled in UX (especially for first payment, where the first inbound liquidity event often happens). citeturn12view2turn12view0  

### Breez POS mode in Breez Mobile

This is not “server-required,” but it’s relevant because it shows how a merchant-facing POS UX can be made simple while still being non-custodial.

**Path from intent to first payment received (documented steps)**  
Breez’s POS guide states: download the app, open the left menu and select Point of Sale mode, then open POS Settings to configure (optionally) a manager password, item catalog, etc. It also notes automatic backup support and that **each device runs its own Lightning node**, with balances remaining separate across devices. citeturn12view1  

**Time**
- The “merchant can get to a POS screen quickly after downloading” is implied by the step flow (download → toggle to POS mode). citeturn12view1  

**Friction points**
- “Each device runs its own Lightning node” + “balances remain separate” becomes a real operational friction for multi-device retail setups (multiple registers, shift handoff, etc.). citeturn12view1  
- The “manager password” pattern is explicitly designed to limit staff to receiving only (prevent outgoing payments without authorization), which is a crucial part of a realistic merchant security model. citeturn12view1  

**Cost**
- The guide does not present a simple merchant fee schedule; instead it frames the POS as Lightning-native and focuses on operational setup and security constraints. citeturn12view1  

## Benchmark journeys for custodial turnkey providers

### Strike Merchant (Shopify “no-code” path)

**Path from intent to first payment received (documented steps)**  
Strike’s “sign up for a Strike Business account” checklist is explicit: start business onboarding in the dashboard, verify email, create a username (used for peer-to-peer and Lightning address transactions), select country/state, proceed with verification. citeturn5search0turn5search3turn5search7  

For the easiest “merchant acceptance” flow with documented steps, Strike’s Shopify FAQ provides a clean sequence:
- Confirm you have a verified Strike Business account  
- Install the free Strike Shopify app from the Shopify app store and sign in to Strike to complete installation  
- At checkout, customer selects “Pay with Bitcoin Lightning,” then Strike generates a Lightning invoice QR, customer pays with any Lightning-enabled wallet, and funds are delivered to the merchant’s Strike account as cash, followed by checkout confirmation. citeturn12view0  

**Time**
- The integration is explicitly positioned as “no-code,” and the acceptance flow is a small number of steps once the business account is verified and the app is installed. citeturn12view0turn5search0  
- The only potentially large blocker in “time-to-first-payment” is the **business verification** step, which is explicitly part of onboarding. citeturn5search0turn12view0  

**Friction points**
- **Verification gating** is part of the business account creation flow. citeturn5search0turn12view0  
- The Shopify path is US-based per Strike’s Shopify FAQ, which can be a rollout limitation depending on merchant geography (relevant for go-to-market). citeturn12view0  

**Cost**
- Strike’s Shopify FAQ describes the Shopify app as “free.” citeturn12view0  
- Strike’s fee disclosures focus on **sending**: Strike states it charges an estimated Lightning routing fee when you send funds via Lightning, and (separately) on-chain send fee choices for certain on-chain send speeds. These are not merchant processing fees per se, but they do define the cost surface for merchants withdrawing or moving funds. citeturn5search2turn5search5  

### OpenNode

**Path from intent to first payment received (documented steps)**  
OpenNode makes the “mobile POS” journey extremely short after you have an account: sign in on mobile, go to Payments → Request, optionally “Add to Home Screen,” and you can initiate payment requests that function like a POS. citeturn11search1turn11search7  

OpenNode’s help center also explicitly calls out the existence of KYB/KYC as part of “Getting Started” (sign up, complete KYB/KYC, add business information). citeturn11search11  

**Time**
- OpenNode’s POS guide uses “with just a few taps” framing and positions the POS setup as fast. citeturn11search1  
- OpenNode’s billing/invoicing marketing pages explicitly state settlement is **instant on Lightning** (and near-instant on-chain). citeturn11search2turn11search8  

**Friction points**
- The primary friction for a non-technical merchant is **not** infrastructure (no server/DNS/TLS), but **account onboarding + compliance** (KYB/KYC) and the operational discipline of staying logged in (POS requires you to be signed in). citeturn11search11turn11search1  

**Cost**
- OpenNode’s pricing page clearly states it charges a **1% transaction fee** for payments and payouts, with no hidden charges, conversion fees, or sign-up costs. citeturn11search0  

### Square Bitcoin (mainstream baseline)

Square is the mainstream “Stripe-like UX” baseline in this benchmark specifically because it offers a deeply integrated in-POS Bitcoin payment method while hiding all infra (and—critically—hiding Lightning node operations entirely).

**Path from intent to first payment received (documented steps)**  
Square’s own “How to accept bitcoin payments” guidance is remarkably short:
- Verify identity + complete two-step verification  
- Enable Bitcoin Payments in Square Dashboard or the Square Point of Sale app  
- At checkout, select Bitcoin, a Lightning invoice QR appears, customer scans with any Lightning-enabled wallet, and the payment settles in seconds and appears in Square Dashboard (either in bitcoin or converted USD depending on settings). citeturn16view3turn16view0  

Square’s support article also documents the exact in-checkout steps (enter amount → Pay → choose Bitcoin → customer scans QR) and operational behaviors like:
- If it takes more than five minutes, the payment is declined and you must create a new cart for a new exchange rate  
- Sellers can “Complete payment” manually if the customer’s wallet shows confirmed but POS is delayed, and Square disclaims responsibility for reimbursement if you manually confirm and don’t receive funds. citeturn16view1  

**Time**
- Square’s own pages emphasize that payments **settle in seconds** and appear almost instantly in the dashboard. citeturn16view0turn16view3  
- Practically, the merchant setup time is bounded by identity verification + enabling the payment method, rather than infrastructure. citeturn16view3turn16view1  

**Friction points**
- Availability constraints are explicit: Square’s guide states Bitcoin Payments are available to US businesses with eligible accounts, excluding New York (with exclusions possibly applying). citeturn16view3  
- There is a **transaction cap**: Square’s Bitcoin page states Bitcoin payments are currently supported for transactions up to **$600**; larger purchases need another payment method. citeturn16view0turn16view3  
- Operational edge cases (timeouts, manual completion risk) are explicitly documented. citeturn16view1  

**Cost**
- Square’s Bitcoin page states: Bitcoin payments are **fee-free until 2027**, then a flat **1%** after that; it also explicitly states “0% processing fee through 2026” and provides separate fees for conversions (1%), buy/sell (1% plus spread), and withdrawals (rush/priority fees plus network fees). citeturn16view0  
- Square’s launch press release frames this as “stripping away complexity” and “eliminating the need for technical expertise,” which is exactly the UX property ArxMint is trying to emulate while keeping sovereignty. citeturn16view2  

## Cross-competitor comparison and what actually drives “under 15 minutes” UX

### Condensed comparison table

| Provider / flow | What the merchant operates | Biggest blocker to “first payment received” | Documented setup steps delta | Direct fee model (simplified) |
|---|---|---|---|---|
| BTCPay on LunaNode one-click | A VPS + BTCPay stack (incl. full node + LN node) | Full chain sync (1–7 days; faster w/ CPU utilization + optional $3) citeturn4view0turn4view1 | Wizard reduces infra steps, but still requires account credits + API key + optional SSH for custom domain citeturn4view0 | ~$15.80/mo cited; LunaNode plan + volume pricing; optional $3 for faster sync citeturn4view0turn4view1 |
| BTCPay manual Docker | A server + domain + Docker stack | Full chain sync (1–5 days; FastSync minutes/hours w/ trust tradeoff) citeturn3view1turn3view2 | Multiple shell steps + env vars + domain/HTTPS assumptions citeturn3view0 | Hosting-dependent; docs reference “affordable servers (~$10/mo)” in FastSync context citeturn3view2 |
| Breez SDK | App runtime + LSP interactions | Mostly none for initial receive (Liquid: can receive immediately after init, no inbound setup) citeturn12view0 | “Initialize → prepare → receive” is the designed receive flow citeturn12view0 | Fees surfaced per receive + possible LSP channel fees when inbound insufficient citeturn12view0turn12view2 |
| LNbits self-hosted | Server + LNbits app + a Lightning funding source | Funding source/liquidity and safe exposure (Tor vs clearnet, restrict users) citeturn14view2turn13search1 | Install → create SuperUser → set funding source → enable POS extension (TPoS) citeturn14view2turn10view0 | Software is open-source; costs are server + underlying funding source choices citeturn13search6turn13search11 |
| Strike Merchant (Shopify) | A custodial account + Shopify plugin | Business verification + platform eligibility citeturn12view0turn5search0 | “Install free app → select Pay with Lightning → QR invoice” citeturn12view0 | App is free; Strike discloses routing/on-chain send fees for sends (withdrawal/movement surface) citeturn12view0turn5search2 |
| OpenNode | A custodial account (web/mobile) | KYB/KYC + staying signed in citeturn11search11turn11search1 | “Payments → Request” POS in a few taps citeturn11search1turn11search7 | 1% transaction fee citeturn11search0 |
| Square Bitcoin | Square POS + Square dashboard | Identity verification + feature availability + $600 cap citeturn16view3turn16view0 | Enable once; checkout generates LN invoice QR; settles in seconds citeturn16view3turn16view1 | 0% processing fee through 2026; fee-free until 2027; then 1% citeturn16view0 |

### What the “fast” experiences have in common

The flows that feel like “download → accept payment” share three core properties:

First, they **avoid the full-node + server lifecycle problem** in the onboarding loop. BTCPay’s own docs make clear that default “full node from genesis” sync is multi-day (1–5 days) and is the gating factor for taking payments; even LunaNode’s wizard can stand up a server in minutes, but it still blocks on synchronization. citeturn4view1turn3view1  

Second, they **collapse operational complexity into the platform**, not the merchant: Square explicitly says it manages the “technical details behind each transaction,” with “no need to handle wallets, private keys, or external exchanges,” and presents Bitcoin acceptance as a normal POS payment method. citeturn16view3turn16view2 OpenNode similarly positions itself as a hosted checkout/POS with instant settlement and a short “request payment” flow. citeturn11search1turn11search2  

Third, the successful sovereignty-preserving “app-first” patterns **automate liquidity/receive readiness**. Breez SDK Liquid’s receive docs explicitly remove the inbound liquidity pre-step, allowing immediate receiving after initialization, and Greenlight documents LSP channel opening when needed (with explicit fee calculation APIs). citeturn12view0turn12view2

## Implications for ArxMint: how to deliver “download → configure → accept payment” under 15 minutes while keeping sovereignty

Your core constraint (“merchant must run their own server”) means ArxMint has to beat BTCPay on two dimensions simultaneously:
- **reduce hands-on setup steps**, and
- **eliminate multi-day blockers** (full sync; manual DNS/TLS; unclear liquidity).

The benchmarking above strongly suggests a practical path:

### Make ArxMint feel like an app by adding a control plane that provisions the server for them

BTCPay’s LunaNode approach is basically a “wizard control plane” that turns infra into a guided flow, but it still requires multiple accounts/keys and blocks on sync. citeturn4view0turn4view1  
BTCPay’s Configurator concept is explicitly aimed at making deployment simpler by exporting a Docker deployment script or deploying to a VPS via SSH. citeturn2search0  

For ArxMint, the benchmark “bar” here isn’t just a wizard—it’s **one wizard that owns the whole operational lifecycle**:
- provisioning compute + storage,
- domain assignment (at least a default subdomain),
- TLS issuance and renewal,
- upgrades and rollback,
- backups and restore,
- monitoring + alerts.

That is exactly what custodial turnkey providers do (Square/OpenNode), except ArxMint would do it in a **non-custodial control plane** where the merchant retains keys and can export/migrate. Square’s press release implies the reason Square can onboard Main Street is because it “strips away complexity and eliminates the need for technical expertise.” citeturn16view2  
ArxMint’s UX target should be to strip away infra complexity **without stripping away key ownership**.

### Beat BTCPay’s time-to-first-payment by avoiding “full sync before accepting”

BTCPay’s own docs explicitly acknowledge that full-node sync is multi-day and that FastSync can reduce it to minutes/hours but introduces a documented trust risk (malicious UTXO set). citeturn3view1turn3view2  

So if ArxMint’s architecture does not strictly require a fully-synced full node before you can accept a Lightning payment, you can win outright on time-to-first-payment. The market proof is Breez SDK Liquid’s explicit claim: no channel + inbound setup required, and you can begin receiving payments once initialized. citeturn12view0  
If ArxMint must rely on LND-based receiving, Breez Greenlight’s pattern shows a “merchant-friendly” approach: the system can open channels via an LSP when inbound liquidity is insufficient, with fees computed and surfaced to the user. citeturn12view2  

### Copy the “merchant-safe staff UX” patterns from Breez POS and LNbits TPoS

Two merchant-facing details matter a lot in coffee-shop reality:

- **Staff cannot spend funds.** Breez POS explicitly supports a manager password that prevents outgoing payments without authorization, allowing staff to receive only. citeturn12view1  
- **POS surface is “shareable but isolated.”** LNbits TPoS describes itself as a shareable Lightning POS in the browser, and explicitly says each terminal can run isolated from the main wallet for safer staff use. citeturn10view0  

ArxMint’s merchant UX should treat “roles, limits, and isolation” as first-class onboarding objects (not advanced settings), because they reduce perceived risk and reduce operational mistakes.

### Use Square/OpenNode as the “mainstream simplicity” UX bar, then map requirements back into sovereignty

Square’s flow is: verify identity + enable Bitcoin payments → choose Bitcoin at checkout → show invoice QR → “settles in seconds” → appears in dashboard. citeturn16view3turn16view1  
OpenNode’s mobile POS is: sign in → Payments → Request → done. citeturn11search1  

Neither asks the merchant to think about DNS, certificates, port numbers, or backups. If ArxMint must remain self-hosted, you don’t remove these requirements—you **coreograph them** into:
- defaults that work without merchant decisions,
- safe “advanced” escape hatches for power users,
- and an “ops autopilot” layer that makes updates/backups invisible.

The competitive UX takeaway is blunt: **self-hosted sovereignty wins on trust and control, but loses on operational attention.** To hit the “under 15 minutes” gold standard, ArxMint likely needs to borrow the app-first operational abstraction from the fast systems (Square/OpenNode) while borrowing the self-custody + liquidity automation patterns from Breez SDK. citeturn16view2turn11search1turn12view0