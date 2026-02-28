// ============================================================
// ArxMint — Community Generator
// Orchestrates community creation from natural language prompts
// Generates Docker Compose configs, invite flows, L402 endpoints
// ============================================================

import type {
  CommunityConfig,
  CommunityFeature,
  DeploymentConfig,
  L402Endpoint,
  MintBackend,
  ParsedPrompt,
} from "./types";
import { PRIVACY_PRESETS, type PrivacyLevel } from "./privacy-defaults.ts";

/** Parse a natural language prompt into structured community config */
export function parsePrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase();

  // Extract community name (look for quotes or "called X" or "named X")
  const nameMatch =
    prompt.match(/["']([^"']+)["']/) ||
    prompt.match(/(?:called|named)\s+([A-Z][^\s,.\-]+(?:\s+[A-Z][^\s,.\-]+)*)/);
  const communityName = nameMatch?.[1] || "ArxMint Community";

  // Extract member count
  const countMatch = lower.match(/(\d+)\s*(?:people|members|users|bitcoiners|folks)/);
  const memberCount = countMatch ? parseInt(countMatch[1], 10) : 20;

  // Detect features
  const features: CommunityFeature[] = [];
  if (/chat|messag|social|communicat/.test(lower)) features.push("chat");
  if (/merchant|business|shop|store|directory/.test(lower)) features.push("merchant-directory");
  if (/agent|ai|bot|automat|machine/.test(lower)) features.push("agent-marketplace");
  if (/cycle|signal|alert|market|price/.test(lower)) features.push("cycle-alerts");
  if (/privacy|private|anon|stealth/.test(lower)) features.push("privacy-dashboard");
  if (/l402|paywall|pay.per|premium|monetiz/.test(lower)) features.push("l402-paywalls");

  // Default features if none detected
  if (features.length === 0) {
    features.push("chat", "privacy-dashboard", "cycle-alerts");
  }

  // Detect mint backend
  let mintBackend: MintBackend = "cashu"; // default to lightweight
  if (/fedimint|federation|guardian|multi.sig/.test(lower)) mintBackend = "fedimint";
  if (memberCount > 50) mintBackend = "fedimint"; // larger communities benefit from federation

  // Detect agent support
  const agentsEnabled =
    features.includes("agent-marketplace") ||
    /agent|ai|bot|l402|mcp|lightning.agent/.test(lower);

  // Detect privacy level
  let privacyLevel: PrivacyLevel = "standard";
  if (/maximum|max|highest|full.privacy|paranoid/.test(lower)) privacyLevel = "maximum";
  else if (/high|strong|enhanced|extra/.test(lower)) privacyLevel = "high";
  else if (/private|privacy/.test(lower)) privacyLevel = "high";

  return {
    communityName,
    memberCount,
    features,
    mintBackend,
    agentsEnabled,
    privacyLevel,
    description: prompt,
  };
}

