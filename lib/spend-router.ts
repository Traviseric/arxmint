"use client";

// ============================================================
// ArxMint — Privacy-Aware Spend Router
// Auto-selects optimal payment path based on:
//   - Amount (smaller → ecash, larger → LN, largest → on-chain)
//   - Privacy level (higher → prefer ecash > Ark > LN > on-chain)
//   - Available backends (what's connected)
//
// Source: Doc 4 — Ark/spend routing pseudocode
// ============================================================

import type { MintBackend, WalletBalance } from "./types";

/** Payment path / backend */
export type SpendPath =
  | "cashu"
  | "fedimint"
  | "lightning"
  | "ark"
  | "onchain"
  | "onchain-sp"; // on-chain with Silent Payments

/** Privacy rating for a spend path */
export type PrivacyRating = "maximum" | "high" | "medium" | "low";

/** User's preferred privacy level */
export type PrivacyPreference = "auto" | "maximum" | "high" | "standard";

/** Backend availability state */
export interface BackendAvailability {
  cashu: boolean;
  fedimint: boolean;
  lightning: boolean;
  ark: boolean;
  onchain: boolean;
  silentPayments: boolean;
}

/** Routing decision returned by the spend router */
export interface SpendRoute {
  /** Selected path */
  path: SpendPath;
  /** Human-readable label */
  label: string;
  /** Why this path was selected */
  reason: string;
  /** Privacy rating of this path */
  privacy: PrivacyRating;
  /** Estimated fee in sats (0 for ecash) */
  estimatedFeeSats: number;
  /** Whether this path is available right now */
  available: boolean;
  /** Alternative paths that could work */
  alternatives: SpendPath[];
}

/** Privacy scores for each path (higher = more private) */
const PRIVACY_SCORE: Record<SpendPath, number> = {
  cashu: 95,       // Bearer ecash — blinded, unlinkable within mint
  fedimint: 95,    // Federation ecash — same privacy model
  ark: 85,         // VTXOs — off-chain, high privacy
  lightning: 70,   // Good privacy but channel graph analysis possible
  "onchain-sp": 60, // Silent Payments — no address reuse
  onchain: 30,     // Standard on-chain — worst privacy
};

/** Human-readable labels */
const PATH_LABELS: Record<SpendPath, string> = {
  cashu: "Cashu Ecash",
  fedimint: "Fedimint Ecash",
  lightning: "Lightning",
  ark: "Ark VTXO",
  "onchain-sp": "On-chain (Silent Payment)",
  onchain: "On-chain",
};

