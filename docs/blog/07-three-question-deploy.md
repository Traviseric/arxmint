# The Three-Question Merchant Deploy: How We're Making Self-Hosting Invisible

**Target publish date:** April 15, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** self-hosted bitcoin payments, merchant bitcoin setup, btcpay alternative, lightning payment node, bitcoin payment onboarding

---

The tools to accept Bitcoin payments without a middleman exist today. The problem is that setting them up feels like a second job. DNS configuration, Docker networking, Lightning channel management, chain sync — each one is a wall between a merchant and their first payment.

ArxMint's target: answer three questions and receive your first payment in under 15 minutes. No Docker. No SSH. No DNS. Here's how.

## The Competitive Reality

We benchmarked every major Bitcoin payment option:

| Solution | Custody | Time to First Payment | Primary Blocker |
|---|---|---|---|
| Square Bitcoin | Custodial | < 5 min | KYC verification |
| Strike (Shopify) | Custodial | < 10 min | Business verification |
| OpenNode | Custodial | < 10 min | KYB/KYC |
| Breez SDK (Liquid) | Non-custodial | < 10 min | None |
| BTCPay (LunaNode) | Self-hosted | 2-12 hours | Full chain sync |
| BTCPay (Manual Docker) | Self-hosted | 12-48 hours | Chain sync + DNS + SSH |
| **ArxMint (Target)** | **Self-hosted** | **< 15 min** | **Infrastructure fee** |

The custodial solutions are fast because they collapse operational complexity into the platform. The self-hosted solutions are slow because they push it all to the merchant. ArxMint's bet: you can eliminate the sysadmin experience without eliminating the server.

## Three Questions, Not Thirty

The ArxMint merchant wizard asks exactly three questions:

1. **"Where will it run?"** — Cloud (recommended), existing home node, or advanced manual setup
2. **"What is your store name?"** — Used for your default hostname
3. **"Online payments or in-person only?"** — Determines whether you need a public URL

That's it. No "which Docker image," no "configure your DNS A record," no "paste your SSH key." The merchant never sees Docker, SSH, or infrastructure details.

## What Happens Behind Those Three Questions

### The Split-Plane Architecture

ArxMint separates the world into two planes:

**Data plane** — the merchant's own node. LND (with Neutrino light client), Cashu mint, checkout page, webhook engine, dashboard, LNURL-pay. The merchant holds the seed phrase and admin macaroons. ArxMint never touches keys or funds.

**Control plane** — ArxMint's provisioning service. Creates VMs, assigns DNS, pushes signed updates, monitors health. Non-custodial by design: it can create and destroy infrastructure but cannot move, freeze, or redirect funds.

The merchant owns the data plane. ArxMint orchestrates the control plane. The boundary between them is the legal firewall that keeps ArxMint out of money transmission.

### No Full Chain Sync (Neutrino)

The single biggest BTCPay pain point is the initial blockchain sync. A full Bitcoin node takes 1-7 days to sync depending on hardware. During that time, the merchant can't accept payments.

ArxMint uses LND with Neutrino — a light client that validates block headers without downloading the full chain. The node is ready to create and pay invoices within minutes of starting, not days. Full node mode is available as an optional upgrade for merchants who want maximum verification, but it's not the default and it's not required.

### Managed DNS (No Setup Required)

Our research identified DNS as the single biggest friction point for non-technical merchants. Buying a domain, configuring A records, waiting for propagation, setting up TLS certificates — each step loses merchants.

ArxMint provides managed subdomains by default: `storename.arxmint.cloud`. The merchant picks a store name, and the provisioning service points the subdomain at their node. HTTPS is automatic via Caddy with Let's Encrypt (ZeroSSL as fallback). Custom domains are available as an upgrade, but they're not a prerequisite.

This is not custody. It's publishing a DNS record that points to the merchant's infrastructure. ArxMint manages the DNS zone; the merchant runs the node.

### Cloudflare Tunnel (No Port Forwarding)

For merchants running on residential internet or behind CG-NAT, inbound port forwarding is impossible. Cloudflare Tunnel solves this with an outbound-only connection from the merchant's node to Cloudflare's edge network. No firewall rules, no port configuration, no dynamic IP headaches.

The trade-off is real: Cloudflare can see checkout page traffic. We accept this because checkout pages are inherently public during a transaction — the customer is already seeing the invoice amount and QR code. Core LND gRPC, seed phrases, admin macaroons, and mint private keys never traverse the tunnel.

Merchants who want end-to-end encryption use Caddy direct mode with a static IP VPS. For in-person POS, LAN-only mode requires no public DNS at all — the customer joins the shop's WiFi and scans a QR code.

### LSP Liquidity (Receive Payments Immediately)

A freshly deployed Lightning node has zero inbound channel capacity. Without it, the node can't receive payments. This is a day-zero problem — the merchant deploys, tries to accept their first payment, and it fails.

ArxMint integrates a Lightning Service Provider (LSP) that opens a just-in-time channel on the merchant's first inbound payment. The merchant sees "max instant payment size" in their dashboard instead of channel capacity jargon. One tap to increase the limit. Turbo channels (zero-conf) for instant onboarding, with clear risk disclosure.

## Why PaaS Doesn't Work

We evaluated every major PaaS option:

- **Fly.io** — Closest fit, but needs dedicated IPv4 ($2/mo) for LND peer-to-peer. Viable but fragile.
- **Railway** — TCP proxy uses random ports, breaking standard LND peer discovery. Volume redeployments cause downtime.
- **Render** — HTTP-only public networking. Fundamentally incompatible with Lightning P2P.

The verdict: PaaS is too fragile for mission-critical merchant POS. A $5-7/month Hetzner VPS (2 vCPU, 2GB RAM, 40GB SSD) is more reliable and cheaper than any PaaS configuration we tested.

## The Appliance, Not the Server

The core insight from our research: "Eliminate being a sysadmin, not running a server." The merchant's node should feel like a router — you plug it in, it works, it updates itself, and you never think about the box. The dashboard shows "checkout link, QR code, today's sales" — not LND sync status and channel graphs.

Updates ship as tested stack BOMs (bill of materials) — locked versions applied as a unit with automatic rollback on failed health checks. The merchant sees "update available" in their dashboard, taps apply, and the node handles the rest. No SSH, no `docker compose pull`, no prayer.

That's how you get to 15 minutes. Not by making the server optional — by making it invisible.

The infrastructure for sovereign commerce already exists. It's just trapped behind a technical wall. ArxMint is the door.