/** Generate a full community config from a parsed prompt */
export function generateCommunityConfig(
  parsed: ParsedPrompt,
  network: "bitcoin" | "testnet" | "signet" | "regtest" = "testnet"
): CommunityConfig {
  const id = `sf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    name: parsed.communityName,
    description: parsed.description,
    memberCount: parsed.memberCount,
    mintBackend: parsed.mintBackend,
    privacy: PRIVACY_PRESETS[parsed.privacyLevel],
    agents: {
      enabled: parsed.agentsEnabled,
      l402PriceSats: 100,
      macaroonScope: parsed.agentsEnabled ? "pay-only" : "read-only",
      mcpEnabled: parsed.agentsEnabled,
    },
    guardianCount: parsed.mintBackend === "fedimint"
      ? Math.min(Math.max(Math.ceil(parsed.memberCount / 10), 3), 7)
      : 1,
    mintFeePercent: 0.2,
    network,
    features: parsed.features,
  };
}

/** Generate Docker Compose YAML for a community */
export function generateDockerCompose(config: CommunityConfig): string {
  const services: string[] = [];
  const volumes: string[] = [];

  // Bitcoin node (neutrino light client via LND)
  services.push(`
  # === Bitcoin + Lightning ===
  lnd:
    image: lightninglabs/lnd:v0.18.0-beta
    container_name: sf-lnd-${config.id}
    restart: unless-stopped
    command: >
      lnd
      --bitcoin.active
      --bitcoin.${config.network === "bitcoin" ? "mainnet" : config.network}
      --bitcoin.node=neutrino
      --neutrino.addpeer=faucet.lightning.community
      --neutrino.addpeer=lnd.bitrefill.com
      --rpclisten=0.0.0.0:10009
      --restlisten=0.0.0.0:8080
      --tlsextradomain=lnd
      --accept-keysend
      --protocol.wumbo-channels
    ports:
      - "9735:9735"
      - "10009:10009"
      - "8080:8080"
    volumes:
      - lnd-data:/root/.lnd
    networks:
      - sovereign`);

  volumes.push("  lnd-data:");

  // Cashu mint — CDK for production, Nutshell for dev/small deployments
  const useCDK = config.memberCount > 30 || config.network === "bitcoin";

  if (useCDK) {
    services.push(`
  # === Cashu Mint (CDK — production cloud-native) ===
  cashu-mint:
    image: cashubtc/cdk-mintd:latest
    container_name: arx-cdk-mint-${config.id}
    restart: unless-stopped
    environment:
      - CDK_MINT_URL=http://0.0.0.0:3338
      - CDK_MINT_LISTEN_HOST=0.0.0.0
      - CDK_MINT_LISTEN_PORT=3338
      - CDK_LN_BACKEND=lnd
      - CDK_LND_ADDRESS=https://lnd:8080
      - CDK_LND_CERT_PATH=/root/.lnd/tls.cert
      - CDK_LND_MACAROON_PATH=/root/.lnd/data/chain/bitcoin/${config.network === "bitcoin" ? "mainnet" : config.network}/admin.macaroon
      - CDK_DATABASE_URL=postgres://\${CASHU_DB_USER:-cashu}:\${CASHU_DB_PASSWORD:-cashu}@cashu-db:5432/cashu
      - CDK_MINT_INFO_NAME=${config.name}
      - CDK_MINT_INFO_DESCRIPTION=ArxMint community mint
    ports:
      - "3338:3338"
    volumes:
      - lnd-data:/root/.lnd:ro
    depends_on:
      - lnd
      - cashu-db
    networks:
      - sovereign

  # === Cashu Mint Database (Postgres) ===
  cashu-db:
    image: postgres:16-alpine
    container_name: arx-cashu-db-${config.id}
    restart: unless-stopped
    environment:
      # SECURITY: Override CASHU_DB_USER and CASHU_DB_PASSWORD in production!
      - POSTGRES_USER=\${CASHU_DB_USER:-cashu}
      - POSTGRES_PASSWORD=\${CASHU_DB_PASSWORD:-cashu}
      - POSTGRES_DB=cashu
    volumes:
      - cashu-db-data:/var/lib/postgresql/data
    networks:
      - sovereign`);
    volumes.push("  cashu-db-data:");
  } else {
    services.push(`
  # === Cashu Mint (Nutshell — lightweight dev/small deployments) ===
  cashu-mint:
    image: cashubtc/nutshell:latest
    container_name: arx-cashu-${config.id}
    restart: unless-stopped
    environment:
      - MINT_BACKEND_BOLT11_SAT=LndRestWallet
      - MINT_LND_REST_ENDPOINT=https://lnd:8080
      - MINT_LND_REST_CERT=/root/.lnd/tls.cert
      - MINT_LND_REST_MACAROON=/root/.lnd/data/chain/bitcoin/${config.network === "bitcoin" ? "mainnet" : config.network}/admin.macaroon
      - MINT_LISTEN_HOST=0.0.0.0
      - MINT_LISTEN_PORT=3338
      - MINT_PRIVATE_KEY=\${CASHU_PRIVATE_KEY:-$(openssl rand -hex 32)}
    ports:
      - "3338:3338"
    volumes:
      - lnd-data:/root/.lnd:ro
      - cashu-data:/app/data
    depends_on:
      - lnd
    networks:
      - sovereign`);
    volumes.push("  cashu-data:");
  }

  // Ark server (if privacy config includes arkSpends)
  if (config.privacy.arkSpends) {
    services.push(`
  # === Ark Server (VTXO off-chain privacy layer) ===
  arkd:
    image: arkade/arkd:latest
    container_name: arx-arkd-${config.id}
    restart: unless-stopped
    environment:
      - ARK_NETWORK=${config.network}
      - ARK_ROUND_INTERVAL=10
      - ARK_ROUND_LIFETIME=604800
      - ARK_LOG_LEVEL=info
    ports:
      - "7070:7070"
    volumes:
      - arkd-data:/data
      - lnd-data:/root/.lnd:ro
    depends_on:
      - lnd
    networks:
      - sovereign`);
    volumes.push("  arkd-data:");
  }

  // Silent Payments indexer (if SP enabled)
  if (config.privacy.silentPayments) {
    services.push(`
  # === Silent Payments Indexer (BIP-352) ===
  sp-indexer:
    image: silentpayments/indexer:latest
    container_name: arx-sp-indexer-${config.id}
    restart: unless-stopped
    environment:
      - SP_NETWORK=${config.network}
      - SP_BITCOIN_RPC_HOST=lnd
      - SP_BITCOIN_RPC_PORT=8080
      - SP_INDEX_FROM_HEIGHT=0
      - SP_LOG_LEVEL=info
      - SP_API_HOST=0.0.0.0
      - SP_API_PORT=8100
    ports:
      - "8100:8100"
    volumes:
      - sp-indexer-data:/data
      - lnd-data:/root/.lnd:ro
    depends_on:
      - lnd
    networks:
      - sovereign`);
    volumes.push("  sp-indexer-data:");
  }

  // Fedimint (if federation backend) — v0.10.0 "Lighthouse"
  if (config.mintBackend === "fedimint") {
    for (let i = 0; i < config.guardianCount; i++) {
      const p2pPort = 18173 + i;
      const apiPort = 18174 + i * 2;
      services.push(`
  # === Fedimint Guardian ${i + 1} (v0.10.0 Lighthouse) ===
  fedimintd-${i}:
    image: fedimint/fedimintd:v0.10.0
    container_name: arx-guardian-${i}-${config.id}
    restart: unless-stopped
    environment:
      - FM_BIND_P2P=0.0.0.0:${p2pPort}
      - FM_BIND_API=0.0.0.0:${apiPort}
      - FM_P2P_URL=fedimintd-${i}:${p2pPort}
      - FM_API_URL=ws://fedimintd-${i}:${apiPort}
      - FM_BITCOIN_RPC_KIND=none
      # v0.10.0 ConnectorRegistry — Iroh networking
      - FM_TRANSPORT=iroh
      - FM_IROH_DISCOVERY=dns
    ports:
      - "${p2pPort}:${p2pPort}"
      - "${apiPort}:${apiPort}"
    volumes:
      - guardian-${i}-data:/data
    networks:
      - sovereign`);
      volumes.push(`  guardian-${i}-data:`);
    }
  }

  // Monitoring stack: Prometheus + Grafana (operator-grade observability)
  services.push(`
  # === Monitoring: Prometheus ===
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: arx-prometheus-${config.id}
    restart: unless-stopped
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
      - ./docker/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - sovereign

  # === Monitoring: Grafana ===
  grafana:
    image: grafana/grafana:11.0.0
    container_name: arx-grafana-${config.id}
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:?GRAFANA_PASSWORD is required}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - sovereign`);
  volumes.push("  prometheus-data:");
  volumes.push("  grafana-data:");

  // Aperture L402 proxy (if agents enabled)
  if (config.agents.enabled) {
    services.push(`
  # === L402 Reverse Proxy (Aperture) ===
  aperture:
    image: lightninglabs/aperture:latest
    container_name: sf-aperture-${config.id}
    restart: unless-stopped
    ports:
      - "8081:8081"
    volumes:
      - ./docker/aperture.yml:/config/aperture.yml:ro
      - lnd-data:/root/.lnd:ro
    command: ["--configfile=/config/aperture.yml"]
    depends_on:
      - lnd
    networks:
      - sovereign`);
  }

  return `# ArxMint — ${config.name}
