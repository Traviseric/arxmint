// ============================================================
// ArxMint — NUT-24 Ecash Paywall
// Cashu-native HTTP 402 — the ecash equivalent of L402.
// Users who already hold ecash pay directly without melting to LN.
//
// Protocol: Server returns WWW-Authenticate: Cashu with quote.
// Client pays with ecash token in Authorization: Cashu <token>.
// See: https://github.com/cashubtc/nuts/blob/main/24.md
// ============================================================

import {
  Wallet,
  getDecodedToken,
  type Proof,
  type ProofState,
} from "@cashu/cashu-ts";

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

/**
 * Parse an Authorization header for Cashu token (NUT-24).
 * Format: `Authorization: Cashu <base64-token>`
 */
export function parseCashuAuthHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) return null;

  // NUT-24 uses "Cashu" scheme (case-insensitive per HTTP spec)
  const match = authHeader.match(/^Cashu\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Build a WWW-Authenticate challenge header for NUT-24.
 * Returns the header value to include alongside L402 challenges.
 */
export function buildCashuChallenge(config: CashuPaywallConfig): string {
  const parts = [
    `Cashu mint="${config.mintUrl}"`,
    `amount="${config.priceSats}"`,
    `unit="${config.unit || "sat"}"`,
  ];
  if (config.description) {
    parts.push(`description="${config.description}"`);
  }
  return parts.join(", ");
}

/**
 * Verify a Cashu ecash token payment.
 *
 * Decodes the token, checks it's from the expected mint,
 * verifies the amount meets the price, and checks proof states.
 */
export async function verifyCashuPayment(
  token: string,
  config: CashuPaywallConfig
): Promise<CashuPaymentResult> {
  try {
    // Decode the token
    const decoded = getDecodedToken(token);

    // Verify mint URL matches
    if (decoded.mint && decoded.mint !== config.mintUrl) {
      return {
        paid: false,
        amountSats: 0,
        proofs: [],
        error: `Token issued by ${decoded.mint}, expected ${config.mintUrl}`,
      };
    }

    // Sum the proofs
    const proofs = decoded.proofs || [];
    const totalSats = proofs.reduce((sum, p) => sum + p.amount, 0);

    // Check amount meets price
    if (totalSats < config.priceSats) {
      return {
        paid: false,
        amountSats: totalSats,
        proofs,
        error: `Insufficient payment: ${totalSats} sats, need ${config.priceSats} sats`,
      };
    }

    // Verify proofs are unspent by checking with the mint
    const wallet = new Wallet(config.mintUrl, {
      unit: config.unit || "sat",
    });
    await wallet.loadMint();

    const states = await wallet.checkProofsStates(proofs);
    const allUnspent = states.every(
      (s: ProofState) => s.state === "UNSPENT"
    );

    if (!allUnspent) {
      return {
        paid: false,
        amountSats: totalSats,
        proofs,
        error: "Some proofs are already spent",
      };
    }

    // Swap proofs to claim them (prevents double-spend)
    await wallet.receive(token);

    return {
      paid: true,
      amountSats: totalSats,
      proofs,
    };
  } catch (e: any) {
    return {
      paid: false,
      amountSats: 0,
      proofs: [],
      error: e.message || "Token verification failed",
    };
  }
}

/**
 * Check if a request has valid payment (either L402 or Cashu NUT-24).
 * Returns the auth type and whether it's valid.
 */
export function detectPaymentMethod(
  authHeader: string | null
): { method: "l402" | "cashu" | "none"; token: string | null } {
  if (!authHeader) return { method: "none", token: null };

  if (authHeader.startsWith("L402 ")) {
    return { method: "l402", token: authHeader.slice(5) };
  }

  const cashuToken = parseCashuAuthHeader(authHeader);
  if (cashuToken) {
    return { method: "cashu", token: cashuToken };
  }

  return { method: "none", token: null };
}

/**
 * Build dual WWW-Authenticate headers for 402 responses.
 * Returns both L402 and Cashu challenges so clients can pay with either.
 */
export function buildDualChallenge(
  cashuConfig: CashuPaywallConfig,
  l402Challenge?: string
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Cashu NUT-24 challenge
  headers["WWW-Authenticate"] = buildCashuChallenge(cashuConfig);

  // L402 challenge (if available — requires Lightning invoice)
  if (l402Challenge) {
    // Multiple WWW-Authenticate schemes in a single header separated by comma,
    // or use separate headers. We append to the same header.
    headers["WWW-Authenticate"] += `, ${l402Challenge}`;
  }

  return headers;
}
