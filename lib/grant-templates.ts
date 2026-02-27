"use client";

// ============================================================
// ArxMint — Grant Application Templates
// Generate grant applications for FBCE, OpenSats, and Fedi.
//
// Source: Doc 7 — grant templates, BCE patterns
// ============================================================

import type { CommunityConfig } from "./types";
import type { BCEMetrics } from "./bce-metrics";
import type { PilotKPITargets } from "./pilot-deployment";
import type { GovernanceConfig } from "./community-generator";

// ---- Grant Types ----

/** Supported grant programs */
export type GrantProgram = "fbce" | "opensats" | "fedi";

/** Grant application status */
export type GrantStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "rejected"
  | "completed";

/** Budget line item */
export interface BudgetLineItem {
  category: "infrastructure" | "development" | "community" | "operations" | "marketing" | "other";
  description: string;
  amountUSD: number;
  amountBTC?: number;
  justification: string;
}

/** Grant milestone */
export interface GrantMilestone {
  id: number;
  title: string;
  description: string;
  deliverables: string[];
  targetMonth: number;
  budgetPercent: number;
}

/** Complete grant application */
export interface GrantApplication {
  program: GrantProgram;
  status: GrantStatus;
  title: string;
  summary: string;
  problemStatement: string;
  proposedSolution: string;
  teamDescription: string;
  technicalApproach: string[];
  milestones: GrantMilestone[];
  budget: BudgetLineItem[];
  totalBudgetUSD: number;
  kpiTargets: string[];
  differentiators: string[];
  openSourceCommitment: string;
  communityImpact: string;
  generatedAt: number;
}

// ---- FBCE Round 3 Template ----

