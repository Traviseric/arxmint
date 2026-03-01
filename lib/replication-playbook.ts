"use client";

// ============================================================
// ArxMint — Replication Playbook Generator
// "BCE in a box" — open-source deployment playbook for
// other communities to replicate a Bitcoin circular economy.
//
// Source: Doc 7 — pilot-to-scale, replication patterns
// ============================================================

import type { CommunityConfig } from "./types";
import type { GovernanceConfig } from "./community-generator";
import type { PilotKPITargets, PilotDeployment } from "./pilot-deployment";

// ---- Playbook Types ----

/** Playbook section */
export interface PlaybookSection {
  id: string;
  title: string;
  content: string;
}

/** Complete replication playbook */
export interface ReplicationPlaybook {
  title: string;
  version: string;
  generatedAt: number;
  sourcePilot: string;
  sections: PlaybookSection[];
}

// ---- Playbook Generator ----

/**
 * Generate a complete replication playbook from a pilot deployment.
 * This is the "BCE in a box" open-source guide.
 */
export function generateReplicationPlaybook(
  pilot: PilotDeployment,
  governance: GovernanceConfig | null
): ReplicationPlaybook {
  const config = pilot.community;

  return {
    title: `ArxMint Replication Playbook — Based on ${pilot.location} Pilot`,
    version: "1.0",
    generatedAt: Date.now(),
    sourcePilot: pilot.location,
    sections: [
      generateOverviewSection(pilot),
      generatePrerequisitesSection(config),
      generateInfrastructureSection(config),
      generateGuardianSection(config, governance),
      generateMerchantSection(config, pilot.kpiTargets),
      generateMonitoringSection(config),
      generateGovernanceSection(governance),
      generateLaunchSection(pilot),
      generateGrowthSection(pilot.kpiTargets),
      generateTroubleshootingSection(config),
    ],
  };
}

function generateOverviewSection(pilot: PilotDeployment): PlaybookSection {
  return {
    id: "overview",
    title: "Overview",
    content: [
      `# ArxMint Replication Playbook`,
      "",
      `This playbook documents how to replicate the ${pilot.location} Bitcoin circular economy pilot ` +
        `in your own community. It covers infrastructure setup, guardian recruitment, merchant onboarding, ` +
        `monitoring, and governance — everything needed to launch a production Bitcoin circular economy.`,
      "",
      "## What You'll Deploy",
      "",
      `- **Mint backend:** ${pilot.community.mintBackend === "fedimint" ? `Fedimint federation (${pilot.community.guardianCount} guardians)` : "Cashu mint (CDK)"}`,
      `- **Lightning:** LND node with neutrino light client`,
      `- **Privacy:** ${pilot.community.privacy.silentPayments ? "Silent Payments, " : ""}${pilot.community.privacy.coinJoin ? "CoinJoin, " : ""}ecash privacy`,
      `- **Monitoring:** Prometheus + Grafana dashboards`,
      `- **Agent commerce:** ${pilot.community.agents.enabled ? "L402 + NUT-24 paywalls" : "Disabled"}`,
      "",
      "## Target KPIs",
      "",
      `- ${pilot.kpiTargets.merchantsTarget} merchants by month ${pilot.kpiTargets.targetMonths}`,
      `- ${pilot.kpiTargets.mauTarget} monthly active spenders`,
      `- ${(pilot.kpiTargets.successRateTarget * 100).toFixed(0)}%+ payment success rate`,
      `- ${(pilot.kpiTargets.uptimeTarget * 100).toFixed(1)}% uptime`,
      "",
      "## Timeline",
      "",
      `Estimated ${pilot.kpiTargets.targetMonths} months to reach target KPIs, ` +
        `plus ${pilot.kpiTargets.targetMonths > 3 ? "2-3" : "1-2"} months for evaluation and scaling.`,
    ].join("\n"),
  };
}

