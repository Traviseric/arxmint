// ============================================================
// ArxMint — L402 Proxy API
// Demonstrates L402 paywall pattern for agent commerce.
// In production, Aperture handles this at the reverse proxy layer.
//
// In dev: falls back to a placeholder invoice (explicitly logged).
// In prod: requires LND_REST_URL + LND_MACAROON_HEX env vars.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/rate-limiter";
import { checkSingleTxCap, ValueCapError } from "@/lib/value-caps";
import { logger } from "@/lib/logger";

/** In-memory store: base64-macaroon → { rHashBase64, expiresAt } */
const pendingL402 = new Map<
  string,
  { rHashBase64: string; expiresAt: number }
>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * MACAROON_ROOT_KEY — REQUIRED for HMAC-SHA256 macaroon signing.
 * Generate with: openssl rand -hex 32
 * Without this key macaroon structures are unsigned and trivially forgeable.
 */
const MACAROON_ROOT_KEY = process.env.MACAROON_ROOT_KEY;
if (!MACAROON_ROOT_KEY) {
  if (process.env.NODE_ENV === "production") {
    logger.error(
      { action: "l402_misconfigured" },
      "MACAROON_ROOT_KEY not set in production — L402 endpoint will return 503"
    );
  } else {
    console.warn(
      "[ArxMint] DEV: MACAROON_ROOT_KEY is not set. " +
        "Using unsigned macaroons (development only). Set MACAROON_ROOT_KEY for production."
    );
  }
}

/**
 * Guard: return 503 in production if MACAROON_ROOT_KEY is not configured.
 * Returns a NextResponse to return early, or null to continue.
 */
function requireMacaroonKey(): NextResponse | null {
  if (!MACAROON_ROOT_KEY && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Service temporarily unavailable — payment system misconfigured" },
      { status: 503 }
    );
  }
  return null;
}

/** Remove expired pending invoices to keep the map lean */
function pruneExpired(): void {
  const now = Date.now();
  for (const [k, v] of pendingL402) {
    if (v.expiresAt < now) pendingL402.delete(k);
  }
}

/**
 * Verify a payment preimage against a stored rHash.
 * SHA256(preimage) must equal rHash (constant-time compare).
 *
 * @param preimage - hex-encoded 32-byte payment preimage
 * @param rHashBase64 - base64-encoded 32-byte payment hash from LND
 */
function verifyPreimage(preimage: string, rHashBase64: string): boolean {
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

/**
 * Sign a macaroon payload with HMAC-SHA256.
 * Returns a base64-encoded JSON string containing the payload plus a `sig` field.
 * Throws if MACAROON_ROOT_KEY is not configured.
 */
function signMacaroon(payload: object): string {
  if (!MACAROON_ROOT_KEY) {
    throw new Error("MACAROON_ROOT_KEY is not set — cannot sign macaroon");
  }
  const payloadJson = JSON.stringify(payload);
  const sig = createHmac("sha256", MACAROON_ROOT_KEY)
    .update(payloadJson)
    .digest("hex");
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64");
}

/**
 * Verify an HMAC-signed macaroon.
 * Returns the decoded payload (without `sig`) if the HMAC is valid, null otherwise.
 * Returns null immediately if MACAROON_ROOT_KEY is not set.
 */
function verifyMacaroon(token: string): { identifier: string } | null {
  if (!MACAROON_ROOT_KEY) return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    const { sig, ...payload } = decoded;
    if (!sig) return null;
    const expectedSig = createHmac("sha256", MACAROON_ROOT_KEY)
      .update(JSON.stringify(payload))
      .digest("hex");
    if (sig !== expectedSig) return null;
    return payload as { identifier: string };
  } catch {
    return null;
  }
}

/**
 * Look up an invoice by payment hash via LND REST API.
 * Returns null if LND is not configured or the call fails (fail-open: allow cached preimage check to decide).
 */
