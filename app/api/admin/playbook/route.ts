// ============================================================
// ArxMint — Admin Playbook API
// GET /api/admin/playbook — Generate and download replication playbook
// Requires Nostr admin auth (checks ADMIN_PUBKEYS)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthPubkey } from "@/lib/auth-middleware";

// Admin pubkeys (hex) — same set as pledge route
const ADMIN_PUBKEYS = new Set([
  "c56a311f60a2af124959057e90c7f329fba6a8132ef9cd2c126fe5ae0c90c4e3", // Travis
]);

/**
 * Generate the replication playbook markdown from static content.
 *
 * The full dynamic generator lives in lib/replication-playbook.ts (client-side).
 * This endpoint returns the pre-generated playbook with current pilot metadata
 * injected. For dynamic regeneration with live metrics, use the Dashboard
 * Grant Reports tab which calls the client-side generator.
 */
function generatePlaybookMarkdown(period: string): string {
  const now = new Date().toISOString().split("T")[0];

  return `# ArxMint Replication Playbook — Longmont, CO Pilot

**Version:** 1.0
**Based on:** Longmont, CO pilot
**Generated:** ${now}
**Requested period:** ${period}

This playbook documents how to replicate the Longmont, CO Bitcoin circular economy pilot
in your own community. It covers infrastructure setup, guardian recruitment, merchant onboarding,
monitoring, and governance.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Guardian Recruitment & DKG](#guardians)
5. [Merchant Onboarding](#merchants)
6. [Monitoring & Alerts](#monitoring)
7. [Governance Framework](#governance)
8. [Launch Checklist](#launch)
9. [Growth & Scaling](#growth)
10. [Troubleshooting](#troubleshooting)

---

## Overview {#overview}

**What You'll Deploy:**
- Mint backend: Cashu (CDK) or Fedimint federation (3+ guardians)
- Lightning: LND with neutrino light client
- Privacy: Ecash by default
- Monitoring: Prometheus + Grafana
- Agent commerce: L402 + NUT-24 paywalls (optional)

**Target KPIs (6-Month Pilot):**
- 30 merchants by month 6
- 300 monthly active spenders
- 98%+ payment success rate
- 99.5% uptime

---

## Prerequisites {#prerequisites}

**Technical Requirements:**
- Server: VPS with 2+ GB RAM, 20+ GB SSD, public IP
- Docker: Docker Engine 24+ and Docker Compose v2
- Domain: Public domain with DNS control (for HTTPS)
- Bitcoin: Testnet faucet (testing) or mainnet funds

**Community Requirements:**
- Champion: At least one technical community leader
- Merchants: 3–5 founding merchants willing to accept Bitcoin
- Users: 10–20 early adopters for soft launch
- Communication: Telegram, Signal, or Nostr group

**Estimated Costs:**
- Server hosting: $20–50/month
- Domain + SSL: $10–15/year
- Lightning channel funding: 500K–2M sats initial
- NFC cards (optional): $5–10 per merchant

---

## Infrastructure Setup {#infrastructure-setup}

See the full guide: [docs/replication-playbook/infrastructure-setup.md](https://github.com/Traviseric/arxmint/blob/master/docs/replication-playbook/infrastructure-setup.md)

**Quick steps:**
1. Provision VPS (Hetzner CX21 or DigitalOcean Basic — ~$20/month)
2. Run ArxMint Community Generator → download docker-compose.yml
3. \`docker compose up -d\` → all services start
4. Fund Lightning channels (min 1M sats inbound, 3+ channels)
5. Configure DNS + SSL (Caddy handles TLS automatically)

---

## Guardian Recruitment & DKG {#guardians}

*Fedimint deployments only — skip for Cashu.*

See the full guide: [docs/replication-playbook/guardian-recruitment.md](https://github.com/Traviseric/arxmint/blob/master/docs/replication-playbook/guardian-recruitment.md)

**Selection criteria:** Community investment 3+ months, verified identity, 95%+ uptime commitment, geographic diversity.

**DKG ceremony:** All guardians online simultaneously (~30 seconds). Requires pre-scheduled coordination.

---

## Merchant Onboarding {#merchants}

See the full guide: [docs/replication-playbook/merchant-onboarding-kit.md](https://github.com/Traviseric/arxmint/blob/master/docs/replication-playbook/merchant-onboarding-kit.md)

**Onboarding kit per merchant:**
- Hosted checkout page (zero code required)
- Printed QR stand
- Quick-start guide (1 page, laminated)
- NFC card optional (Numo, ~$7/card)

**Monthly targets:** 5 → 15 → 24 → 30 merchants over 6 months.

---

## Monitoring & Alerts {#monitoring}

See the full guide: [docs/replication-playbook/monitoring-runbook.md](https://github.com/Traviseric/arxmint/blob/master/docs/replication-playbook/monitoring-runbook.md)

**Critical alerts:**
- Federation below quorum → Page immediately
- Payment success < 80% → Page immediately
- LND offline → Page immediately
- Low inbound liquidity (< 200K sats) → High priority

---

## Governance Framework {#governance}

**Quorum rules (4-guardian federation):**
- Standard consensus: 3 of 4 guardians
- Emergency actions: 3 of 4 guardians
- Treasury spends: 3 of 4 guardians

**Guardian rotation:** 12-month max term, 3-month cooldown, 14-day handover.

**Incident response:** 4h response time (daytime), 12h overnight for emergencies.

---

## Launch Checklist {#launch}

**Pre-launch (required):**
- [ ] Docker stack deployed — all services running
- [ ] LND synced to chain (synced_to_chain: true)
- [ ] Lightning channels funded (1M+ sats inbound)
- [ ] DNS and TLS configured (HTTPS live)
- [ ] Backup strategy in place (automated daily)
- [ ] Agent security tiers configured
- [ ] Founding merchants recruited (3–5)
- [ ] POS setup for merchants (QR codes provisioned)
- [ ] End-to-end payment test completed
- [ ] Prometheus scraping all services
- [ ] Grafana dashboards configured
- [ ] Alert rules configured
- [ ] Support channel set up

**Optional (recommended):**
- [ ] Launch event planned
- [ ] NFC cards provisioned
- [ ] Governance document signed by all guardians

**Launch day:**
1. Verify all required checklist items complete
2. Send announcement to community channels
3. Host launch event (meetup, demo, or online)
4. Be available for merchant and user support
5. Monitor dashboards closely for first 48 hours

---

## Growth & Scaling {#growth}

| Month | Merchants | MAU | Focus |
|-------|-----------|-----|-------|
| 1 | 5 | 20 | Soft launch, founding merchants |
| 2–3 | 15 | 100 | Merchant push, NFC cards |
| 4–5 | 24 | 210 | Community events, circular spend |
| 6 | 30 | 300 | Target achievement |

**Driving circular spend:**
- Monthly Bitcoin meetups at participating merchants
- Merchant directory (physical map + digital list)
- Cross-merchant spend incentives
- Track and celebrate circular spend milestones

**Scaling to multiple cities:**
1. Document lessons learned
2. Identify partner communities
3. Use ArxMint multi-city federation support
4. Mentor new community champions

---

## Troubleshooting {#troubleshooting}

**LND won't sync:**
- Check neutrino peers: \`docker exec lnd lncli getinfo | grep synced\`
- Add more peers, check disk space (neutrino needs ~500MB)

**Payment failures:**
- Check channel balance: \`docker exec lnd lncli listchannels\`
- Low inbound? Open new channels or use Loop/Magma swap

**Mint not responding:**
- Check logs: \`docker logs arxmint-cdk-mint\`
- Restart: \`docker compose restart cdk-mint\`

**Getting help:**
- ArxMint GitHub: github.com/Traviseric/arxmint
- Fedimint Discord: for federation-specific questions
- Cashu Telegram: for mint-specific questions
- Email: travis@arxmint.com

---

*Generated by ArxMint Replication Playbook API — ${now}*
*For the full interactive playbook, see docs/replication-playbook/ in the repository.*
`;
}

export async function GET(request: NextRequest) {
  // Require admin auth
  const pubkey = getAuthPubkey(request);
  if (!pubkey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ADMIN_PUBKEYS.has(pubkey)) {
    return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const period = searchParams.get("period") ?? new Date().toISOString().split("T")[0];

  const markdown = generatePlaybookMarkdown(period);

  if (format === "markdown" || format === "md") {
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="arxmint-replication-playbook-${period}.md"`,
      },
    });
  }

  // Default: JSON with embedded markdown
  return NextResponse.json({
    title: "ArxMint Replication Playbook",
    version: "1.0",
    sourcePilot: "Longmont, CO",
    generatedAt: new Date().toISOString(),
    period,
    markdown,
    sections: [
      "overview",
      "prerequisites",
      "infrastructure-setup",
      "guardians",
      "merchants",
      "monitoring",
      "governance",
      "launch",
      "growth",
      "troubleshooting",
    ],
    docsUrl: "https://github.com/Traviseric/arxmint/tree/master/docs/replication-playbook",
  });
}