/** Generate an FBCE Round 3 grant application */
export function generateFBCEApplication(
  community: CommunityConfig,
  metrics: BCEMetrics | null,
  kpiTargets: PilotKPITargets,
  location: string,
  teamName: string,
  totalBudgetUSD: number
): GrantApplication {
  const tierLabel = metrics?.maturityTier || "nascent";

  return {
    program: "fbce",
    status: "draft",
    title: `${community.name} — Bitcoin Circular Economy Pilot (${location})`,
    summary: `Deploy and grow a Bitcoin circular economy in ${location} using ArxMint's open-source community infrastructure. ` +
      `Target: ${kpiTargets.merchantsTarget} merchants and ${kpiTargets.mauTarget} monthly active spenders within ${kpiTargets.targetMonths} months. ` +
      `${community.mintBackend === "fedimint" ? "Fedimint federation" : "Cashu mint"} backend with privacy-preserving ecash payments.`,
    problemStatement:
      "Most Bitcoin communities lack production-grade infrastructure to support circular economy activity. " +
      "Merchants have no easy onboarding path, users have no privacy-preserving payment tools, and " +
      "there is no standardized way to measure and report on community economic health. " +
      "ArxMint solves this with a one-prompt deployment pipeline, privacy-by-default ecash, and " +
      "built-in BCE metrics tracking aligned with FBCE maturity frameworks.",
    proposedSolution:
      `Deploy ArxMint in ${location} as a full Bitcoin circular economy stack: ` +
      `${community.mintBackend === "fedimint" ? `${community.guardianCount}-guardian Fedimint federation` : "Cashu mint (CDK)"} ` +
      `with Lightning connectivity, privacy defaults (${community.privacy.silentPayments ? "Silent Payments, " : ""}` +
      `${community.privacy.coinJoin ? "CoinJoin, " : ""}ecash), ` +
      `merchant onboarding (QR + NFC), operator-grade monitoring (Prometheus + Grafana), ` +
      `and AI agent commerce rails (L402 + NUT-24). ` +
      `All open-source, deployable via a single Docker Compose command.`,
    teamDescription: teamName,
    technicalApproach: [
      `${community.mintBackend === "fedimint" ? "Fedimint v0.10.0" : "CDK"} mint backend with Lightning bridge`,
      "Cashu ecash for instant, private payments (NUT-24 HTTP 402 paywalls)",
      "Privacy-first: Silent Payments (BIP-352), CoinJoin, PayJoin, Ark VTXOs",
      "NFC tap-to-pay via Numo card integration for merchants",
      "Prometheus + Grafana monitoring with automated alerts",
      "Guardian governance framework with BFT quorum, rotation, and incident response",
      "Built-in BCE metrics tracking aligned with FBCE maturity tiers",
      "Open-source replication playbook for other communities",
    ],
    milestones: [
      {
        id: 1,
        title: "Infrastructure Deployment",
        description: "Deploy production Docker stack, complete guardian DKG, fund channels",
        deliverables: [
          "Production server running full ArxMint stack",
          "Guardian governance document signed",
          "Lightning channels funded (1M+ sats inbound)",
          "Monitoring dashboards configured",
        ],
        targetMonth: 1,
        budgetPercent: 25,
      },
      {
        id: 2,
        title: "Merchant Onboarding",
        description: `Recruit and onboard ${Math.ceil(kpiTargets.merchantsTarget / 2)} merchants with POS setup`,
        deliverables: [
          `${Math.ceil(kpiTargets.merchantsTarget / 2)} merchants accepting Bitcoin payments`,
          "Merchant onboarding kit published",
          "POS setup guide (QR + NFC)",
          "First community demo event hosted",
        ],
        targetMonth: 3,
        budgetPercent: 30,
      },
      {
        id: 3,
        title: "Growth & Circular Spend",
        description: `Grow to ${kpiTargets.mauTarget} MAU with circular spend patterns`,
        deliverables: [
          `${kpiTargets.mauTarget} monthly active spenders`,
          `${kpiTargets.merchantsTarget} merchants onboarded`,
          "Cross-merchant circular spend tracked",
          "BCE maturity tier: Emerging or Growing",
        ],
        targetMonth: kpiTargets.targetMonths,
        budgetPercent: 30,
      },
      {
        id: 4,
        title: "Evaluation & Replication",
        description: "Evaluate pilot, publish replication playbook",
        deliverables: [
          "Full KPI achievement report",
          "Open-source replication playbook",
          "Multi-city expansion plan",
          "Grant final report",
        ],
        targetMonth: kpiTargets.targetMonths + 2,
        budgetPercent: 15,
      },
    ],
    budget: generateDefaultBudget(totalBudgetUSD),
    totalBudgetUSD,
    kpiTargets: [
      `${kpiTargets.merchantsTarget} merchants onboarded by month ${kpiTargets.targetMonths}`,
      `${kpiTargets.mauTarget} monthly active spenders by month ${kpiTargets.targetMonths}`,
      `${(kpiTargets.successRateTarget * 100).toFixed(0)}%+ payment success rate`,
      `${(kpiTargets.uptimeTarget * 100).toFixed(1)}% federation/mint uptime`,
      `${kpiTargets.spendVelocityTarget}+ spend events per user per month`,
    ],
    differentiators: [
      "One-prompt deployment: natural language → full economy config → Docker deploy",
      "Privacy by default: ecash + Silent Payments + Ark VTXOs",
      "AI agent commerce: L402 + NUT-24 paywalls for machine-to-machine payments",
      "Built-in BCE health metrics aligned with FBCE maturity framework",
      "Open-source replication playbook for any community",
      `Current BCE tier: ${tierLabel} — demonstrating working pilot`,
    ],
    openSourceCommitment:
      "ArxMint is fully open-source (MIT license). All code, deployment configs, " +
      "merchant onboarding materials, and the replication playbook will be published " +
      "to GitHub. The project prioritizes reproducibility — any community should be " +
      "able to deploy their own Bitcoin circular economy from our playbook.",
    communityImpact:
      `This grant will directly impact ${location} by creating local Bitcoin circular economy infrastructure. ` +
      `${kpiTargets.merchantsTarget} local merchants will gain the ability to accept Bitcoin payments with zero fees ` +
      `via ecash, and ${kpiTargets.mauTarget} community members will have access to privacy-preserving digital payments. ` +
      `The replication playbook ensures this impact can be multiplied across other communities.`,
    generatedAt: Date.now(),
  };
}

// ---- OpenSats Template ----

