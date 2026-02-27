"use client";

// ============================================================
// ArxMint — Pilot Deployment Configuration
// Production deployment config for Longmont Bitcoin meetup
// and other pilot communities.
//
// Source: Doc 7 (Spec §8) — pilot KPIs, BCE patterns
// ============================================================

import type { CommunityConfig } from "./types";
import type { BCEMetrics } from "./bce-metrics";
import type { GovernanceConfig } from "./community-generator";

// ---- KPI Targets ----

/** KPI targets for a pilot deployment */
export interface PilotKPITargets {
  /** Merchants onboarded target by milestone date */
  merchantsTarget: number;
  /** Monthly active spenders target */
  mauTarget: number;
  /** Payment success rate target (0-1) */
  successRateTarget: number;
  /** Federation/mint uptime target (0-1) */
  uptimeTarget: number;
  /** Spend events per user per month target */
  spendVelocityTarget: number;
  /** Target months to reach KPIs */
  targetMonths: number;
}

/** Default Longmont pilot KPIs from Doc 7 */
export const LONGMONT_KPI_TARGETS: PilotKPITargets = {
  merchantsTarget: 30,
  mauTarget: 300,
  successRateTarget: 0.98,
  uptimeTarget: 0.995,
  spendVelocityTarget: 2,
  targetMonths: 6,
};

// ---- Pilot Timeline ----

/** Pilot phase */
export type PilotPhase =
  | "pre-launch"
  | "soft-launch"
  | "merchant-push"
  | "growth"
  | "steady-state"
  | "evaluation";

/** Timeline milestone */
export interface PilotMilestone {
  phase: PilotPhase;
  label: string;
  monthStart: number;
  monthEnd: number;
  targets: string[];
  deliverables: string[];
}

/** Generate a pilot timeline for a given target duration */
export function generatePilotTimeline(
  targetMonths: number = 6
): PilotMilestone[] {
  return [
    {
      phase: "pre-launch",
      label: "Pre-Launch",
      monthStart: -1,
      monthEnd: 0,
      targets: [
        "Deploy Docker stack to production server",
        "Complete guardian DKG (if Fedimint)",
        "Recruit 3-5 founding merchants",
        "Set up monitoring (Prometheus + Grafana)",
        "Fund Lightning channels (min 1M sats inbound)",
      ],
      deliverables: [
        "Production docker-compose.yml deployed",
        "Grafana dashboards configured",
        "Guardian governance doc signed",
        "Founding merchant list confirmed",
      ],
    },
    {
      phase: "soft-launch",
      label: "Soft Launch",
      monthStart: 1,
      monthEnd: 1,
      targets: [
        "5 merchants live and accepting payments",
        "20 users with ecash wallets",
        "Host first meetup demo event",
        "98% payment success rate achieved",
      ],
      deliverables: [
        "First grant progress report",
        "User feedback collected",
        "Bug triage and fix cycle",
      ],
    },
    {
      phase: "merchant-push",
      label: "Merchant Onboarding Push",
      monthStart: 2,
      monthEnd: 3,
      targets: [
        "15 merchants onboarded",
        "100 MAU",
        "Numo NFC cards deployed to 5+ merchants",
        "First cross-merchant circular spend tracked",
      ],
      deliverables: [
        "Merchant onboarding kit published",
        "POS setup guide (QR + NFC)",
        "Monthly metrics report",
      ],
    },
    {
      phase: "growth",
      label: "Growth Phase",
      monthStart: 4,
      monthEnd: 5,
      targets: [
        "25 merchants onboarded",
        "200 MAU",
        "2+ spend events/user/month",
        "Community-run events driving adoption",
      ],
      deliverables: [
        "BCE maturity tier: Emerging or Growing",
        "Quarterly grant report",
        "Community governance review",
      ],
    },
    {
      phase: "steady-state",
      label: "Target Achievement",
      monthStart: targetMonths,
      monthEnd: targetMonths,
      targets: [
        `${LONGMONT_KPI_TARGETS.merchantsTarget} merchants onboarded`,
        `${LONGMONT_KPI_TARGETS.mauTarget} monthly active spenders`,
        `${(LONGMONT_KPI_TARGETS.successRateTarget * 100).toFixed(0)}%+ payment success rate`,
        `${(LONGMONT_KPI_TARGETS.uptimeTarget * 100).toFixed(1)}% federation uptime`,
      ],
      deliverables: [
        "Full KPI achievement report",
        "Replication playbook draft",
        "Grant final report",
      ],
    },
    {
      phase: "evaluation",
      label: "Evaluation & Scale",
      monthStart: targetMonths + 1,
      monthEnd: targetMonths + 3,
      targets: [
        "Evaluate pilot outcomes vs targets",
        "Identify replication opportunities",
        "Plan multi-city expansion",
        "Apply for follow-on grants",
      ],
      deliverables: [
        "Pilot evaluation report",
        "Replication playbook finalized",
        "Multi-city expansion plan",
      ],
    },
  ];
}