function generatePrerequisitesSection(config: CommunityConfig): PlaybookSection {
  const items: string[] = [
    "# Prerequisites",
    "",
    "## Technical Requirements",
    "",
    "- **Server:** VPS with 2+ GB RAM, 20+ GB SSD, public IP",
    "- **Docker:** Docker Engine 24+ and Docker Compose v2",
    "- **Domain:** Public domain with DNS control (for HTTPS)",
    "- **Bitcoin:** Access to testnet faucet (for testing) or mainnet funds",
    "",
    "## Community Requirements",
    "",
    "- **Champion:** At least one technical community leader to manage the deployment",
    "- **Merchants:** 3-5 founding merchants willing to accept Bitcoin payments",
    "- **Users:** 10-20 early adopters for soft launch",
    "- **Communication:** Telegram, Signal, or Nostr group for coordination",
  ];

  if (config.mintBackend === "fedimint") {
    items.push("");
    items.push("## Federation Requirements");
    items.push("");
    items.push(`- **Guardians:** ${config.guardianCount} trusted community members`);
    items.push("- **Diversity:** Guardians should be geographically and organizationally diverse");
    items.push("- **Availability:** Each guardian must maintain 95%+ uptime");
    items.push("- **Communication:** Secure channel for guardian coordination (Signal recommended)");
  }

  items.push("");
  items.push("## Estimated Costs");
  items.push("");
  items.push("- Server hosting: $20-50/month (VPS)");
  items.push("- Domain + SSL: $10-15/year");
  items.push("- Lightning channel funding: 500K-2M sats initial");
  items.push("- NFC cards (optional): $5-10 per merchant");

  return {
    id: "prerequisites",
    title: "Prerequisites",
    content: items.join("\n"),
  };
}

function generateInfrastructureSection(config: CommunityConfig): PlaybookSection {
  return {
    id: "infrastructure",
    title: "Infrastructure Setup",
    content: [
      "# Infrastructure Setup",
      "",
      "## Step 1: Server Provisioning",
      "",
      "1. Provision a VPS (DigitalOcean, Hetzner, or similar)",
      "2. Install Docker and Docker Compose",
      "3. Configure firewall (allow ports 9735, 10009, 3338, 9090, 3001)",
      "4. Set up DNS A record pointing to your server IP",
      "",
      "## Step 2: ArxMint Deployment",
      "",
      "Use ArxMint's Community Generator to create your deployment config:",
      "",
      "```",
      "1. Go to your ArxMint instance → Create Community",
      `2. Describe your community (e.g., "${config.name}")`,
      "3. Download the generated docker-compose.yml",
      "4. Copy to your server and run: docker compose up -d",
      "```",
      "",
      "## Step 3: Lightning Channel Setup",
      "",
      "1. Wait for LND to sync (~5-10 minutes with neutrino)",
      "2. Generate a new on-chain address: `docker exec lnd lncli newaddress p2tr`",
      "3. Fund the address (testnet faucet or mainnet deposit)",
      "4. Open channels to well-connected nodes:",
      "   - ACINQ: 03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
      "   - Bitrefill: 030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f",
      "5. Target: minimum 1M sats inbound liquidity across 3+ channels",
      "",
      "## Step 4: SSL/TLS Setup",
      "",
      "1. Install Certbot: `apt install certbot`",
      "2. Obtain certificate: `certbot certonly --standalone -d yourdomain.com`",
      "3. Configure reverse proxy (nginx or Caddy) to terminate TLS",
      "",
      "## Step 5: Verify Deployment",
      "",
      "- LND: `docker exec lnd lncli getinfo` — should show synced_to_chain: true",
      `- Mint: curl http://localhost:3338/v1/info — should return mint info`,
      "- Prometheus: http://yourdomain.com:9090 — should show targets UP",
      "- Grafana: http://yourdomain.com:3001 — should show dashboards",
    ].join("\n"),
  };
}