/** Generate an OpenSats grant application */
export function generateOpenSatsApplication(
  community: CommunityConfig,
  metrics: BCEMetrics | null,
  teamName: string,
  totalBudgetUSD: number
): GrantApplication {
  return {
    program: "opensats",
    status: "draft",
    title: `ArxMint — Open-Source Bitcoin Circular Economy Infrastructure`,
    summary:
      "ArxMint is an open-source toolkit that generates production-ready Bitcoin circular economy " +
      "infrastructure from a natural language prompt. It produces Fedimint/Cashu mint configs, " +
      "Lightning connectivity, privacy defaults, merchant onboarding flows, and monitoring — " +
      "all deployable via Docker. This grant funds continued development and the first pilot deployment.",
    problemStatement:
      "Setting up Bitcoin circular economy infrastructure requires deep technical expertise across " +
      "multiple protocols (Lightning, Fedimint, Cashu, privacy layers). No unified tool exists to " +
      "generate, deploy, and monitor this infrastructure. Communities are stuck choosing between " +
      "fragmented tools or expensive custom development.",
    proposedSolution:
      "ArxMint unifies the Bitcoin circular economy stack into a single, prompt-driven deployment pipeline. " +
      "It integrates CDK (Cashu Development Kit) for production mints, Fedimint for federated custody, " +
      "Coco multi-mint compatibility for cross-mint interop, and operator-grade monitoring. " +
      "AI agents and humans share the same private commerce infrastructure via L402 and NUT-24 paywalls.",
    teamDescription: teamName,
    technicalApproach: [
      "CDK integration for production-grade Cashu mints (Postgres-backed, horizontally scalable)",
      "Coco multi-mint compatibility (cross-mint sends via Lightning bridge)",
      "NUT-24 ecash HTTP 402 paywalls for agent-to-agent commerce",
      "NUT-26 payment requests for QR/NFC merchant integration",
      "Programmable ecash spending conditions (time-lock, escrow, subscription)",
      "ZK-verified token reissuance with auditable agent wallets",
      "Prometheus + Grafana operator-grade monitoring stack",
      "Privacy scoring with per-backend availability awareness",
    ],
    milestones: [
      {
        id: 1,
        title: "CDK & Coco Integration Polish",
        description: "Harden CDK mint integration, multi-mint cross-send, and keyset validation",
        deliverables: [
          "CDK mint Docker service with Postgres backend",
          "Coco multi-mint balance tracking and cross-sends",
          "NUT-13 keyset ID collision protection",
          "Comprehensive test suite",
        ],
        targetMonth: 2,
        budgetPercent: 30,
      },
      {
        id: 2,
        title: "Privacy & Agent Commerce",
        description: "Complete privacy layer and agent commerce rails",
        deliverables: [
          "Silent Payments indexer integration",
          "NUT-24 ecash paywall middleware",
          "L402 + NUT-24 dual-auth agent endpoints",
          "Programmable ecash conditions (NUT-XX)",
        ],
        targetMonth: 4,
        budgetPercent: 35,
      },
      {
        id: 3,
        title: "Pilot Deployment & Playbook",
        description: "Deploy first pilot and create replication playbook",
        deliverables: [
          "First community pilot deployed",
          "Merchant onboarding kit",
          "Replication playbook published",
          "Grant reporting dashboard",
        ],
        targetMonth: 6,
        budgetPercent: 35,
      },
    ],
    budget: generateDefaultBudget(totalBudgetUSD),
    totalBudgetUSD,
    kpiTargets: [
      "Open-source release with full documentation",
      "10+ community deployments using the playbook",
      "CDK integration merged or compatible with upstream",
      "Monthly progress reports published",
    ],
    differentiators: [
      "Prompt-driven deployment — lowers barrier from weeks to minutes",
      "Full-stack: mint + Lightning + privacy + monitoring + governance in one tool",
      "CDK-native: builds on Cashu Development Kit for production mints",
      "Agent commerce: first tool to unify L402 + NUT-24 for human+AI economies",
      "Built-in grant reporting: metrics export matches OpenSats cadence",
    ],
    openSourceCommitment:
      "ArxMint is MIT-licensed and developed in the open on GitHub. All protocol integrations " +
      "(CDK, Fedimint SDK, cashu-ts) build on and contribute back to existing open-source projects. " +
      "Monthly progress reports will be published per OpenSats requirements.",
    communityImpact:
      "ArxMint lowers the barrier for any Bitcoin community to launch their own circular economy. " +
      "By open-sourcing the deployment playbook and tooling, we aim to enable 10+ community " +
      "deployments within a year of the grant period. Each deployment directly enables local " +
      "Bitcoin commerce with privacy-preserving payments.",
    generatedAt: Date.now(),
  };
}

