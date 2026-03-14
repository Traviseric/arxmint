// ============================================================
// ArxMint Payment SDK
// Unified public API for L402 + NUT-24 + spend routing.
// Importable by Teneo Marketplace and other integrators.
//
// Server-side only - do NOT import in "use client" components.
// ============================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  verifyCashuPayment as _verifyCashuPayment,
  buildCashuChallenge,
  type CashuPaywallConfig,
} from "./cashu-paywall";
import { resilientFetch } from "./net-resilience";
import { logger } from "./logger";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** LND connection configuration */
export interface LndConfig {
  /** LND REST endpoint, e.g. https://localhost:8080 */
  host: string;
  /** Hex-encoded LND invoice macaroon */
  macaroon: string;
  /** TLS certificate (optional) */
  cert?: string;
}

/** A payment challenge issued by the server */
export interface PaymentChallenge {
  type: "l402" | "cashu";
  amount: number;
  currency: "sats";
  invoice?: string;
  mintUrl?: string;
  macaroon?: string;
  /** WWW-Authenticate header value to send in a 402 response */
  wwwAuthenticate: string;
  expiresAt: number;
}

/** Result of verifying a payment */
export interface PaymentResult {
  success: boolean;
  type: "l402" | "cashu";
  proof?: string;
  error?: string;
}

/** Recommended payment routing decision */
export interface SpendRoute {
  backend: "cashu" | "lightning" | "fedimint";
  reason: string;
  estimatedFee: number;
}

function getLNDConfig(override?: Partial<LndConfig>): { restUrl: string; macaroonHex: string } | null {
  const restUrl = override?.host || process.env.LND_REST_URL;
  const macaroonHex = override?.macaroon || process.env.LND_MACAROON_HEX;
  if (!restUrl || !macaroonHex) return null;
  return { restUrl, macaroonHex };
}

async function createLNDInvoice(
  amountSats: number,
  memo: string,
  lnd: { restUrl: string; macaroonHex: string }
): Promise<{ paymentRequest: string; rHash: string } | null> {
  try {
    const res = await resilientFetch(`${lnd.restUrl}/v1/invoices`, {
      method: "POST",
      headers: {
        "Grpc-Metadata-Macaroon": lnd.macaroonHex,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: String(amountSats), memo }),
    }, {
      timeoutMs: 5_000,
      circuitKey: "lnd:create-invoice",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.payment_request || !data.r_hash) return null;
    return { paymentRequest: data.payment_request as string, rHash: data.r_hash as string };
  } catch (error: unknown) {
    logger.warn("payment_sdk_create_lnd_invoice_failed", {
      error: getErrorMessage(error),
    });
    return null;
  }
}

export function signMacaroon(payload: object, rootKey: string): string {
  const payloadJson = JSON.stringify(payload);
  const sig = createHmac("sha256", rootKey).update(payloadJson).digest("hex");
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64");
}

export function verifyMacaroon(token: string, rootKey: string): { identifier: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    const { sig, ...payload } = decoded;
    if (!sig) return null;
    const expectedSig = createHmac("sha256", rootKey).update(JSON.stringify(payload)).digest("hex");
    if (sig !== expectedSig) return null;
    return payload as { identifier: string };
  } catch (error: unknown) {
    logger.debug("payment_sdk_verify_macaroon_parse_failed", {
      error: getErrorMessage(error),
    });
    return null;
  }
}