# Generated ${new Date().toISOString()}
# Backend: ${config.mintBackend} | Network: ${config.network}
# Guardians: ${config.guardianCount} | Privacy: ${config.privacy.silentPayments ? "Silent Payments" : "Standard"}
# Agents: ${config.agents.enabled ? "Enabled (L402 + MCP)" : "Disabled"}

services:${services.join("")}

volumes:
${volumes.join("\n")}

networks:
  sovereign:
    driver: bridge
`;
}

/** Generate Aperture L402 config */
export function generateApertureConfig(config: CommunityConfig): string {
  return `# ArxMint Aperture Config — ${config.name}
# L402 reverse proxy for agent commerce

listenaddr: "0.0.0.0:8081"

authenticator:
  lndhost: "lnd:10009"
  tlspath: "/root/.lnd/tls.cert"
  macpath: "/root/.lnd/data/chain/bitcoin/${config.network === "bitcoin" ? "mainnet" : config.network}/admin.macaroon"

services:
  - name: "agent-api"
    hostregexp: ".*"
    pathregexp: "^/api/agent/.*$"
    protocol: "https"
    backendhost: "localhost:3000"
    price: ${config.agents.l402PriceSats}
    duration: 3600 # 1 hour token validity

  - name: "cycle-signals"
    hostregexp: ".*"
    pathregexp: "^/api/cycle/premium$"
    protocol: "https"
    backendhost: "localhost:3000"
    price: 50
    duration: 86400 # 24 hour token validity

  - name: "privacy-audit"
    hostregexp: ".*"
    pathregexp: "^/api/privacy/audit$"
    protocol: "https"
    backendhost: "localhost:3000"
    price: 200
    duration: 3600
