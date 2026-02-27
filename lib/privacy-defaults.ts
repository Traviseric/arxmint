// ============================================================
// ArxMint — Privacy Defaults
// Configuration for Silent Payments, CoinJoin, PayJoin, Ark
// "Financial privacy as a human right"
//
// Per-backend availability is tracked honestly:
// - Silent Payments for Fedimint peg-outs requires server-side
//   federation module changes (NOT a client toggle).
// - Silent Payments for Cashu/on-chain sends is wallet-layer work.
// ============================================================

import type { PrivacyConfig, MintBackend } from "./types";

/** Privacy level presets */
export const PRIVACY_PRESETS = {
  standard: {
    silentPayments: true,
    coinJoin: false,
    payJoin: true,
    arkSpends: false,
  } satisfies PrivacyConfig,

  high: {
    silentPayments: true,
    coinJoin: true,
    payJoin: true,
    arkSpends: false,
  } satisfies PrivacyConfig,

  maximum: {
    silentPayments: true,
    coinJoin: true,
    payJoin: true,
    arkSpends: true,
  } satisfies PrivacyConfig,
} as const;

export type PrivacyLevel = keyof typeof PRIVACY_PRESETS;

/** Where a privacy layer is actually available */
export type BackendSupport =
  | "all"            // works on all backends
  | "on-chain"       // on-chain transactions only
  | "cashu-onchain"  // Cashu wallet + on-chain (wallet-layer SP sending)
  | "ecash-only"     // only within ecash (Fedimint/Cashu)
  | "requires-federation-module"; // needs server-side Fedimint changes

/** Human-readable description of each privacy layer */
export interface PrivacyLayerInfo {
  name: string;
  short: string;
  detail: string;
  status: "live" | "maturing" | "experimental";
  /** Which backends actually support this layer today */
  supportedBy: BackendSupport;
  /** Warning to show when the layer can't work with the current backend */
  backendWarning?: string;
}

export const PRIVACY_DESCRIPTIONS: Record<keyof PrivacyConfig, PrivacyLayerInfo> = {
  silentPayments: {
    name: "Silent Payments (BIP352)",
    short: "Stealth addresses — hides recipients",
    detail:
      "Generates unique one-time addresses for each transaction. The sender " +
      "derives a new address from the receiver's public key, so no address " +
      "reuse is visible on-chain. Protects recipient privacy without interaction.",
    status: "maturing",
    supportedBy: "cashu-onchain",
    backendWarning:
      "Silent Payments for Fedimint peg-outs requires a server-side federation " +
      "wallet module (not yet available). Currently works for Cashu wallet and " +
      "direct on-chain sends only.",
  },
  coinJoin: {
    name: "CoinJoin",
    short: "Mixes coins to break transaction links",
    detail:
      "Combines multiple users' inputs and outputs into a single transaction, " +
      "making it computationally expensive to trace which inputs fund which " +
      "outputs. Breaks the chain analysis heuristic that links sender to receiver.",
    status: "live",
    supportedBy: "on-chain",
  },
  payJoin: {
    name: "PayJoin",
    short: "Sender + receiver co-sign to hide amounts",
    detail:
      "Both sender and receiver contribute inputs to a transaction, breaking " +
      "the common-input-ownership heuristic. Looks like a normal transaction " +
      "but obscures the actual payment amount from chain observers.",
    status: "live",
    supportedBy: "on-chain",
  },
  arkSpends: {
    name: "Ark Spends",
    short: "Off-chain private transfers via virtual UTXOs",
    detail:
      "Ark creates virtual UTXOs (vTXOs) that can be transferred off-chain " +
      "through an Ark Service Provider. Transactions settle on-chain in " +
      "batches, providing privacy through aggregation. Uses the Arkade SDK.",
    status: "experimental",
    supportedBy: "on-chain",
    backendWarning:
      "Ark SDK integration is planned but not yet implemented. " +
      "VTXOs require an Ark Service Provider to be running.",
  },
};

/**
 * Check if a privacy layer is actually usable with the given backend.
 * Returns false for layers that are enabled in config but can't work
 * with the current mint backend.
 */
export function isLayerAvailable(
  layer: keyof PrivacyConfig,
  backend: MintBackend
): boolean {
  const info = PRIVACY_DESCRIPTIONS[layer];
  switch (info.supportedBy) {
    case "all":
      return true;
    case "on-chain":
      return true; // on-chain is always available regardless of mint backend
    case "cashu-onchain":
      return backend === "cashu"; // SP sending works at wallet layer for Cashu
    case "ecash-only":
      return true;
    case "requires-federation-module":
      return false; // not yet implemented at the federation level
    default:
      return true;
  }
}

/**
 * Compute a privacy score (0-100) from a config.
 * Only counts layers that are actually available for the given backend.
 */
export function computePrivacyScore(
  config: PrivacyConfig,
  backend: MintBackend = "cashu"
): number {
  let score = 0;
  // Base: using ecash (Fedimint/Cashu) already gives strong privacy
  score += 40;
  if (config.silentPayments && isLayerAvailable("silentPayments", backend)) score += 15;
  if (config.coinJoin) score += 15;
  if (config.payJoin) score += 10;
  if (config.arkSpends && isLayerAvailable("arkSpends", backend)) score += 20;
  return Math.min(score, 100);
}

/** Generate privacy-related Docker environment variables */
export function privacyEnvVars(config: PrivacyConfig): Record<string, string> {
  return {
    SILENT_PAYMENTS_ENABLED: config.silentPayments ? "true" : "false",
    COINJOIN_ENABLED: config.coinJoin ? "true" : "false",
    PAYJOIN_ENABLED: config.payJoin ? "true" : "false",
    ARK_SPENDS_ENABLED: config.arkSpends ? "true" : "false",
  };
}