// ---- Pre-Launch Checklist ----

/** Checklist item */
export interface ChecklistItem {
  id: string;
  category: "infrastructure" | "security" | "commerce" | "governance" | "monitoring" | "community";
  label: string;
  description: string;
  required: boolean;
  completed: boolean;
}

/** Generate a pre-launch checklist for a pilot deployment */
export function generatePreLaunchChecklist(
  config: CommunityConfig
): ChecklistItem[] {
  const items: ChecklistItem[] = [
    // Infrastructure
    {
      id: "infra-docker",
      category: "infrastructure",
      label: "Docker stack deployed",
      description: "All services running: LND, mint, Aperture, Prometheus, Grafana",
      required: true,
      completed: false,
    },
    {
      id: "infra-lnd-sync",
      category: "infrastructure",
      label: "LND synced to chain",
      description: "Neutrino light client fully synced",
      required: true,
      completed: false,
    },
    {
      id: "infra-channels",
      category: "infrastructure",
      label: "Lightning channels funded",
      description: "Minimum 1M sats inbound liquidity, 3+ channels",
      required: true,
      completed: false,
    },
    {
      id: "infra-dns",
      category: "infrastructure",
      label: "DNS and TLS configured",
      description: "Public domain with SSL certificate for HTTPS",
      required: true,
      completed: false,
    },
    {
      id: "infra-backup",
      category: "infrastructure",
      label: "Backup strategy in place",
      description: "Automated backups for LND, mint DB, federation state",
      required: true,
      completed: false,
    },

    // Security
    {
      id: "sec-tiers",
      category: "security",
      label: "Agent security tiers configured",
      description: "Agents default to watch-only, no admin macaroons issued",
      required: true,
      completed: false,
    },
    {
      id: "sec-remote-signer",
      category: "security",
      label: "Remote signer deployed (if pay-only agents)",
      description: "litd remote signer running, keys isolated from agent processes",
      required: config.agents.enabled,
      completed: false,
    },
    {
      id: "sec-keyset-validation",
      category: "security",
      label: "Cashu keyset validation active",
      description: "NUT-13 keyset ID validation prevents collision attacks",
      required: config.mintBackend === "cashu",
      completed: false,
    },

    // Commerce
    {
      id: "commerce-merchants",
      category: "commerce",
      label: "Founding merchants recruited (3-5)",
      description: "Initial merchants ready to accept Bitcoin payments",
      required: true,
      completed: false,
    },
    {
      id: "commerce-pos",
      category: "commerce",
      label: "POS setup for merchants",
      description: "QR codes and/or Numo NFC cards provisioned",
      required: true,
      completed: false,
    },
    {
      id: "commerce-test-payments",
      category: "commerce",
      label: "End-to-end payment test",
      description: "Successfully complete test payments across all enabled paths",
      required: true,
      completed: false,
    },

    // Governance
    {
      id: "gov-guardians",
      category: "governance",
      label: "Guardian council formed",
      description: `${config.guardianCount} guardians confirmed and onboarded`,
      required: config.mintBackend === "fedimint",
      completed: false,
    },
    {
      id: "gov-policy",
      category: "governance",
      label: "Governance policy adopted",
      description: "Quorum rules, rotation policy, incident response documented",
      required: config.mintBackend === "fedimint",
      completed: false,
    },

    // Monitoring
    {
      id: "mon-prometheus",
      category: "monitoring",
      label: "Prometheus scraping all services",
      description: "Metrics flowing from LND, mint, federation guardians",
      required: true,
      completed: false,
    },
    {
      id: "mon-grafana",
      category: "monitoring",
      label: "Grafana dashboards configured",
      description: "Federation uptime, mint balance, LN channel health, payment success",
      required: true,
      completed: false,
    },
    {
      id: "mon-alerts",
      category: "monitoring",
      label: "Alert rules configured",
      description: "Alerts for downtime, low liquidity, payment failure spikes",
      required: true,
      completed: false,
    },

    // Community
    {
      id: "comm-launch-event",
      category: "community",
      label: "Launch event planned",
      description: "First meetup or event to demo the system and onboard users",
      required: false,
      completed: false,
    },
    {
      id: "comm-support-channel",
      category: "community",
      label: "Support channel set up",
      description: "Telegram, Signal, or Nostr group for user support",
      required: true,
      completed: false,
    },
  ];

  return items;
}