`;
}

/** Generate Prometheus scrape config */
export function generatePrometheusConfig(config: CommunityConfig): string {
  const scrapeConfigs: string[] = [];

  // LND metrics
  scrapeConfigs.push(`  - job_name: "lnd"
    static_configs:
      - targets: ["lnd:8080"]
    metrics_path: /metrics`);

  // Cashu mint metrics (CDK exposes Prometheus endpoint)
  const useCDK = config.memberCount > 30 || config.network === "bitcoin";
  if (useCDK) {
    scrapeConfigs.push(`  - job_name: "cashu-mint"
    static_configs:
      - targets: ["cashu-mint:3338"]
    metrics_path: /metrics`);
  }

  // Fedimint guardian metrics
  if (config.mintBackend === "fedimint") {
    for (let i = 0; i < config.guardianCount; i++) {
      const apiPort = 18174 + i * 2;
      scrapeConfigs.push(`  - job_name: "fedimint-guardian-${i}"
    static_configs:
      - targets: ["fedimintd-${i}:${apiPort}"]
    metrics_path: /metrics`);
    }
  }

  // Ark server metrics
  if (config.privacy.arkSpends) {
    scrapeConfigs.push(`  - job_name: "arkd"
    static_configs:
      - targets: ["arkd:7070"]
    metrics_path: /metrics`);
  }

  // SP indexer metrics
  if (config.privacy.silentPayments) {
    scrapeConfigs.push(`  - job_name: "sp-indexer"
    static_configs:
      - targets: ["sp-indexer:8100"]
    metrics_path: /metrics`);
  }

  return `# ArxMint Prometheus Config — ${config.name}
# Auto-generated — do not edit manually

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
${scrapeConfigs.join("\n\n")}
`;
}

/** Generate L402 endpoint list from config */
export function generateL402Endpoints(config: CommunityConfig): L402Endpoint[] {
  const endpoints: L402Endpoint[] = [];

  if (config.agents.enabled) {
    endpoints.push({
      path: "/api/agent/query",
      description: "Query AI agent for data/analysis",
      priceSats: config.agents.l402PriceSats,
      agentOnly: false,
    });
    endpoints.push({
      path: "/api/agent/compute",
      description: "Run compute tasks via agent",
      priceSats: config.agents.l402PriceSats * 5,
      agentOnly: true,
    });
  }

  if (config.features.includes("cycle-alerts")) {
    endpoints.push({
      path: "/api/cycle/premium",
      description: "Premium cycle signals (MVRV, NUPL, advanced)",
      priceSats: 50,
      agentOnly: false,
    });
  }

  if (config.features.includes("privacy-dashboard")) {
    endpoints.push({
      path: "/api/privacy/audit",
      description: "Privacy audit of your transaction history",
      priceSats: 200,
      agentOnly: false,
    });
  }

  return endpoints;
}

/** Generate setup instructions */
export function generateInstructions(config: CommunityConfig): string[] {
  const steps: string[] = [
    `# ArxMint Setup — ${config.name}`,
    "",
    "## Prerequisites",
    "- Docker & Docker Compose installed",
    "- 2GB+ RAM available",
    `- Port availability: 9735, 10009, 8080, 3338${config.agents.enabled ? ", 8081" : ""}`,
    "",
    "## Quick Start",
    "",
    "1. Save the generated docker-compose.yml to your project root",
  ];

  if (config.agents.enabled) {
    steps.push("2. Save the aperture.yml to docker/aperture.yml");
    steps.push("3. Run: docker compose up -d");
    steps.push("4. Wait ~60s for LND to sync (neutrino light client)");
    steps.push("5. Fund your node (testnet faucet or mainnet deposit)");
  } else {
    steps.push("2. Run: docker compose up -d");
    steps.push("3. Wait ~60s for LND to sync");
    steps.push("4. Fund your node");
  }

  steps.push("");
  steps.push("## Connect Your Wallet");
  steps.push("");

  if (config.mintBackend === "cashu") {
    steps.push("### Cashu Mint");
    steps.push(`- Mint URL: http://localhost:3338`);
    steps.push("- Open ArxMint dashboard and enter this URL");
    steps.push("- Share the mint URL with community members");
  }

  if (config.mintBackend === "fedimint") {
    steps.push("### Fedimint Federation");
    steps.push(`- ${config.guardianCount} guardians will need to coordinate setup`);
    steps.push("- Each guardian runs their own fedimintd container");
    steps.push("- After DKG (distributed key generation), share the invite code");
    steps.push("- Members join via the invite code in ArxMint");
  }

  if (config.agents.enabled) {
    steps.push("");
    steps.push("## AI Agent Setup");
    steps.push("");
    steps.push("Install Lightning Agent Kit:");
    steps.push("```bash");
    steps.push("npx -y @lightninglabs/lightning-mcp-server");
    steps.push("```");
    steps.push("");
    steps.push("L402 endpoints available:");
    const endpoints = generateL402Endpoints(config);
    endpoints.forEach((ep) => {
      steps.push(`- ${ep.path} — ${ep.description} (${ep.priceSats} sats)`);
    });
  }

  steps.push("");
  steps.push("## Privacy Defaults");
  steps.push(`- Silent Payments: ${config.privacy.silentPayments ? "ON" : "OFF"}`);
  steps.push(`- CoinJoin: ${config.privacy.coinJoin ? "ON" : "OFF"}`);
  steps.push(`- PayJoin: ${config.privacy.payJoin ? "ON" : "OFF"}`);
  steps.push(`- Ark Spends: ${config.privacy.arkSpends ? "ON" : "OFF"}`);

  return steps;
}

