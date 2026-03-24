// ============================================================
// ArxMint — NUT-24 Ecash Paywall
// Delegates to @te-btc/cashu-l402 for core implementation.
// Re-exports with ArxMint-compatible type signatures.
// ============================================================

import {
  parseCashuAuthHeader as _parseCashuAuthHeader,
  buildCashuChallenge as _buildCashuChallenge,
  verifyCashuPayment as _verifyCashuPayment,
  detectPaymentMethod as _detectPaymentMethod,
  buildDualChallenge as _buildDualChallenge,
} from "@te-btc/cashu-l402";

import type { Proof } from "@cashu/cashu-ts";

/** NUT-24 paywall configuration for an endpoint */
export interface CashuPaywallConfig {
  /** Price in sats for this endpoint */
  priceSats: number;
  /** Mint URL that tokens must be issued by */
  mintUrl: string;
  /** Unit (default: "sat") */
  unit?: string;
  /** Description shown to the client */
  description?: string;
}

/** Result of verifying a Cashu payment */
export interface CashuPaymentResult {
  paid: boolean;
  /** Amount received in sats */
  amountSats: number;
  /** Proofs that were verified */
  proofs: Proof[];
  /** Error message if payment failed */
  error?: string;
}

export const parseCashuAuthHeader = _parseCashuAuthHeader;
export const buildCashuChallenge = _buildCashuChallenge;
export const detectPaymentMethod = _detectPaymentMethod;
export const buildDualChallenge = _buildDualChallenge;

export async function verifyCashuPayment(
  token: string,
  config: CashuPaywallConfig
): Promise<CashuPaymentResult> {
  const result = await _verifyCashuPayment(token, config);
  return {
    paid: result.paid,
    amountSats: result.amountSats,
    proofs: result.proofs as Proof[],
    ...(result.error ? { error: result.error } : {}),
  };
}