// ---- KPI Evaluation ----

/** KPI evaluation result */
export interface KPIEvaluation {
  kpi: string;
  target: number;
  actual: number;
  unit: string;
  met: boolean;
  percentOfTarget: number;
}

/** Evaluate current metrics against pilot KPI targets */
export function evaluatePilotKPIs(
  metrics: BCEMetrics,
  targets: PilotKPITargets = LONGMONT_KPI_TARGETS
): {
  evaluations: KPIEvaluation[];
  overallScore: number;
  allMet: boolean;
} {
  const evaluations: KPIEvaluation[] = [
    {
      kpi: "Merchants Onboarded",
      target: targets.merchantsTarget,
      actual: metrics.merchantCount,
      unit: "merchants",
      met: metrics.merchantCount >= targets.merchantsTarget,
      percentOfTarget: Math.round((metrics.merchantCount / targets.merchantsTarget) * 100),
    },
    {
      kpi: "Monthly Active Spenders",
      target: targets.mauTarget,
      actual: metrics.mau,
      unit: "users",
      met: metrics.mau >= targets.mauTarget,
      percentOfTarget: Math.round((metrics.mau / targets.mauTarget) * 100),
    },
    {
      kpi: "Payment Success Rate",
      target: targets.successRateTarget * 100,
      actual: Math.round(metrics.paymentSuccessRate * 100 * 10) / 10,
      unit: "%",
      met: metrics.paymentSuccessRate >= targets.successRateTarget,
      percentOfTarget: Math.round((metrics.paymentSuccessRate / targets.successRateTarget) * 100),
    },
    {
      kpi: "Federation Uptime",
      target: targets.uptimeTarget * 100,
      actual: Math.round(metrics.uptime * 100 * 10) / 10,
      unit: "%",
      met: metrics.uptime >= targets.uptimeTarget,
      percentOfTarget: Math.round((metrics.uptime / targets.uptimeTarget) * 100),
    },
    {
      kpi: "Spend Velocity",
      target: targets.spendVelocityTarget,
      actual: metrics.spendVelocity,
      unit: "tx/user/month",
      met: metrics.spendVelocity >= targets.spendVelocityTarget,
      percentOfTarget: Math.round((metrics.spendVelocity / targets.spendVelocityTarget) * 100),
    },
  ];

  const overallScore = Math.round(
    evaluations.reduce((sum, e) => sum + Math.min(e.percentOfTarget, 100), 0) /
      evaluations.length
  );

  return {
    evaluations,
    overallScore,
    allMet: evaluations.every((e) => e.met),
  };
}

// ---- Pilot Deployment Config ----

/** Full pilot deployment configuration */
export interface PilotDeployment {
  /** Community config */
  community: CommunityConfig;
  /** KPI targets */
  kpiTargets: PilotKPITargets;
  /** Timeline */
  timeline: PilotMilestone[];
  /** Pre-launch checklist */
  checklist: ChecklistItem[];
  /** Deployment location */
  location: string;
  /** Start date */
  startDate: string;
  /** Governance config */
  governance?: GovernanceConfig;
}

/** Generate a complete pilot deployment config for Longmont */
export function generateLongmontPilot(
  community: CommunityConfig
): PilotDeployment {
  return {
    community,
    kpiTargets: LONGMONT_KPI_TARGETS,
    timeline: generatePilotTimeline(6),
    checklist: generatePreLaunchChecklist(community),
    location: "Longmont, CO",
    startDate: new Date().toISOString().split("T")[0],
  };
}