/** Full deployment config generation (the main entry point) */
export function generateDeployment(
  prompt: string,
  network: "bitcoin" | "testnet" | "signet" | "regtest" = "testnet"
): DeploymentConfig {
  const parsed = parsePrompt(prompt);
  const community = generateCommunityConfig(parsed, network);
  const dockerCompose = generateDockerCompose(community);
  const instructions = generateInstructions(community);
  const l402Endpoints = generateL402Endpoints(community);

  return {
    community,
    dockerCompose,
    instructions,
    l402Endpoints,
  };
}

// ============================================================
// G-Bot Integration (Phase 1.7)
//
// Fedimint's G-Bot automates guardian coordination, peer
// discovery, and consensus setup. When available, it replaces
// raw Docker scripting for federation bootstrap.
//
// Source: Doc 1 — Fedimint official federation setup service
// ============================================================

/** G-Bot API status */
export interface GBotStatus {
  available: boolean;
  version?: string;
  endpoint?: string;
  message: string;
}

/** G-Bot federation setup request */
export interface GBotSetupRequest {
  /** Human-readable federation name */
  name: string;
  /** Number of guardians */
  guardianCount: number;
  /** Bitcoin network */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
  /** Guardian contact info (for coordination) */
  guardians: Array<{
    alias: string;
    /** How to reach this guardian (Nostr, email, etc.) */
    contact?: string;
  }>;
}

/** G-Bot federation setup response */
export interface GBotSetupResult {
  /** Whether G-Bot was used or we fell back to Docker */
  method: "gbot" | "docker";
  /** Federation ID (if setup completed) */
  federationId?: string;
  /** Invite code for members to join */
  inviteCode?: string;
  /** Setup instructions for guardians */
  guardianInstructions: string[];
  /** Docker compose (if Docker fallback) */
  dockerCompose?: string;
}

// ============================================================
// Guardian Governance Framework (Phase 3.1)
//
// Guardian selection criteria, rotation policy, incident response,
// quorum management, and treasury use policy.
//
// Source: Doc 7 — BCE governance patterns
// ============================================================

/** Guardian role within the federation */
export type GuardianRole = "lead" | "guardian" | "backup";

/** Guardian status */
export type GuardianStatus = "active" | "probation" | "rotated-out" | "emergency-removed";

/** Individual guardian profile */
export interface GuardianProfile {
  id: string;
  alias: string;
  role: GuardianRole;
  status: GuardianStatus;
  /** How to reach this guardian (Nostr npub, email, Signal, etc.) */
  contact: string;
  /** Date guardian was onboarded (ms) */
  onboardedAt: number;
  /** Last time guardian confirmed liveness (ms) */
  lastLivenessCheck: number;
  /** Uptime percentage (0-100) */
  uptimePercent: number;
  /** Whether this guardian holds a veto on treasury spends */
  treasuryVeto: boolean;
}