// ---- Fedi Grants Template ----

/** Generate a Fedi grants application */
export function generateFediApplication(
  community: CommunityConfig,
  governance: GovernanceConfig | null,
  teamName: string,
  totalBudgetUSD: number
): GrantApplication {
  return {
    program: "fedi",
    status: "draft",
    title: `${community.name} — Fedimint Community Generator Integration`,
    summary:
      `ArxMint's Community Generator creates production-ready Fedimint federations from natural language prompts. ` +
      `This grant funds integration with Fedimint SDK, G-Bot coordination, and guardian governance tooling ` +
      `to make federation setup accessible to non-technical community leaders.`,
    problemStatement:
      "Setting up a Fedimint federation requires coordinating multiple guardians, managing DKG ceremonies, " +
      "configuring monitoring, and establishing governance policies. This technical complexity prevents " +
      "many communities from adopting federated ecash custody despite its trust-minimization benefits.",
    proposedSolution:
      "ArxMint automates federation deployment end-to-end: guardian recruitment criteria, DKG coordination " +
      "(via G-Bot when available), governance policy generation, monitoring setup, and ongoing guardian " +
      "health tracking. Community leaders describe their needs in plain language; ArxMint generates " +
      "the complete federation infrastructure including governance documents.",
    teamDescription: teamName,
    technicalApproach: [
      "Fedimint SDK (v0.10.0) WASM client integration for browser-side federation interaction",
      "G-Bot API integration for automated guardian coordination (with Docker fallback)",
      "Guardian governance framework: BFT quorum, rotation policy, incident response",
      "Iroh-based ConnectorRegistry networking for guardian peer discovery",
      "Federation health monitoring via Prometheus + Grafana",
      "Gateway bridge for L402 payments through Fedimint ecash",
      "Automated guardian liveness checks with escalation policies",
    ],
    milestones: [
      {
        id: 1,
        title: "Federation Setup Automation",
        description: "Automate federation creation with G-Bot integration and Docker fallback",
        deliverables: [
          "G-Bot API integration (with graceful fallback)",
          "Automated DKG ceremony coordination",
          `Docker Compose generation for ${community.guardianCount}-guardian federation`,
          "Federation health monitoring dashboards",
        ],
        targetMonth: 2,
        budgetPercent: 35,
      },
      {
        id: 2,
        title: "Guardian Governance Tooling",
        description: "Build governance policy generator and guardian management tools",
        deliverables: [
          "Governance document generator (quorum, rotation, treasury policies)",
          "Guardian selection criteria framework",
          "Automated rotation checks and liveness monitoring",
          "Incident response playbook generator",
        ],
        targetMonth: 4,
        budgetPercent: 35,
      },
      {
        id: 3,
        title: "Community Deployment & Documentation",
        description: "Deploy first federation and publish setup guides",
        deliverables: [
          `${community.name} federation deployed with ${community.guardianCount} guardians`,
          "Federation setup guide for non-technical users",
          "Guardian onboarding documentation",
          "Fedimint community integration report",
        ],
        targetMonth: 6,
        budgetPercent: 30,
      },
    ],
    budget: generateDefaultBudget(totalBudgetUSD),
    totalBudgetUSD,
    kpiTargets: [
      "Federation deployment automated to <30 minutes setup time",
      `${community.guardianCount}-guardian federation running with 99.5% uptime`,
      "Governance framework adopted by pilot community",
      "Federation setup guide published for community leaders",
    ],
    differentiators: [
      "Prompt-to-federation: natural language → full Fedimint deployment",
      "G-Bot integration: leverages Fedimint's official coordination service",
      "Governance-first: federation comes with governance policy, not just Docker",
      "Gateway bridge: Fedimint ecash auto-pays L402 challenges",
      "Monitoring included: Prometheus + Grafana from day one",
    ],
    openSourceCommitment:
      "ArxMint's Fedimint integration builds directly on the open-source Fedimint SDK and " +
      "contributes upstream where possible. All governance templates, setup guides, and " +
      "monitoring configs are published under MIT license.",
    communityImpact:
      `This grant enables ${community.name} to operate a trust-minimized federated custody system ` +
      `managed by ${governance?.quorum.totalGuardians || community.guardianCount} local guardians. ` +
      `Community members gain access to private ecash payments without trusting a single custodian. ` +
      `The governance framework ensures long-term sustainability and accountability.`,
    generatedAt: Date.now(),
  };
}