async function lookupLNDInvoice(
  rHashBase64: string
): Promise<{ settled: boolean } | null> {
  const lndRestUrl = process.env.LND_REST_URL;
  const lndMacaroon = process.env.LND_MACAROON_HEX;

  if (!lndRestUrl || !lndMacaroon) return null;

  try {
    // LND REST /v1/invoice/{r_hash} requires URL-safe base64 (no padding)
    const rHashUrlSafe = rHashBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const res = await fetch(`${lndRestUrl}/v1/invoice/${rHashUrlSafe}`, {
      headers: { "Grpc-Metadata-Macaroon": lndMacaroon },
    });

    if (!res.ok) {
      console.warn(`[ArxMint] LND invoice lookup failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return { settled: data.settled === true };
  } catch (e: unknown) {
    console.warn("[ArxMint] LND invoice lookup error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Create a real BOLT11 invoice via LND REST API.
 * Returns null if LND is not configured or call fails.
 */
async function createLNDInvoice(
  amountSats: number,
  memo: string
): Promise<{ paymentRequest: string; rHash: string } | null> {
  const lndRestUrl = process.env.LND_REST_URL;
  const lndMacaroon = process.env.LND_MACAROON_HEX;

  if (!lndRestUrl || !lndMacaroon) return null;

  try {
    const res = await fetch(`${lndRestUrl}/v1/invoices`, {
      method: "POST",
      headers: {
        "Grpc-Metadata-Macaroon": lndMacaroon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: String(amountSats), memo }),
    });

    if (!res.ok) {
      console.warn(`[ArxMint] LND invoice creation failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data.payment_request || !data.r_hash) {
      console.warn("[ArxMint] LND response missing payment_request or r_hash");
      return null;
    }

    return { paymentRequest: data.payment_request as string, rHash: data.r_hash as string };
  } catch (e: unknown) {
    console.warn("[ArxMint] LND invoice creation error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * GET /api/l402 — Example L402-gated endpoint
 *
 * Flow:
 * 1. Client sends GET request
 * 2. No valid L402 token → 402 with macaroon + real BOLT11 invoice
 * 3. Client pays Lightning invoice, gets payment preimage
 * 4. Client retries with: Authorization: L402 <macaroon>:<preimage>
 * 5. Server verifies HMAC(macaroon) + SHA256(preimage) === stored rHash → serves resource
 *
 * Env vars required for production:
 *   LND_REST_URL      — LND REST endpoint, e.g. https://localhost:8080
 *   LND_MACAROON_HEX  — Hex-encoded LND invoice macaroon
 *   MACAROON_ROOT_KEY — HMAC key for macaroon signing (openssl rand -hex 32)
 *
 * In production, Aperture sits in front of this endpoint and handles
 * the L402 flow transparently for agents using lnget.
 */
export async function GET(request: NextRequest) {
  const macaroonGuard = requireMacaroonKey();
  if (macaroonGuard) return macaroonGuard;

  pruneExpired();

  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(`l402:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = request.headers.get("Authorization");

  // ── Verification path: client sent L402 token after paying ──
  if (authHeader?.startsWith("L402 ")) {
    const token = authHeader.slice(5);
    const colonIdx = token.indexOf(":");

    if (colonIdx > 0) {
      const macaroon = token.slice(0, colonIdx);
      const preimage = token.slice(colonIdx + 1);

      // HMAC verification — reject forged/tampered macaroons before any Map lookup
      if (MACAROON_ROOT_KEY) {
        const macPayload = verifyMacaroon(macaroon);
        if (!macPayload) {
          return NextResponse.json(
            { error: "Invalid L402 token — macaroon signature verification failed" },
            { status: 401 }
          );
        }
      }

      const pending = pendingL402.get(macaroon);

      if (pending && verifyPreimage(preimage, pending.rHashBase64)) {
        // Preimage is cryptographically valid (SHA-256 check passed).
        // Also verify with LND that the invoice is settled, if LND is available.
        const lndStatus = await lookupLNDInvoice(pending.rHashBase64);
        if (lndStatus && !lndStatus.settled) {
          // Preimage hashes correctly but LND hasn't settled the invoice yet.
          // Payment may be in-flight — ask the client to retry shortly.
          return NextResponse.json(
            {
              error: "Payment Required",
              message:
                "Invoice not yet settled — payment may be in-flight. Retry in a few seconds.",
            },
            { status: 402 }
          );
        }

        // Valid preimage confirmed — consume the token and serve the protected resource
        pendingL402.delete(macaroon);
        return NextResponse.json({
          success: true,
          data: {
            message: "Welcome to the sovereign economy",
            timestamp: Date.now(),
            premium: true,
            example_signal: {
              signal: "accumulate",
              confidence: 0.85,
              reasoning:
                "MVRV below 1.5, NUPL in accumulation zone, supply convergence detected",
            },
          },
        });
      }

      // SKIP_PAYMENT_VERIFY bypass — must be explicitly opted in, never works in production
      if (process.env.SKIP_PAYMENT_VERIFY === "true") {
        if (process.env.NODE_ENV === "production") {
          console.error(
            "[ArxMint] SKIP_PAYMENT_VERIFY cannot be set in production. Ignoring bypass."
          );
        } else if (!pending) {
          console.warn(
            "[ArxMint] SKIP_PAYMENT_VERIFY=true: No pending L402 record found " +
              "(server may have restarted). Accepting well-formed token. " +
              "Remove this flag in production."
          );
          return NextResponse.json({
            success: true,
            dev_mode: true,
            data: {
              message: "Welcome to the sovereign economy (dev mode)",
              timestamp: Date.now(),
              premium: true,
            },
          });
        }
      }

      // Preimage does not match stored rHash — payment not verified, require fresh payment
      return NextResponse.json(
        { error: "Payment Required", message: "Invalid or unpaid preimage — please pay the invoice and retry." },
        { status: 402 }
      );
    }
  }

  // ── Challenge path: no valid token — generate invoice and return 402 ──
  const amountSats = Number(process.env.L402_PRICE_SATS) || 100;

  try {
    checkSingleTxCap(amountSats);
  } catch (e: unknown) {
    if (e instanceof ValueCapError) {
      return NextResponse.json(
        { error: e.message, code: "VALUE_CAP_EXCEEDED" },
        { status: 400 }
      );
    }
  }

  // Unique macaroon identifier — ties this challenge to one rHash
  const macaroonId = randomBytes(16).toString("hex");
  const macaroonPayload = {
    identifier: macaroonId,
    location: "arxmint.local",
    caveats: ["service=agent-api", "tier=premium"],
  };

  // Sign the macaroon with HMAC-SHA256.
  // In production MACAROON_ROOT_KEY is required (requireMacaroonKey() gates above);
  // in dev, fall back to an unsigned macaroon with an explicit console warning.
  let macaroon: string;
  try {
    macaroon = signMacaroon(macaroonPayload);
  } catch {
    // MACAROON_ROOT_KEY not set — only reachable in development (production blocked above)
    console.warn("[ArxMint] DEV: issuing unsigned macaroon. Set MACAROON_ROOT_KEY for production.");
    macaroon = Buffer.from(JSON.stringify(macaroonPayload)).toString("base64");
  }

  let invoice: string;
  let rHash: string;
  let devMode = false;

  const lndResult = await createLNDInvoice(amountSats, "ArxMint L402 access token");
  if (lndResult) {
    invoice = lndResult.paymentRequest;
    rHash = lndResult.rHash;
  } else if (process.env.NODE_ENV === "development") {
    // Explicit dev mode fallback — not a silent failure
    console.warn(
      "[ArxMint] DEV MODE: LND not configured. Returning placeholder invoice. " +
        "Set LND_REST_URL and LND_MACAROON_HEX for real invoice generation."
    );
    invoice = "lnbc1000n1dev_placeholder_invoice_not_payable";
    // Generate a random rHash so the preimage check is consistent within the session
    rHash = randomBytes(32).toString("base64");
    devMode = true;
  } else {
    return NextResponse.json(
      {
        error: "LND not configured",
        message:
          "Set LND_REST_URL and LND_MACAROON_HEX environment variables to enable L402 invoice generation.",
      },
      { status: 503 }
    );
  }

  // Store the macaroon → rHash mapping for verification on retry
  pendingL402.set(macaroon, {
    rHashBase64: rHash,
    expiresAt: Date.now() + TTL_MS,
  });

  logger.payment("l402_challenge_created", {
    amount: amountSats,
    backend: "lightning",
    status: "pending",
  });

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message:
        "This endpoint requires L402 payment. Pay the Lightning invoice and retry with the token.",
      price_sats: amountSats,
      ...(devMode && { dev_mode: true, warning: "Placeholder invoice — not payable. Configure LND for real invoices." }),
      instructions: [
        "1. Pay the Lightning invoice in the WWW-Authenticate header",
        "2. Get the preimage from the payment",
        "3. Retry with header: Authorization: L402 <macaroon>:<preimage>",
        "In production, Aperture handles this automatically for agents using lnget",
      ],
    },
    { status: 402 }
  );

  response.headers.set(
    "WWW-Authenticate",
    `L402 macaroon="${macaroon}", invoice="${invoice}"`
  );

  return response;
}