/** Guardian selection criteria — minimum requirements */
export interface GuardianSelectionCriteria {
  /** Minimum months of community involvement */
  minCommunityMonths: number;
  /** Must have verified identity (Nostr, PGP, etc.) */
  requireVerifiedIdentity: boolean;
  /** Must have technical ability to run a node */
  requireTechnicalCompetence: boolean;
  /** Must have a stake in the community (merchant, employer, etc.) */
  requireCommunityStake: boolean;
  /** Maximum number of other federations this guardian can serve */
  maxConcurrentFederations: number;
  /** Require geographic diversity (no two guardians in same city) */
  requireGeoDiversity: boolean;
}

/** Guardian rotation policy */
export interface RotationPolicy {
  /** Maximum term length in months before mandatory rotation */
  maxTermMonths: number;
  /** How many guardians can rotate in a single cycle */
  maxSimultaneousRotations: number;
  /** Cool-down period in months before a rotated guardian can re-serve */
  cooldownMonths: number;
  /** Whether re-election is allowed */
  allowReElection: boolean;
  /** Minimum overlap days between outgoing and incoming guardian */
  handoverDays: number;
}

/** Incident response procedures */
export interface IncidentResponsePolicy {
  /** Severity levels and response times */
  severityLevels: Array<{
    level: "critical" | "high" | "medium" | "low";
    description: string;
    /** Maximum response time in hours */
    responseTimeHours: number;
    /** Quorum needed to act */
    quorumRequired: number;
  }>;
  /** Communication channels for incidents (priority order) */
  communicationChannels: string[];
  /** Whether automatic alerts are enabled */
  autoAlertsEnabled: boolean;
  /** Guardian liveness check interval in hours */
  livenessCheckIntervalHours: number;
  /** Hours of missed liveness before escalation */
  escalationAfterHours: number;
}

/** Quorum management rules */
export interface QuorumPolicy {
  /** Total guardians in the federation */
  totalGuardians: number;
  /** Minimum guardians needed for consensus (e.g., 3 of 5) */
  consensusThreshold: number;
  /** Minimum for emergency actions (may be higher) */
  emergencyThreshold: number;
  /** Minimum for treasury spends */
  treasuryThreshold: number;
  /** Whether a single guardian can veto (only for critical actions) */
  singleVetoAllowed: boolean;
}

/** Treasury use policy */
export interface TreasuryPolicy {
  /** Maximum single spend without vote (sats) */
  maxUnilateralSpendSats: number;
  /** Spending categories that need full quorum */
  fullQuorumCategories: string[];
  /** Required documentation for each spend */
  requireSpendJustification: boolean;
  /** Transparency: publish spends to community */
  publishSpends: boolean;
  /** Reserve ratio: minimum % of treasury that must remain */
  minReservePercent: number;
}

/** Complete governance configuration for a federation */
export interface GovernanceConfig {
  /** Guardian profiles */
  guardians: GuardianProfile[];
  /** Selection criteria for new guardians */
  selectionCriteria: GuardianSelectionCriteria;
  /** Rotation policy */
  rotation: RotationPolicy;
  /** Incident response */
  incidentResponse: IncidentResponsePolicy;
  /** Quorum rules */
  quorum: QuorumPolicy;
  /** Treasury policy */
  treasury: TreasuryPolicy;
  /** When this governance config was adopted (ms) */
  adoptedAt: number;
  /** Version (increment on amendments) */
  version: number;
}

/**
 * Generate default governance config for a community.
 * Scales thresholds based on guardian count.
 */
