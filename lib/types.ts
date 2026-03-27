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
  /** Ark VTXO balance in sats */
  arkSats: number;
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

/** Prompt text when moving to a higher-risk Lightning tier */
export function getTierEscalationConfirmation(
  currentTier: SecurityTier,
  nextTier: SecurityTier
): string | null {
  const tierLevel: Record<SecurityTier, number> = {
    "watch-only": 0,
    "pay-only": 1,
    "admin": 2,
  };

  if (tierLevel[nextTier] <= tierLevel[currentTier]) {
    return null;
  }

  if (nextTier === "pay-only") {
    return (
      'Escalate to "pay-only" tier?\n\n' +
      "This enables invoice creation and outgoing payments.\n" +
      "Use only with an isolated remote signer."
    );
  }

  if (nextTier === "admin") {
    return (
      'Escalate to "admin" tier?\n\n' +
      "This grants full Lightning node control, including high-risk operations.\n" +
      "Never grant admin access to autonomous agents."
    );
  }

  return null;
}

/** Persisted transaction record (mirrors the DB Transaction model) */
export interface StoredTransaction {
  id: string;
  communityId: string;
  type: "send" | "receive" | "swap";
  amount: number;
  backend: "cashu" | "lightning" | "fedimint";
  timestamp: string; // ISO date string
  status: "pending" | "completed" | "failed";
  counterparty?: string | null;
}

/** Nostr user identity (NIP-07 login) */
export interface NostrUser {
  /** Hex-encoded public key */
  pubkey: string;
  /** Bech32-encoded npub */
  npub: string;
  /** Display name (truncated npub until profile fetched) */
  displayName: string;
  /** Real name from NIP-01 profile */
  name?: string;
  /** Avatar URL from NIP-01 profile */
  picture?: string;
  /** Timestamp when the user connected */
  connectedAt: number;
}

/** Merchant category */
export type MerchantCategory =
  | "food-drink"
  | "retail"
  | "services"
  | "health"
  | "entertainment"
  | "technology"
  | "other";

/** Payment methods a merchant can accept */
export type PaymentMethod = "cashu" | "lightning" | "onchain" | "fedimint";

/** Merchant listing in the community directory */
export interface MerchantListing {
  id: string;
  name: string;
  category: MerchantCategory;
  description: string;
  location: string;
  paymentMethods: PaymentMethod[];
  contactInfo?: string;
  telegramChatId?: string;
  createdAt: number;
  active: boolean;
}

/** Bazaar product category */
export type BazaarCategory =
  | "AI & Consciousness"
  | "Science & Reality"
  | "Future Paradigms"
  | "Hidden Patterns";

/** Bazaar product sold through the merchant marketplace prototype */
export interface BazaarProduct {
  id: string;
  merchantId: string;
  title: string;
  author?: string;
  description: string;
  longDescription?: string;
  priceSats: number;
  priceUsd?: number;
  originalPriceUsd?: number;
  category: BazaarCategory;
  coverImage: string;
  format: string[];
  pages?: number;
  rating?: number;
  badge?: string;
}

/** Bazaar product bundle/collection */
export interface BazaarCollection {
  id: string;
  merchantId: string;
  name: string;
  title: string;
  description: string;
  productIds: string[];
  priceSats: number;
  priceUsd?: number;
  originalPriceUsd?: number;
  savings?: number;
  badge?: string;
}

// ============================================================
// Payment State Machine
// ============================================================

/** All valid payment states — deterministic, spec'd transitions only */
export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

/** Canonical payment response shape returned by all payment endpoints */
export interface PaymentRecord {
  id: string;
  merchantId: string;
  status: PaymentStatus;
  amountSats: number;
  memo?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  demoMode: boolean;
}

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
