// ============================================================
// ArxMint Payment SDK
// Unified public API wrapping L402, NUT-24 Cashu paywall, and spend routing.
// Importable by Teneo Marketplace and other integrators.
//
// Server-side only (uses Node.js crypto for L402 macaroon signing).
// ============================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  verifyCashuPayment as _verifyCashuPayment,
  type CashuPaywallConfig,
} from "./cashu-paywall";

// ---- Public Types ----

export interface PaymentChallenge {
  type: "l402" | "cashu";
  amount: number;
  currency: "sats";
  /** L402: Lightning BOLT11 invoice to pay */
  invoice?: string;
  /** Cashu: mint URL to request a token from */
  mintUrl?: string;
  /** L402: HMAC-signed macaroon to include in the Authorization header */
  macaroon?: string;
  expiresAt: number;
}

export interface PaymentResult {
  success: boolean;
  type: "l402" | "cashu";
  /** L402: hex-encoded payment preimage. Cashu: "verified". */
  proof?: string;
  error?: string;
}

export interface SpendRoute {
  backend: "cashu" | "lightning" | "fedimint";
  reason: string;
  estimatedFee: number;
}

/** LND REST API connection config */
export interface LndConfig {
  restUrl: string;
  macaroonHex: string;
  /** HMAC root key for macaroon signing. Falls back to MACAROON_ROOT_KEY env var. */
  rootKey?: string;
}

// ---- Internal helpers ----

const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** In-process store: base64-macaroon → { rHashBase64, expiresAt } */
const _pendingL402 = new Map<string, { rHashBase64: string; expiresAt: number }>();

function _pruneExpired(): void {
  const now = Date.now();
  for (const [k, v] of _pendingL402) {
    if (v.expiresAt < now) _pendingL402.delete(k);
  }
}

function _signMacaroon(payload: object, rootKey: string): string {
  const payloadJson = JSON.stringify(payload);
  const sig = createHmac("sha256", rootKey).update(payloadJson).digest("hex");
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64");
}

function _verifyMacaroonSignature(
  token: string,
  rootKey: string
): { identifier: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    const { sig, ...payload } = decoded;
    if (!sig) return null;
    const expected = createHmac("sha256", rootKey)
      .update(JSON.stringify(payload))
      .digest("hex");
    if (sig !== expected) return null;
    return payload as { identifier: string };
  } catch {
    return null;
  }
}