// ---- Budget Generator ----

function generateDefaultBudget(totalUSD: number): BudgetLineItem[] {
  return [
    {
      category: "infrastructure",
      description: "Server hosting, domain, SSL, Lightning channel funding",
      amountUSD: Math.round(totalUSD * 0.2),
      justification: "Production server (VPS), domain registration, initial Lightning liquidity",
    },
    {
      category: "development",
      description: "Core development and protocol integration",
      amountUSD: Math.round(totalUSD * 0.4),
      justification: "Developer time for SDK integration, testing, deployment automation",
    },
    {
      category: "community",
      description: "Merchant onboarding, events, education",
      amountUSD: Math.round(totalUSD * 0.2),
      justification: "Merchant training, onboarding materials, community events, NFC cards",
    },
    {
      category: "operations",
      description: "Ongoing maintenance, monitoring, support",
      amountUSD: Math.round(totalUSD * 0.15),
      justification: "Server maintenance, guardian coordination, user support",
    },
    {
      category: "other",
      description: "Contingency and travel",
      amountUSD: Math.round(totalUSD * 0.05),
      justification: "Unexpected costs, conference attendance for promotion",
    },
  ];
}

// ---- Export Helpers ----

/** Export a grant application as Markdown (for submission) */
export function exportGrantMarkdown(app: GrantApplication): string {
  const lines: string[] = [
    `# ${app.title}`,
    "",
    `**Program:** ${app.program.toUpperCase()}`,
    `**Status:** ${app.status}`,
    `**Generated:** ${new Date(app.generatedAt).toISOString().split("T")[0]}`,
    `**Budget:** $${app.totalBudgetUSD.toLocaleString()} USD`,
    "",
    "## Summary",
    "",
    app.summary,
    "",
    "## Problem Statement",
    "",
    app.problemStatement,
    "",
    "## Proposed Solution",
    "",
    app.proposedSolution,
    "",
    "## Technical Approach",
    "",
  ];

  app.technicalApproach.forEach((item) => {
    lines.push(`- ${item}`);
  });

  lines.push("");
  lines.push("## Milestones");
  lines.push("");

  app.milestones.forEach((m) => {
    lines.push(`### Milestone ${m.id}: ${m.title} (Month ${m.targetMonth})`);
    lines.push("");
    lines.push(m.description);
    lines.push("");
    lines.push("**Deliverables:**");
    m.deliverables.forEach((d) => lines.push(`- ${d}`));
    lines.push(`**Budget allocation:** ${m.budgetPercent}% ($${Math.round(app.totalBudgetUSD * m.budgetPercent / 100).toLocaleString()})`);
    lines.push("");
  });

  lines.push("## Budget");
  lines.push("");
  lines.push("| Category | Description | Amount |");
  lines.push("|----------|-------------|--------|");
  app.budget.forEach((b) => {
    lines.push(`| ${b.category} | ${b.description} | $${b.amountUSD.toLocaleString()} |`);
  });
  lines.push(`| **Total** | | **$${app.totalBudgetUSD.toLocaleString()}** |`);

  lines.push("");
  lines.push("## KPI Targets");
  lines.push("");
  app.kpiTargets.forEach((k) => lines.push(`- ${k}`));

  lines.push("");
  lines.push("## Differentiators");
  lines.push("");
  app.differentiators.forEach((d) => lines.push(`- ${d}`));

  lines.push("");
  lines.push("## Open Source Commitment");
  lines.push("");
  lines.push(app.openSourceCommitment);

  lines.push("");
  lines.push("## Community Impact");
  lines.push("");
  lines.push(app.communityImpact);

  lines.push("");
  lines.push("---");
  lines.push(`*Generated by ArxMint Grant Template Engine — ${new Date(app.generatedAt).toISOString()}*`);

  return lines.join("\n");
}

/** Export a grant application as JSON */
export function exportGrantJSON(app: GrantApplication): string {
  return JSON.stringify(app, null, 2);
}