export function generateGovernanceConfig(
  guardianCount: number,
  communityName: string
): GovernanceConfig {
  // Byzantine fault tolerance: need 2f+1 guardians for f faults
  const consensusThreshold = Math.ceil((guardianCount * 2) / 3);
  const emergencyThreshold = Math.min(guardianCount, consensusThreshold + 1);
  const treasuryThreshold = consensusThreshold;

  const guardians: GuardianProfile[] = Array.from(
    { length: guardianCount },
    (_, i) => ({
      id: `g_${i}_${Date.now().toString(36)}`,
      alias: `Guardian ${i + 1}`,
      role: i === 0 ? ("lead" as const) : ("guardian" as const),
      status: "active" as const,
      contact: "",
      onboardedAt: Date.now(),
      lastLivenessCheck: Date.now(),
      uptimePercent: 100,
      treasuryVeto: i === 0, // Lead guardian has veto
    })
  );

  return {
    guardians,
    selectionCriteria: {
      minCommunityMonths: 3,
      requireVerifiedIdentity: true,
      requireTechnicalCompetence: true,
      requireCommunityStake: true,
      maxConcurrentFederations: 3,
      requireGeoDiversity: guardianCount >= 5,
    },
    rotation: {
      maxTermMonths: 12,
      maxSimultaneousRotations: Math.max(1, Math.floor(guardianCount / 3)),
      cooldownMonths: 6,
      allowReElection: true,
      handoverDays: 14,
    },
    incidentResponse: {
      severityLevels: [
        {
          level: "critical",
          description: "Federation down, funds at risk, or guardian key compromise",
          responseTimeHours: 1,
          quorumRequired: emergencyThreshold,
        },
        {
          level: "high",
          description: "Service degraded, payment failures > 5%, guardian unreachable > 24h",
          responseTimeHours: 4,
          quorumRequired: consensusThreshold,
        },
        {
          level: "medium",
          description: "Non-critical service issue, elevated error rates",
          responseTimeHours: 24,
          quorumRequired: Math.ceil(guardianCount / 2),
        },
        {
          level: "low",
          description: "Minor issue, cosmetic, documentation update needed",
          responseTimeHours: 72,
          quorumRequired: 1,
        },
      ],
      communicationChannels: [
        "Signal group (primary)",
        "Nostr DM (backup)",
        "Email (non-urgent)",
      ],
      autoAlertsEnabled: true,
      livenessCheckIntervalHours: 6,
      escalationAfterHours: 24,
    },
    quorum: {
      totalGuardians: guardianCount,
      consensusThreshold,
      emergencyThreshold,
      treasuryThreshold,
      singleVetoAllowed: guardianCount <= 5,
    },
    treasury: {
      maxUnilateralSpendSats: 50_000,
      fullQuorumCategories: [
        "infrastructure",
        "compensation",
        "external-services",
        "grants",
      ],
      requireSpendJustification: true,
      publishSpends: true,
      minReservePercent: 20,
    },
    adoptedAt: Date.now(),
    version: 1,
  };
}

/**
 * Generate a human-readable governance document.
 * Useful for community transparency and grant applications.
 */
export function generateGovernanceDocument(
  config: GovernanceConfig,
  communityName: string
): string {
  const lines: string[] = [
    `# ${communityName} — Federation Governance Policy`,
    `Version ${config.version} — Adopted ${new Date(config.adoptedAt).toISOString().split("T")[0]}`,
    "",
    "## Guardian Council",
    "",
    `| # | Alias | Role | Status |`,
    `|---|---|---|---|`,
  ];

  config.guardians.forEach((g, i) => {
    lines.push(`| ${i + 1} | ${g.alias} | ${g.role} | ${g.status} |`);
  });

  lines.push("");
  lines.push("## Quorum Rules");
  lines.push(`- Total guardians: ${config.quorum.totalGuardians}`);
  lines.push(`- Consensus threshold: ${config.quorum.consensusThreshold} of ${config.quorum.totalGuardians}`);
  lines.push(`- Emergency threshold: ${config.quorum.emergencyThreshold} of ${config.quorum.totalGuardians}`);
  lines.push(`- Treasury threshold: ${config.quorum.treasuryThreshold} of ${config.quorum.totalGuardians}`);

  lines.push("");
  lines.push("## Guardian Selection Criteria");
  lines.push(`- Minimum community involvement: ${config.selectionCriteria.minCommunityMonths} months`);
  lines.push(`- Verified identity required: ${config.selectionCriteria.requireVerifiedIdentity ? "Yes" : "No"}`);
  lines.push(`- Technical competence required: ${config.selectionCriteria.requireTechnicalCompetence ? "Yes" : "No"}`);
  lines.push(`- Geographic diversity: ${config.selectionCriteria.requireGeoDiversity ? "Required" : "Preferred"}`);

  lines.push("");
  lines.push("## Rotation Policy");
  lines.push(`- Maximum term: ${config.rotation.maxTermMonths} months`);
  lines.push(`- Cooldown before re-election: ${config.rotation.cooldownMonths} months`);
  lines.push(`- Handover period: ${config.rotation.handoverDays} days`);

  lines.push("");
  lines.push("## Incident Response");
  for (const level of config.incidentResponse.severityLevels) {
    lines.push(`- **${level.level.toUpperCase()}**: ${level.description} — respond within ${level.responseTimeHours}h, quorum ${level.quorumRequired}`);
  }

  lines.push("");
  lines.push("## Treasury Policy");
  lines.push(`- Max unilateral spend: ${config.treasury.maxUnilateralSpendSats.toLocaleString()} sats`);
  lines.push(`- Minimum reserve: ${config.treasury.minReservePercent}%`);
  lines.push(`- Spend justification required: ${config.treasury.requireSpendJustification ? "Yes" : "No"}`);
  lines.push(`- Spends published to community: ${config.treasury.publishSpends ? "Yes" : "No"}`);

  return lines.join("\n");
}

