# ArxMint Hardware Product — Sovereign Commerce Appliance

## Vision

Pre-loaded hardware appliances that let any merchant accept Bitcoin in minutes. Plug in, connect to internet, set wallet password, done. No VPS, no CLI, no setup friction.

ArxMint never touches merchant funds. The merchant owns the hardware, runs the node, holds the keys.

## Product Tiers

| Tier | Contents | Target Price | Audience |
|------|----------|-------------|----------|
| **ArxMint Box** | Intel NUC + pre-loaded software | $500–800 | Merchants with existing internet |
| **ArxMint Station** | NUC + Starlink kit + guided setup | $1,200–1,500 | Merchants anywhere with sky access |
| **ArxMint Citadel** | Custom hardware + Starlink + solar battery + weatherproof case | $2,500+ | Off-grid, remote, developing regions |

## Hardware Spec (ArxMint Box — v1)

| Component | Spec | Notes |
|-----------|------|-------|
| Board | Intel NUC (N100 or i3) | Low power (~15W), fanless options available |
| RAM | 8–16 GB DDR4 | 8 GB minimum for LND + Cashu + monitoring |
| Storage | 256–512 GB NVMe SSD | Testnet ~20 GB, mainnet neutrino ~50 GB |
| Network | Gigabit Ethernet + WiFi 6 | Ethernet preferred for reliability |
| Cost (wholesale) | $150–300 | Bulk pricing from Intel/Beelink/MinisForum |
| Sell price | $500–800 | 2–3x markup covers software + support + margin |

## Software Stack (Pre-loaded)

- Ubuntu 24.04 LTS (minimal server)
- Docker Engine + Compose
- ArxMint full stack: LND + Cashu mint (Nutshell) + Caddy + Prometheus + Grafana
- Cloudflare Tunnel agent (outbound-only, works behind CGNAT/Starlink)
- First-boot setup wizard (local web UI)
- Appliance update system (signed manifests, canary rollout, auto-rollback)
- Zero-knowledge encrypted backups

## First-Boot Experience

1. Merchant plugs in ArxMint Box, connects Ethernet or WiFi
2. Box broadcasts local WiFi AP: "ArxMint-Setup"
3. Merchant connects phone/laptop, opens setup wizard at `http://arxmint.local`
4. Wizard walks through:
   - Set wallet password
   - Write down 24-word seed phrase
   - Enter business name + location
   - Optional: connect custom domain
5. Box provisions LND wallet, starts Cashu mint, establishes Cloudflare Tunnel
6. Merchant gets their checkout URL: `storename.arxmint.cloud`
7. Accepting Bitcoin in under 10 minutes

## Connectivity Options

| Method | How | Best For |
|--------|-----|----------|
| **Existing internet** | Plug into router via Ethernet | Brick-and-mortar shops |
| **Starlink** | Plug into Starlink router | Remote/mobile/off-grid |
| **Cellular hotspot** | Connect via WiFi to phone hotspot | Pop-up/temporary locations |
| **Cloudflare Tunnel** | Outbound-only, no port forwarding | All scenarios (default) |

### Starlink Integration

Starlink uses CGNAT — no inbound connections possible. Cloudflare Tunnel solves this with outbound-only connectivity. The ArxMint Box initiates the tunnel; Cloudflare routes traffic to it.

- Starlink dish: ~$500 hardware + $120/mo service
- Latency: 25–60ms (sufficient for Lightning)
- Uptime: 99%+ with clear sky view
- Works anywhere on earth with sky access

### Use Cases Enabled by Starlink

- Food trucks and mobile vendors
- Farmer's markets and pop-up shops
- Remote mountain/rural towns with no bank
- Developing countries with unreliable telecom
- Off-grid communities (solar + Starlink + ArxMint)
- Disaster relief / temporary commerce infrastructure

## Appliance Update Model

From `docs/research/Phase5-Bazaar/Self-Hosting-UX/7-Operational Resilience`:

- Tested stack BOM: locked versions, signed manifests
- Patch-track auto-updates for UI during maintenance windows
- Consent-required for LND version changes (funds at stake)
- Automatic rollback on failed health checks
- Canary rings: internal -> early adopters -> stable
- No `docker compose pull` — controlled appliance images only

## Backup Strategy

- LND seed phrase: written down during setup, never stored digitally on device
- LND channel.backup: event-driven sync (on channel open/close) to encrypted cloud
- Zero-knowledge: backup payload encrypted locally with seed-derived key
- ArxMint stores encrypted blobs it cannot decrypt
- One-click restore: fresh box -> enter seed -> decrypt -> restore

## Shrink-Down Roadmap

| Phase | Form Factor | Timeline |
|-------|-------------|----------|
| v1 | Intel NUC in stock case | Now |
| v2 | NUC in custom 3D-printed case, ArxMint branding, orange LED | 3–6 months |
| v3 | Raspberry Pi CM5 / RISC-V compute module, custom carrier board | 6–12 months |
| v4 | Custom PCB, minimal form factor, merchant POS integration | 12–24 months |

## Revenue Model

| Stream | Type | Notes |
|--------|------|-------|
| Hardware markup | One-time | 2–3x on NUC cost |
| Managed DNS | Monthly | `storename.arxmint.cloud` — $5–10/mo |
| LSP liquidity | Per-channel | JIT channel opening fees |
| Support tiers | Monthly | Basic (community) / Pro ($29/mo) / Enterprise (custom) |
| Appliance updates | Included | Free for life — drives hardware sales |
| Custom domains | One-time setup | $25 setup fee for CNAME configuration |

## Grant Angles

- **HRF:** Sovereign commerce infrastructure for authoritarian regimes — works with Starlink, no banking needed
- **OpenSats:** Open-source Bitcoin circular economy appliance — plug-and-play merchant node
- **Spiral:** Lightning adoption at the merchant level — remove all setup friction
- **FBCE:** Federated Bitcoin Circular Economy hardware for community deployment

## Competitive Landscape

| Product | What | Price | Difference |
|---------|------|-------|------------|
| Nodl | Bitcoin + Lightning node | $500–800 | General purpose, no merchant focus |
| Start9 | Sovereign computing server | $600+ | App marketplace, not merchant-specific |
| Umbrel | Home server OS | Free (BYO hardware) | Software only, DIY setup |
| myNode | Bitcoin node | $300–500 | Bitcoin-focused, no commerce stack |
| **ArxMint Box** | Merchant payment appliance | $500–800 | Purpose-built for merchants, first-boot wizard, Cashu + Lightning + checkout |

ArxMint Box is the only appliance purpose-built for merchant Bitcoin acceptance with ecash (Cashu) and circular economy tooling built in.

## Next Steps

1. Get ArxMint stack running on TE NUC (testnet) — prove hardware works
2. Write disk image flashing script (Ubuntu + Docker + ArxMint)
3. Build first-boot setup wizard (local web UI)
4. Flash 5 NUCs, deploy to pilot merchants
5. Iterate based on merchant feedback
6. Open pre-orders on arxmint.com