/** Generate a pilot deployment config for any community */
export function generatePilotDeployment(
  community: CommunityConfig,
  location: string,
  customTargets?: Partial<PilotKPITargets>
): PilotDeployment {
  const targets: PilotKPITargets = {
    ...LONGMONT_KPI_TARGETS,
    ...customTargets,
  };

  return {
    community,
    kpiTargets: targets,
    timeline: generatePilotTimeline(targets.targetMonths),
    checklist: generatePreLaunchChecklist(community),
    location,
    startDate: new Date().toISOString().split("T")[0],
  };
}

// ============================================================
// Multi-City Federation Support (Phase 4.5)
//
// Extend from single pilot to multi-city inter-federation
// commerce. Cities are connected via Coco multi-mint for
// cross-city ecash transfers over Lightning.
//
// Source: Doc 7 — pilot-to-scale timeline
// ============================================================

/** City node in the multi-city network */
export interface CityNode {
  /** City identifier */
  id: string;
  /** City name */
  name: string;
  /** Location (city, state/country) */
  location: string;
  /** Pilot deployment config */
  pilot: PilotDeployment;
  /** City mint URL (Cashu) or federation invite code (Fedimint) */
  mintEndpoint: string;
  /** BCE maturity tier */
  maturityTier: string;
  /** Whether this city is the hub (original pilot) */
  isHub: boolean;
  /** Cities this node can route payments to via Lightning */
  connectedCities: string[];
  /** Date joined the multi-city network */
  joinedAt: string;
}

/** Multi-city network configuration */
export interface MultiCityNetwork {
  /** Network name */
  name: string;
  /** Hub city (original pilot) */
  hubCityId: string;
  /** All city nodes */
  cities: CityNode[];
  /** Network-wide KPI aggregates */
  aggregateKPIs: AggregateKPIs;
  /** Network creation date */
  createdAt: string;
  /** Network version */
  version: number;
}

/** Aggregate KPIs across all cities */
export interface AggregateKPIs {
  totalMerchants: number;
  totalMAU: number;
  totalCities: number;
  avgPaymentSuccessRate: number;
  avgUptime: number;
  crossCityTransactions: number;
}

/** Cross-city payment route */
export interface CrossCityRoute {
  sourceCityId: string;
  destCityId: string;
  /** Route via Lightning (mint in source city melts → mint in dest city mints) */
  routeType: "lightning-bridge";
  /** Estimated fee in sats */
  estimatedFeeSats: number;
  /** Whether route is currently available */
  available: boolean;
}

/**
 * Create a multi-city network from a hub pilot deployment.
 */
export function createMultiCityNetwork(
  name: string,
  hubPilot: PilotDeployment,
  hubMintEndpoint: string
): MultiCityNetwork {
  const hubCity: CityNode = {
    id: `city_${Date.now().toString(36)}_hub`,
    name: hubPilot.community.name,
    location: hubPilot.location,
    pilot: hubPilot,
    mintEndpoint: hubMintEndpoint,
    maturityTier: "nascent",
    isHub: true,
    connectedCities: [],
    joinedAt: new Date().toISOString().split("T")[0],
  };

  return {
    name,
    hubCityId: hubCity.id,
    cities: [hubCity],
    aggregateKPIs: {
      totalMerchants: 0,
      totalMAU: 0,
      totalCities: 1,
      avgPaymentSuccessRate: 0,
      avgUptime: 0,
      crossCityTransactions: 0,
    },
    createdAt: new Date().toISOString().split("T")[0],
    version: 1,
  };
}

/**
 * Add a city to an existing multi-city network.
 */