export function verifyPreimage(preimage: string, rHashBase64: string): boolean {
  try {
    const preimageBytes = Buffer.from(preimage, "hex");
    if (preimageBytes.length !== 32) return false;
    const derived = createHash("sha256").update(preimageBytes).digest();
    const expected = Buffer.from(rHashBase64, "base64");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch (error: unknown) {
    logger.debug("payment_sdk_verify_preimage_failed", {
      error: getErrorMessage(error),
    });
    return false;
  }
}

const _pendingL402 = new Map<string, { rHashBase64: string; expiresAt: number }>();
const L402_TTL_MS = 24 * 60 * 60 * 1000;

function prunePendingL402(): void {
  const now = Date.now();
  for (const [k, v] of _pendingL402) {
    if (v.expiresAt < now) _pendingL402.delete(k);
  }
}

/**
 * Create an L402 payment challenge (BOLT11 invoice + signed macaroon).
 *
 * Returns a challenge with the `wwwAuthenticate` header value for a 402 response.
 * Stores the macaroon->rHash mapping so `verifyL402Token()` can validate the preimage.
 *
 * Requires `LND_REST_URL`, `LND_MACAROON_HEX`, and `MACAROON_ROOT_KEY` env vars,
 * or pass `lndConfig` explicitly. Falls back to placeholder invoice in development.
 */
export async function createL402Challenge(params: {
  amount: number;
  resourcePath: string;
  lndConfig?: LndConfig;
}): Promise<PaymentChallenge> {
  prunePendingL402();
  const { amount, resourcePath } = params;
  const rootKey = process.env.MACAROON_ROOT_KEY;
  const lndCfg = getLNDConfig(params.lndConfig);
  const macaroonId = randomBytes(16).toString("hex");
  const macaroonPayload = { identifier: macaroonId, location: "arxmint", resource: resourcePath, amount };
  const macaroon = rootKey
    ? signMacaroon(macaroonPayload, rootKey)
    : Buffer.from(JSON.stringify(macaroonPayload)).toString("base64");
  let invoice: string;
  let rHash: string;
  const lndResult = lndCfg ? await createLNDInvoice(amount, `ArxMint L402 - ${resourcePath}`, lndCfg) : null;
  if (lndResult) {
    invoice = lndResult.paymentRequest;
    rHash = lndResult.rHash;
  } else if (process.env.NODE_ENV !== "production") {
    invoice = "lnbc1dev_placeholder_not_payable";
    rHash = randomBytes(32).toString("base64");
  } else {
    throw new Error("LND not configured - set LND_REST_URL and LND_MACAROON_HEX");
  }
  const expiresAt = Date.now() + L402_TTL_MS;
  _pendingL402.set(macaroon, { rHashBase64: rHash, expiresAt });
  return {
    type: "l402",
    amount,
    currency: "sats",
    invoice,
    macaroon,
    wwwAuthenticate: `L402 macaroon="${macaroon}", invoice="${invoice}"`,
    expiresAt,
  };
}

/**
 * Verify an L402 token (macaroon:preimage pair).
 *
 * Returns success if the macaroon HMAC is valid and SHA256(preimage) matches the stored rHash.
 */
export async function verifyL402Token(params: {
  macaroon: string;
  preimage: string;
  lndConfig?: LndConfig;
}): Promise<PaymentResult> {
  const { macaroon, preimage } = params;
  const rootKey = process.env.MACAROON_ROOT_KEY;
  if (rootKey) {
    const payload = verifyMacaroon(macaroon, rootKey);
    if (!payload) return { success: false, type: "l402", error: "Invalid macaroon signature" };
  }
  const pending = _pendingL402.get(macaroon);
  if (!pending) return { success: false, type: "l402", error: "Unknown or expired challenge" };
  if (pending.expiresAt < Date.now()) {
    _pendingL402.delete(macaroon);
    return { success: false, type: "l402", error: "Challenge expired" };
  }
  if (!verifyPreimage(preimage, pending.rHashBase64)) {
    return { success: false, type: "l402", error: "Preimage does not match payment hash" };
  }
  _pendingL402.delete(macaroon);
  return { success: true, type: "l402", proof: preimage };
}

/** Create a Cashu NUT-24 ecash payment challenge. */
export async function createCashuChallenge(params: {
  amount: number;
  mintUrl: string;
}): Promise<PaymentChallenge> {
  const config: CashuPaywallConfig = { priceSats: params.amount, mintUrl: params.mintUrl, unit: "sat" };
  return {
    type: "cashu",
    amount: params.amount,
    currency: "sats",
    mintUrl: params.mintUrl,
    wwwAuthenticate: buildCashuChallenge(config),
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

/**
 * Verify a Cashu ecash token payment.
 *
 * Checks proof states via NUT-07 and swaps proofs to claim payment.
 */
export async function verifyCashuPayment(params: {
  token: string;
  expectedAmount: number;
  mintUrl: string;
}): Promise<PaymentResult> {
  const result = await _verifyCashuPayment(params.token, {
    priceSats: params.expectedAmount,
    mintUrl: params.mintUrl,
    unit: "sat",
  });
  if (result.paid) return { success: true, type: "cashu", proof: params.token };
  return { success: false, type: "cashu", error: result.error };
}

/**
 * Route a payment to the best available backend.
 *
 * Heuristics: privacy preference first, then amount-based for standard.
 */
export async function routePayment(params: {
  amount: number;
  privacyLevel?: "standard" | "enhanced" | "maximum";
  availableBackends?: Array<"cashu" | "lightning" | "fedimint">;
}): Promise<SpendRoute> {
  const { amount, privacyLevel = "standard", availableBackends } = params;
  const backends = availableBackends ?? ["cashu", "lightning"];
  const hasCashu = backends.includes("cashu");
  const hasLightning = backends.includes("lightning");
  const hasFedimint = backends.includes("fedimint");
  if (privacyLevel === "maximum") {
    if (hasFedimint) return { backend: "fedimint", reason: "Maximum privacy - Fedimint ecash selected", estimatedFee: 0 };
    if (hasCashu) return { backend: "cashu", reason: "Maximum privacy - Cashu ecash selected", estimatedFee: 0 };
  }
  if (privacyLevel === "enhanced") {
    if (hasCashu) return { backend: "cashu", reason: "Enhanced privacy - Cashu ecash selected", estimatedFee: 0 };
    if (hasFedimint) return { backend: "fedimint", reason: "Enhanced privacy - Fedimint ecash selected", estimatedFee: 0 };
  }
  if (amount < 10_000) {
    if (hasCashu) return { backend: "cashu", reason: "Small amount - ecash is instant and private", estimatedFee: 0 };
    if (hasFedimint) return { backend: "fedimint", reason: "Small amount - Fedimint ecash fallback", estimatedFee: 0 };
  }
  if (hasLightning) {
    return {
      backend: "lightning",
      reason: "Lightning - fast and reliable for this amount",
      estimatedFee: Math.max(1, Math.ceil(amount * 0.001)),
    };
  }
  if (hasCashu) return { backend: "cashu", reason: "Cashu - only available backend", estimatedFee: 0 };
  if (hasFedimint) return { backend: "fedimint", reason: "Fedimint - only available backend", estimatedFee: 0 };
  return {
    backend: "lightning",
    reason: "Lightning - default backend",
    estimatedFee: Math.max(1, Math.ceil(amount * 0.001)),
  };
}