/** Privacy rating thresholds */
function getPrivacyRating(score: number): PrivacyRating {
  if (score >= 90) return "maximum";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/**
 * Select the optimal spend path for a given payment.
 *
 * Routing logic (from Doc 4 pseudocode):
 * - < 10k sats + ecash available → ecash (best privacy, instant)
 * - < 100k sats + Lightning available → Lightning (fast, good privacy)
 * - < 1M sats + Ark available → Ark VTXOs (high privacy, off-chain)
 * - else → on-chain with Silent Payments (if supported) or standard
 *
 * Privacy preference overrides: if user wants maximum privacy,
 * always prefer ecash > Ark > LN > on-chain regardless of amount.
 */
export function selectSpendPath(
  amountSats: number,
  balance: WalletBalance,
  availability: BackendAvailability,
  mintBackend: MintBackend = "cashu",
  privacyPreference: PrivacyPreference = "auto"
): SpendRoute {
  // Build list of paths that have enough balance and are connected
  const viable: Array<{ path: SpendPath; score: number }> = [];

  // Ecash paths
  if (availability.cashu && balance.cashuSats >= amountSats) {
    viable.push({ path: "cashu", score: PRIVACY_SCORE.cashu });
  }
  if (availability.fedimint && Math.floor(balance.fedimintMsats / 1000) >= amountSats) {
    viable.push({ path: "fedimint", score: PRIVACY_SCORE.fedimint });
  }

  // Lightning
  if (availability.lightning && balance.lightningSats >= amountSats) {
    viable.push({ path: "lightning", score: PRIVACY_SCORE.lightning });
  }

  // Ark VTXOs — availability.ark is always false until @arkade-os/sdk is released
  if (availability.ark && balance.arkSats >= amountSats) {
    viable.push({ path: "ark", score: PRIVACY_SCORE.ark });
  }

  // On-chain
  if (availability.onchain && balance.onchainSats >= amountSats) {
    if (availability.silentPayments) {
      viable.push({ path: "onchain-sp", score: PRIVACY_SCORE["onchain-sp"] });
    }
    viable.push({ path: "onchain", score: PRIVACY_SCORE.onchain });
  }

  // No viable paths
  if (viable.length === 0) {
    return {
      path: "lightning",
      label: "Lightning",
      reason: "No backend has sufficient balance — deposit funds first",
      privacy: "medium",
      estimatedFeeSats: 0,
      available: false,
      alternatives: [],
    };
  }

  // If user wants maximum/high privacy, sort by privacy score
  if (privacyPreference === "maximum" || privacyPreference === "high") {
    viable.sort((a, b) => b.score - a.score);
    const best = viable[0];
    return buildRoute(
      best.path,
      amountSats,
      `Highest privacy path selected (${privacyPreference} preference)`,
      viable.filter((v) => v.path !== best.path).map((v) => v.path)
    );
  }

  // Auto mode: use amount-based heuristics
  let selected: SpendPath;
  let reason: string;

  if (amountSats < 10_000) {
    // Prefer ecash for small amounts
    const ecashPath = viable.find(
      (v) => v.path === mintBackend || v.path === "cashu" || v.path === "fedimint"
    );
    if (ecashPath) {
      selected = ecashPath.path;
      reason = "Small amount — ecash is instant and maximally private";
    } else if (viable.find((v) => v.path === "lightning")) {
      selected = "lightning";
      reason = "Small amount — Lightning fallback (ecash unavailable)";
    } else {
      selected = viable[0].path;
      reason = "Only available path";
    }
  } else if (amountSats < 100_000) {
    // Prefer Lightning for medium amounts
    if (viable.find((v) => v.path === "lightning")) {
      selected = "lightning";
      reason = "Medium amount — Lightning is fast with good privacy";
    } else {
      const ecashPath = viable.find(
        (v) => v.path === "cashu" || v.path === "fedimint"
      );
      selected = ecashPath?.path || viable[0].path;
      reason = ecashPath
        ? "Medium amount — ecash fallback (Lightning unavailable)"
        : "Only available path";
    }
  } else if (amountSats < 1_000_000) {
    // Prefer Ark for large amounts — reserved for when @arkade-os/sdk is available
    if (viable.find((v) => v.path === "ark")) {
      selected = "ark";
      reason = "Large amount — Ark VTXOs provide high privacy off-chain";
    } else if (viable.find((v) => v.path === "lightning")) {
      selected = "lightning";
      reason = "Large amount — Lightning fallback (Ark unavailable)";
    } else {
      selected = viable[0].path;
      reason = "Only available path for this amount";
    }
  } else {
    // Very large: on-chain
    const spPath = viable.find((v) => v.path === "onchain-sp");
    if (spPath) {
      selected = "onchain-sp";
      reason = "Very large amount — on-chain with Silent Payments for address privacy";
    } else if (viable.find((v) => v.path === "onchain")) {
      selected = "onchain";
      reason = "Very large amount — on-chain (consider enabling Silent Payments)";
    } else {
      selected = viable[0].path;
      reason = "Only available path for this amount";
    }
  }

  return buildRoute(
    selected,
    amountSats,
    reason,
    viable.filter((v) => v.path !== selected).map((v) => v.path)
  );
}

function buildRoute(
  path: SpendPath,
  amountSats: number,
  reason: string,
  alternatives: SpendPath[]
): SpendRoute {
  return {
    path,
    label: PATH_LABELS[path],
    reason,
    privacy: getPrivacyRating(PRIVACY_SCORE[path]),
    estimatedFeeSats: estimateFee(path, amountSats),
    available: true,
    alternatives,
  };
}

/** Rough fee estimation by path type */
function estimateFee(path: SpendPath, amountSats: number): number {
  switch (path) {
    case "cashu":
    case "fedimint":
      return 0; // Ecash transfers are free within the mint
    case "lightning":
      return Math.max(1, Math.ceil(amountSats * 0.001)); // ~0.1% routing fee
    case "ark":
      return Math.max(1, Math.ceil(amountSats * 0.0005)); // ~0.05%
    case "onchain-sp":
    case "onchain":
      return 250; // ~1 vByte × 250 sat/vB typical (placeholder)
    default:
      return 0;
  }
}

/** Privacy color for UI display */
export function privacyColor(rating: PrivacyRating): string {
  switch (rating) {
    case "maximum":
      return "text-green-400";
    case "high":
      return "text-blue-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-red-400";
  }
}
