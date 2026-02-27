// ============================================================
// ArxMint — Core Types
// ============================================================

/** Backend type for the community's ecash mint */
export type MintBackend = "fedimint" | "cashu";

/** Privacy layer configuration */
export interface PrivacyConfig {
  silentPayments: boolean;
  coinJoin: boolean;
  payJoin: boolean;
  arkSpends: boolean;
}

/** Lightning agent configuration */
export interface AgentConfig {
  enabled: boolean;
  /** LNC pairing phrase for the community's Lightning node */
  lncPairingPhrase?: string;
  /** L402 paywall pricing in sats */
  l402PriceSats: number;
  /** Macaroon permissions scope */
  macaroonScope: "read-only" | "pay-only" | "invoice-only" | "full";
  /** MCP server enabled */
  mcpEnabled: boolean;
}

/** Cycle signal types */
export type CycleSignal = "strong-buy" | "buy" | "neutral" | "sell" | "strong-sell";

/** Cycle metric snapshot */
export interface CycleMetrics {
  mvrv: number;
  nupl: number;
  supplyInProfit: number;
  price: number;
  signal: CycleSignal;
  timestamp: number;
}

/** Community configuration — generated from user prompt */
export interface CommunityConfig {
  id: string;
  name: string;
  description: string;
  /** Expected member count */
  memberCount: number;
  /** Mint backend preference */
  mintBackend: MintBackend;
  /** Privacy settings */
  privacy: PrivacyConfig;
  /** Agent settings */
  agents: AgentConfig;
  /** Number of federation guardians (Fedimint only) */
  guardianCount: number;
  /** Mint fee percentage (e.g., 0.2 for 0.2%) */
  mintFeePercent: number;
  /** Bitcoin network */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
  /** Features enabled */
  features: CommunityFeature[];
}

export type CommunityFeature =
  | "chat"
  | "merchant-directory"
  | "agent-marketplace"
  | "cycle-alerts"
  | "privacy-dashboard"
  | "l402-paywalls";

/** Generated deployment configuration */
export interface DeploymentConfig {
  community: CommunityConfig;
  /** Generated Docker Compose YAML */
  dockerCompose: string;
  /** Federation/mint invite code (available after deploy) */
  inviteCode?: string;
  /** Setup instructions */
  instructions: string[];
  /** L402 endpoint URLs */
  l402Endpoints: L402Endpoint[];
}

/** L402-gated endpoint */
export interface L402Endpoint {
  path: string;
  description: string;
  priceSats: number;
  /** Whether this endpoint is for agent use */
  agentOnly: boolean;
}

/** Wallet balance across all backends */
export interface WalletBalance {
  /** Fedimint ecash balance in msats */
  fedimintMsats: number;
  /** Cashu ecash balance in sats */
  cashuSats: number;
  /** Lightning channel balance in sats */
  lightningSats: number;
  /** On-chain balance in sats */
  onchainSats: number;
  /** Total in sats */
  totalSats: number;
}

/** Community member */
export interface CommunityMember {
  id: string;
  alias: string;
  isAgent: boolean;
  joinedAt: number;
}

/** Agent service listing in the marketplace */
export interface AgentService {
  id: string;
  name: string;
  description: string;
  /** Price per request in sats */
  priceSats: number;
  /** L402 endpoint */
  endpoint: string;
  /** Agent that provides this service */
  agentId: string;
  category: "data" | "compute" | "storage" | "privacy" | "analytics" | "other";
}

/**
 * Lightning agent security tier.
 * Agents should NEVER get ADMIN access by default.
 * See Doc 2 (Lightning Labs AI Agent Tooling) for the 3-tier model.
 */
export type SecurityTier = "watch-only" | "pay-only" | "admin";

/** Security tier descriptions for UI */
export const SECURITY_TIER_INFO: Record<SecurityTier, {
  label: string;
  description: string;
  permissions: string[];
  warning?: string;
}> = {
  "watch-only": {
    label: "Watch Only",
    description: "Read-only access to node state. Cannot send or receive payments.",
    permissions: ["getInfo", "getBalance", "listChannels"],
  },
  "pay-only": {
    label: "Pay Only",
    description: "Can create and pay invoices via remote signer. Cannot manage channels or access admin functions.",
    permissions: ["getInfo", "getBalance", "listChannels", "createInvoice", "payInvoice"],
  },
  "admin": {
    label: "Admin",
    description: "Full access to all Lightning node functions. Only for trusted, human-operated connections.",
    permissions: ["all"],
    warning: "Admin access gives full control of your Lightning node including channel management and fund movement. Never grant this to autonomous agents.",
  },
};

/** Parsed user prompt result */
export interface ParsedPrompt {
  communityName: string;
  memberCount: number;
  features: CommunityFeature[];
  mintBackend: MintBackend;
  agentsEnabled: boolean;
  privacyLevel: "standard" | "high" | "maximum";
  description: string;
}
