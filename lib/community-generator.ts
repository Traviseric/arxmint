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
import { PRIVACY_PRESETS, type PrivacyLevel } from "./privacy-defaults";

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
      --noseedbackup
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

  // Cashu mint (always included as fallback)
  services.push(`
  # === Cashu Mint ===
  cashu-mint:
    image: cashubtc/nutshell:latest
    container_name: sf-cashu-${config.id}
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

  // Fedimint (if federation backend)
  if (config.mintBackend === "fedimint") {
    for (let i = 0; i < config.guardianCount; i++) {
      const port = 18173 + i;
      const apiPort = 18174 + i * 2;
      services.push(`
  # === Fedimint Guardian ${i + 1} ===
  fedimintd-${i}:
    image: fedimint/fedimintd:v0.5.0
    container_name: sf-guardian-${i}-${config.id}
    restart: unless-stopped
    environment:
      - FM_BIND_P2P=0.0.0.0:${port}
      - FM_BIND_API=0.0.0.0:${apiPort}
      - FM_P2P_URL=fedimintd-${i}:${port}
      - FM_API_URL=ws://fedimintd-${i}:${apiPort}
      - FM_BITCOIN_RPC_KIND=none
    ports:
      - "${port}:${port}"
      - "${apiPort}:${apiPort}"
    volumes:
      - guardian-${i}-data:/data
    networks:
      - sovereign`);
      volumes.push(`  guardian-${i}-data:`);
    }
  }

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