function _verifyPreimage(preimage: string, rHashBase64: string): boolean {
  try {
    const preimageBytes = Buffer.from(preimage, "hex");
    if (preimageBytes.length !== 32) return false;
    const derived = createHash("sha256").update(preimageBytes).digest();
    const expected = Buffer.from(rHashBase64, "base64");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

async function _createLNDInvoice(
  amountSats: number,
  memo: string,
  lndConfig: LndConfig
): Promise<{ paymentRequest: string; rHash: string } | null> {
  try {
    const res = await fetch(`${lndConfig.restUrl}/v1/invoices`, {
      method: "POST",
      headers: {
        "Grpc-Metadata-Macaroon": lndConfig.macaroonHex,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: String(amountSats), memo }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.payment_request || !data.r_hash) return null;
    return {
      paymentRequest: data.payment_request as string,
      rHash: data.r_hash as string,
    };
  } catch {
    return null;
  }
}

function _resolveLndConfig(override?: LndConfig): LndConfig | null {
  if (override) return override;
  const restUrl = process.env.LND_REST_URL;
  const macaroonHex = process.env.LND_MACAROON_HEX;
  if (!restUrl || !macaroonHex) return null;
  return { restUrl, macaroonHex };
}

// ---- Public API ----

/**
 * Create an L402 payment challenge for a protected resource.
 *
 * Generates a real BOLT11 invoice via LND REST if configured; falls back to
 * a placeholder in development. The returned `macaroon` and `invoice` fields
 * should be sent to the client in a `WWW-Authenticate: L402 macaroon="…", invoice="…"` header.
 *
 * Uses `LND_REST_URL`, `LND_MACAROON_HEX`, and `MACAROON_ROOT_KEY` env vars
 * when `lndConfig` is not provided.
 */
export async function createL402Challenge(params: {
  amount: number;
  resourcePath: string;
  lndConfig?: LndConfig;
}): Promise<PaymentChallenge> {
  _pruneExpired();

  const { amount, resourcePath, lndConfig } = params;
  const rootKey =
    lndConfig?.rootKey ?? process.env.MACAROON_ROOT_KEY;

  const macaroonPayload = {
    identifier: randomBytes(16).toString("hex"),
    location: "arxmint",
    resource: resourcePath,
  };

  const macaroon = rootKey
    ? _signMacaroon(macaroonPayload, rootKey)
    : Buffer.from(JSON.stringify(macaroonPayload)).toString("base64");

  const resolvedLnd = _resolveLndConfig(lndConfig);
  let invoice: string;
  let rHash: string;

  if (resolvedLnd) {
    const result = await _createLNDInvoice(
      amount,
      `ArxMint L402 — ${resourcePath}`,
      resolvedLnd
    );
    if (result) {
      invoice = result.paymentRequest;
      rHash = result.rHash;
    } else {
      invoice = "lnbc_placeholder_lnd_unavailable";
      rHash = randomBytes(32).toString("base64");
    }
  } else {
    invoice = "lnbc_placeholder_lnd_not_configured";
    rHash = randomBytes(32).toString("base64");
  }

  const expiresAt = Date.now() + TTL_MS;
  _pendingL402.set(macaroon, { rHashBase64: rHash, expiresAt });

  return { type: "l402", amount, currency: "sats", invoice, macaroon, expiresAt };
}

/**
 * Verify an L402 token received in an `Authorization: L402 <macaroon>:<preimage>` header.
 *
 * Checks the HMAC macaroon signature (if MACAROON_ROOT_KEY is set) and validates
 * that SHA256(preimage) matches the stored payment hash.
 */
export async function verifyL402Token(params: {
  macaroon: string;
  preimage: string;
  lndConfig?: LndConfig;
}): Promise<PaymentResult> {
  const { macaroon, preimage } = params;
  const rootKey =
    params.lndConfig?.rootKey ?? process.env.MACAROON_ROOT_KEY;

  if (rootKey) {
    const decoded = _verifyMacaroonSignature(macaroon, rootKey);
    if (!decoded) {
      return { success: false, type: "l402", error: "Invalid macaroon signature" };
    }
  }

  const pending = _pendingL402.get(macaroon);
  if (!pending) {
    return {
      success: false,
      type: "l402",
      error: "No pending challenge for this macaroon — expired or unknown",
    };
  }

  if (pending.expiresAt < Date.now()) {
    _pendingL402.delete(macaroon);
    return { success: false, type: "l402", error: "L402 challenge expired" };
  }

  if (!_verifyPreimage(preimage, pending.rHashBase64)) {
    return {
      success: false,
      type: "l402",
      error: "Preimage does not match payment hash",
    };
  }

  _pendingL402.delete(macaroon);
  return { success: true, type: "l402", proof: preimage };
}

/**
 * Create a Cashu NUT-24 ecash payment challenge.
 *
 * Returns challenge metadata. Build the `WWW-Authenticate` header using:
 * ```
 * import { buildCashuChallenge } from '@/lib/cashu-paywall';
 * headers['WWW-Authenticate'] = buildCashuChallenge({ priceSats: amount, mintUrl });
 * ```
 */
export async function createCashuChallenge(params: {
  amount: number;
  mintUrl: string;
  description?: string;
}): Promise<PaymentChallenge> {
  const { amount, mintUrl } = params;
  return {
    type: "cashu",
    amount,
    currency: "sats",
    mintUrl,
    expiresAt: Date.now() + TTL_MS,
  };
}

/**
 * Verify a Cashu ecash token sent in `Authorization: Cashu <token>`.
 *
 * Decodes the token, checks the mint URL, verifies the amount meets the
 * expected amount, confirms proofs are unspent, and swaps them to prevent
 * double-spend.
 */
export async function verifyCashuPayment(params: {
  token: string;
  expectedAmount: number;
  mintUrl: string;
}): Promise<PaymentResult> {
  const { token, expectedAmount, mintUrl } = params;
  const config: CashuPaywallConfig = { priceSats: expectedAmount, mintUrl };
  const result = await _verifyCashuPayment(token, config);

  if (result.paid) {
    return { success: true, type: "cashu", proof: "verified" };
  }
  return { success: false, type: "cashu", error: result.error };
}

/**
 * Route a payment to the best available backend.
 *
 * Privacy levels:
 * - `maximum` / `enhanced` → always prefer ecash (Cashu > Fedimint)
 * - `standard` → amount-based: <10k sats → ecash, larger → Lightning
 */
export async function routePayment(params: {
  amount: number;
  privacyLevel?: "standard" | "enhanced" | "maximum";
  availableBackends?: Array<"cashu" | "lightning" | "fedimint">;
}): Promise<SpendRoute> {
  const {
    amount,
    privacyLevel = "standard",
    availableBackends = ["cashu", "lightning", "fedimint"],
  } = params;

  const hasCashu = availableBackends.includes("cashu");
  const hasFedimint = availableBackends.includes("fedimint");
  const hasLightning = availableBackends.includes("lightning");

  // Privacy-first: ecash always wins for maximum / enhanced
  if (privacyLevel === "maximum" || privacyLevel === "enhanced") {
    if (hasCashu) {
      return {
        backend: "cashu",
        reason: `${privacyLevel} privacy — Cashu ecash (blinded, unlinkable)`,
        estimatedFee: 0,
      };
    }
    if (hasFedimint) {
      return {
        backend: "fedimint",
        reason: `${privacyLevel} privacy — Fedimint ecash`,
        estimatedFee: 0,
      };
    }
  }

  // Standard: amount-based heuristics
  if (amount < 10_000) {
    if (hasCashu) {
      return {
        backend: "cashu",
        reason: "Small amount — Cashu ecash is instant and maximally private",
        estimatedFee: 0,
      };
    }
    if (hasFedimint) {
      return {
        backend: "fedimint",
        reason: "Small amount — Fedimint ecash fallback",
        estimatedFee: 0,
      };
    }
  }

  if (hasLightning) {
    return {
      backend: "lightning",
      reason: "Lightning — fast with good privacy",
      estimatedFee: Math.max(1, Math.ceil(amount * 0.001)),
    };
  }

  if (hasCashu) {
    return { backend: "cashu", reason: "Cashu ecash — only available backend", estimatedFee: 0 };
  }
  if (hasFedimint) {
    return { backend: "fedimint", reason: "Fedimint ecash — only available backend", estimatedFee: 0 };
  }

  // No backends available — return Lightning as default with a note
  return {
    backend: "lightning",
    reason: "No preferred backend available — defaulting to Lightning",
    estimatedFee: Math.max(1, Math.ceil(amount * 0.001)),
  };
}