/** Check if a guardian needs rotation based on policy */
export function checkGuardianRotation(
  guardian: GuardianProfile,
  policy: RotationPolicy
): { needsRotation: boolean; reason?: string } {
  const termMs = policy.maxTermMonths * 30 * 24 * 60 * 60 * 1000;
  const timeSinceOnboard = Date.now() - guardian.onboardedAt;

  if (timeSinceOnboard > termMs) {
    return {
      needsRotation: true,
      reason: `Term limit exceeded (${policy.maxTermMonths} months)`,
    };
  }

  if (guardian.uptimePercent < 90) {
    return {
      needsRotation: true,
      reason: `Uptime below 90% (currently ${guardian.uptimePercent}%)`,
    };
  }

  const livenessGap = Date.now() - guardian.lastLivenessCheck;
  const maxLivenessGap = 72 * 60 * 60 * 1000; // 72 hours
  if (livenessGap > maxLivenessGap) {
    return {
      needsRotation: true,
      reason: `No liveness check in ${Math.floor(livenessGap / (60 * 60 * 1000))} hours`,
    };
  }

  return { needsRotation: false };
}

/** Default G-Bot API endpoint (Fedimint official) */
const GBOT_DEFAULT_ENDPOINT = "https://gbot.fedimint.org/api/v1";

/**
 * Check if G-Bot API is available.
 * G-Bot is Fedimint's guided federation setup service.
 * It may not have a public API yet — this checks and falls back gracefully.
 */
export async function checkGBotAvailability(
  endpoint: string = GBOT_DEFAULT_ENDPOINT
): Promise<GBotStatus> {
  // Short-circuit if G-Bot is explicitly disabled (default)
  if (process.env.GBOT_ENABLED !== 'true') {
    return {
      available: false,
      message: "G-Bot disabled via GBOT_ENABLED env var — using Docker Compose",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${endpoint}/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        version: data.version,
        endpoint,
        message: `G-Bot v${data.version} available`,
      };
    }

    return {
      available: false,
      message: `G-Bot returned ${response.status} — falling back to Docker`,
    };
  } catch {
    return {
      available: false,
      message: "G-Bot not reachable — using Docker Compose for federation setup",
    };
  }
}

/**
 * Set up a federation, preferring G-Bot when available.
 * Falls back to Docker Compose generation if G-Bot is unavailable.
 */
export async function setupFederation(
  config: CommunityConfig,
  gbotEndpoint?: string
): Promise<GBotSetupResult> {
  // Only attempt G-Bot for Fedimint backend
  if (config.mintBackend !== "fedimint") {
    return {
      method: "docker",
      guardianInstructions: [
        "Cashu backend does not require federation setup.",
        "Run `docker compose up -d` to start the Cashu mint.",
      ],
      dockerCompose: generateDockerCompose(config),
    };
  }

  // Check G-Bot availability
  const gbotStatus = await checkGBotAvailability(gbotEndpoint);

  if (gbotStatus.available && gbotStatus.endpoint) {
    try {
      return await setupViaGBot(config, gbotStatus.endpoint);
    } catch (e: unknown) {
      console.warn(
        "[ArxMint] G-Bot setup failed, falling back to Docker:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // Fallback: Docker Compose
  return {
    method: "docker",
    guardianInstructions: generateInstructions(config),
    dockerCompose: generateDockerCompose(config),
  };
}

/**
 * Attempt federation setup via G-Bot API.
 * This is the preferred path when G-Bot is available.
 */
async function setupViaGBot(
  config: CommunityConfig,
  endpoint: string
): Promise<GBotSetupResult> {
  const request: GBotSetupRequest = {
    name: config.name,
    guardianCount: config.guardianCount,
    network: config.network,
    guardians: Array.from({ length: config.guardianCount }, (_, i) => ({
      alias: `Guardian ${i + 1}`,
    })),
  };

  const response = await fetch(`${endpoint}/federation/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`G-Bot API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    method: "gbot",
    federationId: data.federation_id,
    inviteCode: data.invite_code,
    guardianInstructions: [
      `Federation "${config.name}" created via G-Bot.`,
      `Federation ID: ${data.federation_id}`,
      `Invite code: ${data.invite_code}`,
      "",
      "Share the invite code with community members.",
      "Guardians should each confirm their node is running via G-Bot dashboard.",
      "",
      `G-Bot dashboard: ${endpoint.replace("/api/v1", "")}/federation/${data.federation_id}`,
    ],
  };
}