export function addCityToNetwork(
  network: MultiCityNetwork,
  cityName: string,
  location: string,
  community: CommunityConfig,
  mintEndpoint: string,
  customTargets?: Partial<PilotKPITargets>
): MultiCityNetwork {
  const pilot = generatePilotDeployment(community, location, customTargets);

  const newCity: CityNode = {
    id: `city_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: cityName,
    location,
    pilot,
    mintEndpoint,
    maturityTier: "nascent",
    isHub: false,
    connectedCities: [network.hubCityId],
    joinedAt: new Date().toISOString().split("T")[0],
  };

  // Connect hub to new city
  const updatedCities = network.cities.map((c) =>
    c.id === network.hubCityId
      ? { ...c, connectedCities: [...c.connectedCities, newCity.id] }
      : c
  );

  return {
    ...network,
    cities: [...updatedCities, newCity],
    aggregateKPIs: {
      ...network.aggregateKPIs,
      totalCities: updatedCities.length + 1,
    },
    version: network.version + 1,
  };
}

/**
 * Compute aggregate KPIs across all cities.
 */
export function computeNetworkKPIs(
  network: MultiCityNetwork,
  cityMetrics: Map<string, BCEMetrics>
): AggregateKPIs {
  let totalMerchants = 0;
  let totalMAU = 0;
  let successRateSum = 0;
  let uptimeSum = 0;
  let metricsCount = 0;

  for (const city of network.cities) {
    const metrics = cityMetrics.get(city.id);
    if (metrics) {
      totalMerchants += metrics.merchantCount;
      totalMAU += metrics.mau;
      successRateSum += metrics.paymentSuccessRate;
      uptimeSum += metrics.uptime;
      metricsCount++;
    }
  }

  return {
    totalMerchants,
    totalMAU,
    totalCities: network.cities.length,
    avgPaymentSuccessRate: metricsCount > 0
      ? Math.round((successRateSum / metricsCount) * 1000) / 1000
      : 0,
    avgUptime: metricsCount > 0
      ? Math.round((uptimeSum / metricsCount) * 1000) / 1000
      : 0,
    crossCityTransactions: 0, // tracked separately
  };
}

/**
 * Get available cross-city payment routes.
 * Routes go through Lightning: source mint melts ecash → Lightning → dest mint mints ecash.
 */
export function getCrossCityRoutes(network: MultiCityNetwork): CrossCityRoute[] {
  const routes: CrossCityRoute[] = [];

  for (const city of network.cities) {
    for (const connectedId of city.connectedCities) {
      routes.push({
        sourceCityId: city.id,
        destCityId: connectedId,
        routeType: "lightning-bridge",
        estimatedFeeSats: 10, // typical LN routing fee
        available: true,
      });
      // Bidirectional
      routes.push({
        sourceCityId: connectedId,
        destCityId: city.id,
        routeType: "lightning-bridge",
        estimatedFeeSats: 10,
        available: true,
      });
    }
  }

  // Deduplicate (since connections are added from both sides)
  const seen = new Set<string>();
  return routes.filter((r) => {
    const key = `${r.sourceCityId}->${r.destCityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate a multi-city expansion plan.
 */
export function generateExpansionPlan(
  network: MultiCityNetwork,
  targetCities: Array<{ name: string; location: string; estimatedMembers: number }>
): string {
  const lines: string[] = [
    `# ${network.name} — Multi-City Expansion Plan`,
    "",
    `**Current network:** ${network.cities.length} cities`,
    `**Hub:** ${network.cities.find((c) => c.isHub)?.location || "Unknown"}`,
    `**Generated:** ${new Date().toISOString().split("T")[0]}`,
    "",
    "## Current Network",
    "",
    "| City | Location | Maturity | Hub |",
    "|------|----------|----------|-----|",
  ];

  network.cities.forEach((c) => {
    lines.push(`| ${c.name} | ${c.location} | ${c.maturityTier} | ${c.isHub ? "Yes" : "No"} |`);
  });

  lines.push("");
  lines.push("## Expansion Targets");
  lines.push("");
  lines.push("| City | Location | Est. Members | Backend |");
  lines.push("|------|----------|-------------|---------|");

  targetCities.forEach((t) => {
    const backend = t.estimatedMembers > 50 ? "Fedimint" : "Cashu";
    lines.push(`| ${t.name} | ${t.location} | ${t.estimatedMembers} | ${backend} |`);
  });

  lines.push("");
  lines.push("## Expansion Timeline");
  lines.push("");
  lines.push("1. **Month 1-2:** Identify community champions in target cities");
  lines.push("2. **Month 2-3:** Deploy ArxMint stacks using replication playbook");
  lines.push("3. **Month 3-4:** Connect cities via multi-mint Lightning bridge");
  lines.push("4. **Month 4-6:** Grow merchant networks and cross-city commerce");
  lines.push("5. **Month 6+:** Evaluate and expand to additional cities");
  lines.push("");
  lines.push("## Cross-City Commerce");
  lines.push("");
  lines.push("Inter-city payments route through Lightning:");
  lines.push("1. User in City A melts ecash to Lightning invoice");
  lines.push("2. Lightning payment routes to City B's mint");
  lines.push("3. City B's mint issues ecash to the recipient");
  lines.push("4. Typical latency: <3 seconds, fee: ~10 sats");

  return lines.join("\n");
}
