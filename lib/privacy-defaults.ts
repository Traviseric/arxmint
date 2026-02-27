// ============================================================
// ArxMint — Privacy Defaults
// Configuration for Silent Payments, CoinJoin, PayJoin, Ark
// "Financial privacy as a human right"
// ============================================================

import type { PrivacyConfig } from "./types";

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

/** Compute a privacy score (0-100) from a config */
export function computePrivacyScore(config: PrivacyConfig): number {
  let score = 0;
  // Base: using ecash (Fedimint/Cashu) already gives strong privacy
  score += 40;
  if (config.silentPayments) score += 15;
  if (config.coinJoin) score += 15;
  if (config.payJoin) score += 10;
  if (config.arkSpends) score += 20;
  return Math.min(score, 100);
}

/** Human-readable description of each privacy layer */
export const PRIVACY_DESCRIPTIONS: Record<keyof PrivacyConfig, {
  name: string;
  short: string;
  detail: string;
  status: "live" | "maturing" | "experimental";
}> = {
  silentPayments: {
    name: "Silent Payments (BIP352)",
    short: "Stealth addresses — hides recipients",
    detail:
      "Generates unique one-time addresses for each transaction. The sender " +
      "derives a new address from the receiver's public key, so no address " +
      "reuse is visible on-chain. Protects recipient privacy without interaction.",
    status: "live",
  },
  coinJoin: {
    name: "CoinJoin",
    short: "Mixes coins to break transaction links",
    detail:
      "Combines multiple users' inputs and outputs into a single transaction, " +
      "making it computationally expensive to trace which inputs fund which " +
      "outputs. Breaks the chain analysis heuristic that links sender to receiver.",
    status: "live",
  },
  payJoin: {
    name: "PayJoin",
    short: "Sender + receiver co-sign to hide amounts",
    detail:
      "Both sender and receiver contribute inputs to a transaction, breaking " +
      "the common-input-ownership heuristic. Looks like a normal transaction " +
      "but obscures the actual payment amount from chain observers.",
    status: "live",
  },
  arkSpends: {
    name: "Ark Spends",
    short: "Off-chain private transfers via virtual UTXOs",
    detail:
      "Ark creates virtual UTXOs (vTXOs) that can be transferred off-chain " +
      "through an Ark Service Provider. Transactions settle on-chain in " +
      "batches, providing privacy through aggregation. Uses the Arkade SDK.",
    status: "experimental",
  },
};

/** Generate privacy-related Docker environment variables */
export function privacyEnvVars(config: PrivacyConfig): Record<string, string> {
  return {
    SILENT_PAYMENTS_ENABLED: config.silentPayments ? "true" : "false",
    COINJOIN_ENABLED: config.coinJoin ? "true" : "false",
    PAYJOIN_ENABLED: config.payJoin ? "true" : "false",
    ARK_SPENDS_ENABLED: config.arkSpends ? "true" : "false",
  };
}