function generateGuardianSection(
  config: CommunityConfig,
  governance: GovernanceConfig | null
): PlaybookSection {
  if (config.mintBackend !== "fedimint") {
    return {
      id: "guardians",
      title: "Guardian Setup (Cashu — N/A)",
      content: [
        "# Guardian Setup",
        "",
        "Your deployment uses a Cashu mint (single-operator model).",
        "No guardian coordination is required.",
        "",
        "For multi-party trust, consider upgrading to Fedimint in the future.",
      ].join("\n"),
    };
  }

  const threshold = governance?.quorum.consensusThreshold || Math.ceil((config.guardianCount * 2) / 3);

  return {
    id: "guardians",
    title: "Guardian Recruitment & DKG",
    content: [
      "# Guardian Recruitment & DKG",
      "",
      "## Recruitment Criteria",
      "",
      `You need ${config.guardianCount} guardians. Selection criteria:`,
      "",
      "- 3+ months of community involvement",
      "- Verified identity (Nostr, PGP key, or in-person)",
      "- Technical ability to maintain a server (or willing to learn)",
      "- Stake in the community (merchant, employer, active member)",
      "- Geographic/organizational diversity preferred",
      "",
      "## DKG Ceremony",
      "",
      "Distributed Key Generation creates the federation's shared signing keys:",
      "",
      `1. Each guardian runs their own fedimintd container`,
      `2. Guardians exchange connection info (P2P URLs)`,
      `3. One guardian initiates the DKG ceremony`,
      `4. All ${config.guardianCount} guardians must be online simultaneously`,
      `5. DKG completes in ~30 seconds — federation is now live`,
      `6. Record the federation invite code and share with members`,
      "",
      "## Quorum Rules",
      "",
      `- Consensus requires ${threshold} of ${config.guardianCount} guardians`,
      `- The federation can tolerate ${config.guardianCount - threshold} guardian failures`,
      `- Emergency actions may require ${Math.min(config.guardianCount, threshold + 1)} guardians`,
      "",
      "## Guardian Responsibilities",
      "",
      "- Keep fedimintd running with 95%+ uptime",
      "- Respond to liveness checks within 24 hours",
      "- Participate in governance decisions",
      "- Report security concerns immediately",
      "- Back up guardian state data regularly",
    ].join("\n"),
  };
}

function generateMerchantSection(config: CommunityConfig, kpis: PilotKPITargets): PlaybookSection {
  return {
    id: "merchants",
    title: "Merchant Onboarding",
    content: [
      "# Merchant Onboarding",
      "",
      "## Onboarding Kit",
      "",
      "Prepare the following for each merchant:",
      "",
      "1. **QR code** — Printed stand with their mint payment address",
      "2. **NFC card** (optional) — Numo tap-to-pay card for counter display",
      "3. **Quick-start guide** — 1-page setup instructions",
      "4. **Support contact** — Direct line to community tech lead",
      "",
      "## Onboarding Process",
      "",
      "1. **Initial meeting** — Explain Bitcoin circular economy concept (15 min)",
      "2. **Wallet setup** — Help merchant install a Cashu-compatible wallet",
      "3. **POS setup** — Generate QR code / provision NFC card",
      "4. **Test payment** — Complete a test transaction together",
      "5. **Go live** — Merchant starts accepting payments",
      "6. **Follow-up** — Check in after 1 week, then monthly",
      "",
      "## Onboarding Targets",
      "",
      `| Phase | Month | Target |`,
      `|-------|-------|--------|`,
      `| Soft launch | 1 | 5 merchants |`,
      `| Push | 2-3 | ${Math.ceil(kpis.merchantsTarget / 2)} merchants |`,
      `| Growth | 4-${kpis.targetMonths} | ${kpis.merchantsTarget} merchants |`,
      "",
      "## Common Merchant Questions",
      "",
      "- **\"What if I need to convert to fiat?\"** — Use the mint's Lightning withdrawal to send to an exchange or P2P marketplace.",
      "- **\"What about volatility?\"** — Ecash is denominated in sats. Merchants can set prices in fiat and auto-convert.",
      "- **\"Is it legal?\"** — Bitcoin is legal in most jurisdictions. Consult local regulations.",
      "- **\"What if the internet goes down?\"** — Ecash tokens can be transferred offline via QR/NFC. Settlement requires connectivity.",
    ].join("\n"),
  };
}

