# Running a Bitcoin Payment Node on $7/Month: The Hardware Reality

**Target publish date:** May 6, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** bitcoin node cost, lightning node hosting, cheap bitcoin node, hetzner bitcoin, raspberry pi lightning node, bitcoin merchant hardware

---

Stripe takes 2.9% + $0.30 per transaction. A merchant doing $10K/month loses ~$320 to processing fees. A self-hosted ArxMint node costs $7/month — regardless of volume. That's $313/month back in your pocket, and it only grows as your sales grow.

But what does $7/month actually get you? We tested every hosting option, from $3 instances that crash to $80 servers that are overkill. Here's the reality.

## The Minimum Viable Merchant Node

ArxMint's merchant stack runs without a full Bitcoin node. LND uses Neutrino, a light client that validates block headers without downloading the full 600+ GB blockchain. This changes the hardware equation entirely.

The minimum stack:
- LND (Neutrino) — Lightning node
- Cashu mint (Nutshell) — Ecash token issuance
- Checkout UI + webhook engine + dashboard
- Caddy — Reverse proxy with auto-HTTPS

Total RAM under normal operation: ~1.2-1.5 GB. The rest is headroom for traffic spikes and LND's channel graph processing.

## Cloud VPS: The Numbers

| Provider | Plan | vCPU | RAM | Storage | Monthly Cost |
|---|---|---|---|---|---|
| Hetzner CPX11 | Shared | 2 | 2 GB | 40 GB SSD | ~$5-7/mo |
| DigitalOcean | Basic | 1 | 2 GB | 50 GB SSD | $12/mo |
| Vultr | Cloud Compute | 1 | 2 GB | 50 GB SSD | $12/mo |
| Fly.io | shared-cpu-1x | 1 | 2 GB | 3 GB vol + IPv4 | ~$15.70/mo |
| LunaNode | m.4 | 2 | 4 GB | 80 GB SSD | ~$15.80/mo |

Hetzner is the clear winner on price. Their CPX11 at the Ashburn datacenter gives you 2 vCPU, 2 GB RAM, and 40 GB NVMe SSD for about $5-7/month depending on the billing period. That's enough to run the full ArxMint merchant stack.

DigitalOcean and Vultr are solid at $12/month with better US datacenter coverage and one-click marketplace images (which ArxMint plans to support).

## The 1 GB Trap

Do not try to run a Lightning node on a 1 GB instance. LND's initial channel graph sync loads the entire network topology into memory. On a 1 GB instance, this triggers an OOM (out of memory) kill within minutes of startup. The node crashes, restarts, loads the graph, OOMs again — a death loop.

We tested this specifically because $3-4/month 1 GB instances are tempting. They don't work. 2 GB is the floor.

## PaaS: Why We Rejected It

Platform-as-a-Service providers seem ideal — no server management, automatic scaling, built-in monitoring. We evaluated the top three:

**Fly.io** — The strongest PaaS candidate. Supports TCP ports (required for LND peer-to-peer) and persistent volumes. But you need a dedicated IPv4 address ($2/month) because LND P2P doesn't work behind shared IPs. Total cost ends up around $15.70/month — more expensive than a dedicated VPS with fewer guarantees.

**Railway** — TCP proxy assigns random generated ports. This breaks standard LND peer discovery, which expects port 9735. Volume redeployments cause downtime. Unsuitable for a payment node that needs to be reachable 24/7.

**Render** — HTTP-only public networking. Lightning P2P uses a custom TCP protocol, not HTTP. Fundamentally incompatible.

The verdict: PaaS adds cost and fragility without eliminating the server. A dedicated VPS is cheaper, more reliable, and gives you a stable IP and port assignment.

## Home Node: Raspberry Pi and Beyond

If you already run a home node (Umbrel, StartOS, RaspiBlitz), adding the ArxMint merchant stack is the cheapest option — zero monthly cost beyond your internet connection.

| Hardware | RAM | Works? | Notes |
|---|---|---|---|
| Raspberry Pi 4 (4 GB) | 4 GB | Marginal | Works for low traffic. Channel graph sync is slow. May OOM under load. |
| Raspberry Pi 5 (8 GB) | 8 GB | Yes | Comfortable headroom. Recommended Pi model. |
| x86 mini-PC (8 GB) | 8 GB | Yes | Best home node option. Faster I/O than Pi. Used Lenovo ThinkCentres go for ~$80-120. |
| Old laptop | 4+ GB | Usually | If it runs Linux and has an SSD, it probably works. |

The RPi 4 (4 GB) is in the "it works but don't push it" category. LND's graph sync is CPU and memory intensive, and the Pi 4's Cortex-A72 struggles with it. Once the graph is synced (which takes a few hours on a Pi 4), normal operation is fine for a low-traffic merchant.

The RPi 5 or any x86 mini-PC with 8 GB RAM is the sweet spot for home deployments. If you're buying new hardware specifically for this, a used ThinkCentre is better value than a new Raspberry Pi — faster CPU, faster SSD interface, and often cheaper.

**Connectivity note:** Home nodes behind residential internet face CG-NAT and dynamic IP issues. ArxMint uses Cloudflare Tunnel to solve this — outbound-only connection, no port forwarding required. For in-person POS only (no online checkout), you don't need public connectivity at all.

## The Real Monthly Cost Breakdown

For the typical ArxMint merchant on the cheapest viable cloud setup:

| Item | Monthly Cost |
|---|---|
| Hetzner CPX11 VPS | $5-7 |
| ArxMint managed operations (optional) | $15-25 |
| Domain name (optional — managed subdomain is free) | $0-1 |
| LSP channel fees (one-time, on first inbound payment) | ~$1-3 equivalent |
| **Total (self-managed)** | **$5-7/mo** |
| **Total (ArxMint managed)** | **$15-25/mo** |

Compare that to Stripe: 2.9% + $0.30 per transaction. A merchant doing $5,000/month in sales pays Stripe ~$175/month. The same merchant on ArxMint pays $5-25/month regardless of volume, plus Lightning routing fees measured in fractions of a penny per transaction.

The breakeven point is low. If you process more than about $200/month in payments, the ArxMint node pays for itself versus Stripe.

## What "Minimum" Actually Means

The numbers above assume the minimum viable stack — no full Bitcoin node, no monitoring stack, no redundancy. For a coffee shop doing 20-50 transactions a day, this is fine.

If you're running a higher-volume operation and want the full observability stack (Prometheus + Grafana dashboards, structured logging, automated alerting), bump to 4 GB RAM and 80 GB storage. That's about $12-15/month on most providers.

If you want a full Bitcoin node for maximum verification (no trust in Neutrino's light client model), add 600+ GB of SSD storage and budget for the initial sync time. That pushes the cost to $25-40/month depending on provider, and the initial setup from 15 minutes to 1-7 days.

For most merchants, Neutrino is the right default. You're trusting the Bitcoin network's proof-of-work security, just not downloading every block yourself. The trade-off is well understood and accepted by the broader Lightning community.

## The Bottom Line

A self-hosted Bitcoin payment node costs less than a Netflix subscription. The hardware requirements are modest — 2 vCPU, 2 GB RAM, 40 GB SSD. The software is open source. The only ongoing cost is the VPS hosting.

The expensive part of accepting Bitcoin payments was never the infrastructure. It was the knowledge required to set it up. That's what ArxMint is eliminating.

Accept payments directly. Keep 100% of every sale. The server costs less than a Netflix subscription. The software is free. No permission needed.