function generateMonitoringSection(_config: CommunityConfig): PlaybookSection {
  return {
    id: "monitoring",
    title: "Monitoring & Alerts",
    content: [
      "# Monitoring & Alerts",
      "",
      "## Prometheus + Grafana",
      "",
      "ArxMint deploys Prometheus and Grafana automatically. Access:",
      "",
      "- **Prometheus:** http://yourdomain.com:9090",
      "- **Grafana:** http://yourdomain.com:3001 (admin / your-password)",
      "",
      "## Key Dashboards",
      "",
      "Configure these Grafana dashboards:",
      "",
      "1. **Federation Health** — Guardian uptime, consensus status, peer connectivity",
      "2. **Lightning Channels** — Channel balance, inbound/outbound capacity, routing success",
      "3. **Mint Operations** — Token issuance, redemption rate, pending proofs",
      "4. **Payment Success** — Success rate, failure reasons, latency percentiles",
      "5. **Community Health** — MAU, merchant count, spend velocity (BCE metrics)",
      "",
      "## Alert Rules",
      "",
      "Set up these critical alerts:",
      "",
      "| Alert | Condition | Severity |",
      "|-------|-----------|----------|",
      "| Federation down | < 2/3 guardians responsive | Critical |",
      "| Low liquidity | Inbound capacity < 200K sats | High |",
      "| Payment failures | Success rate < 95% (15 min window) | High |",
      "| Channel force-close | Any force-close detected | Medium |",
      "| Disk space low | < 5 GB free | Medium |",
      "",
      "## Notification Channels",
      "",
      "Configure Grafana alerting to notify via:",
      "- Telegram bot (recommended for real-time)",
      "- Email (for non-urgent alerts)",
      "- Nostr DM (for decentralized notification)",
    ].join("\n"),
  };
}

function generateGovernanceSection(governance: GovernanceConfig | null): PlaybookSection {
  if (!governance) {
    return {
      id: "governance",
      title: "Governance",
      content: [
        "# Governance",
        "",
        "Use ArxMint's governance generator to create a governance policy for your community.",
        "The generator creates quorum rules, rotation policies, incident response procedures,",
        "and treasury management policies scaled to your guardian count.",
        "",
        "Run the governance generator from the ArxMint Create Community page.",
      ].join("\n"),
    };
  }

  return {
    id: "governance",
    title: "Governance Framework",
    content: [
      "# Governance Framework",
      "",
      "## Quorum Rules",
      "",
      `- Consensus: ${governance.quorum.consensusThreshold} of ${governance.quorum.totalGuardians}`,
      `- Emergency: ${governance.quorum.emergencyThreshold} of ${governance.quorum.totalGuardians}`,
      `- Treasury: ${governance.quorum.treasuryThreshold} of ${governance.quorum.totalGuardians}`,
      "",
      "## Guardian Rotation",
      "",
      `- Maximum term: ${governance.rotation.maxTermMonths} months`,
      `- Cooldown: ${governance.rotation.cooldownMonths} months before re-election`,
      `- Handover: ${governance.rotation.handoverDays} days overlap`,
      `- Max simultaneous rotations: ${governance.rotation.maxSimultaneousRotations}`,
      "",
      "## Incident Response",
      "",
      "| Severity | Response Time | Quorum |",
      "|----------|--------------|--------|",
      ...governance.incidentResponse.severityLevels.map(
        (l) => `| ${l.level} | ${l.responseTimeHours}h | ${l.quorumRequired} |`
      ),
      "",
      "## Treasury Policy",
      "",
      `- Max unilateral spend: ${governance.treasury.maxUnilateralSpendSats.toLocaleString()} sats`,
      `- Minimum reserve: ${governance.treasury.minReservePercent}%`,
      `- Spend justification required: ${governance.treasury.requireSpendJustification ? "Yes" : "No"}`,
      `- Spends published: ${governance.treasury.publishSpends ? "Yes" : "No"}`,
    ].join("\n"),
  };
}

function generateLaunchSection(pilot: PilotDeployment): PlaybookSection {
  return {
    id: "launch",
    title: "Launch Checklist",
    content: [
      "# Launch Checklist",
      "",
      "## Pre-Launch (complete all before going live)",
      "",
      ...pilot.checklist
        .filter((c) => c.required)
        .map((c) => `- [ ] **${c.label}** — ${c.description}`),
      "",
      "## Optional (recommended)",
      "",
      ...pilot.checklist
        .filter((c) => !c.required)
        .map((c) => `- [ ] ${c.label} — ${c.description}`),
      "",
      "## Launch Day",
      "",
      "1. Verify all pre-launch checklist items are complete",
      "2. Send announcement to community channels",
      "3. Host launch event (meetup, demo, or online session)",
      "4. Be available for merchant and user support",
      "5. Monitor dashboards closely for the first 48 hours",
    ].join("\n"),
  };
}

function generateGrowthSection(kpis: PilotKPITargets): PlaybookSection {
  return {
    id: "growth",
    title: "Growth & Scaling",
    content: [
      "# Growth & Scaling",
      "",
      "## Month-by-Month Growth Plan",
      "",
      "| Month | Merchants | MAU | Focus |",
      "|-------|-----------|-----|-------|",
      `| 1 | 5 | 20 | Soft launch, founding merchants |`,
      `| 2-3 | ${Math.ceil(kpis.merchantsTarget / 2)} | 100 | Merchant push, NFC cards |`,
      `| 4-5 | ${Math.ceil(kpis.merchantsTarget * 0.8)} | ${Math.ceil(kpis.mauTarget * 0.7)} | Community events, circular spend |`,
      `| ${kpis.targetMonths} | ${kpis.merchantsTarget} | ${kpis.mauTarget} | Target achievement |`,
      "",
      "## Driving Circular Spend",
      "",
      "The key metric is **circular spend** — users spending at local merchants who then spend at other local merchants.",
      "",
      "Strategies:",
      "- Host monthly Bitcoin meetups at participating merchants",
      "- Create a merchant directory (physical map + digital list)",
      "- Incentivize cross-merchant spending with community rewards",
      "- Track and celebrate circular spend milestones",
      "",
      "## Scaling to Multiple Cities",
      "",
      "Once your pilot reaches Growing or Established tier:",
      "",
      "1. Document lessons learned and local adaptations",
      "2. Identify partner communities interested in replication",
      "3. Use ArxMint's multi-city federation support for cross-city commerce",
      "4. Mentor new community champions through their deployment",
      "5. Share metrics and playbook updates",
    ].join("\n"),
  };
}

function generateTroubleshootingSection(config: CommunityConfig): PlaybookSection {
  return {
    id: "troubleshooting",
    title: "Troubleshooting",
    content: [
      "# Troubleshooting",
      "",
      "## Common Issues",
      "",
      "### LND won't sync",
      "- Check neutrino peers: `docker exec lnd lncli getinfo | grep synced`",
      "- Add more peers: restart with additional `--neutrino.addpeer` flags",
      "- Check disk space: neutrino needs ~500MB",
      "",
      "### Payment failures",
      "- Check channel balance: `docker exec lnd lncli listchannels`",
      "- Low inbound? Open new channels or use a swap service",
      "- Route not found? Add channels to well-connected hubs",
      "",
      "### Mint not responding",
      `- Check logs: \`docker logs arx-${config.mintBackend === "fedimint" ? "guardian-0" : "cdk-mint"}-${config.id}\``,
      "- Restart: `docker compose restart cashu-mint`",
      "- Check LND connection (mint depends on LND)",
      "",
      config.mintBackend === "fedimint"
        ? [
            "### Guardian offline",
            `- Federation needs ${Math.ceil((config.guardianCount * 2) / 3)} of ${config.guardianCount} guardians online`,
            "- Contact guardian via secure channel (Signal, Nostr)",
            "- If unreachable >72h, begin rotation procedure",
            "- Emergency: convene remaining guardians for quorum action",
          ].join("\n")
        : "",
      "",
      "### Monitoring not showing data",
      "- Check Prometheus targets: http://localhost:9090/targets",
      "- Verify services expose /metrics endpoint",
      "- Check Docker network connectivity between containers",
      "",
      "## Getting Help",
      "",
      "- ArxMint GitHub: Report issues and check documentation",
      "- Community support channel: Ask your local community leader",
      "- Fedimint Discord: For federation-specific questions",
      "- Cashu Telegram: For mint-specific questions",
    ].join("\n"),
  };
}

// ---- Export Helpers ----

/** Export the full playbook as a single Markdown document */
export function exportPlaybookMarkdown(playbook: ReplicationPlaybook): string {
  const lines: string[] = [
    `# ${playbook.title}`,
    "",
    `**Version:** ${playbook.version}`,
    `**Based on:** ${playbook.sourcePilot} pilot`,
    `**Generated:** ${new Date(playbook.generatedAt).toISOString().split("T")[0]}`,
    "",
    "## Table of Contents",
    "",
  ];

  playbook.sections.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.title}](#${s.id})`);
  });

  lines.push("");
  lines.push("---");

  playbook.sections.forEach((s) => {
    lines.push("");
    lines.push(s.content);
    lines.push("");
    lines.push("---");
  });

  lines.push("");
  lines.push(`*Generated by ArxMint Replication Playbook Generator — ${new Date(playbook.generatedAt).toISOString()}*`);

  return lines.join("\n");
}
