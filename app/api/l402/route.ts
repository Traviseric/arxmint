// ============================================================
// ArxMint — L402 Proxy API
// Demonstrates L402 paywall pattern for agent commerce.
// In production, Aperture handles this at the reverse proxy layer.
//
// In dev: falls back to a placeholder invoice (explicitly logged).
// In prod: requires LND_REST_URL + LND_MACAROON_HEX env vars.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** In-memory store: base64-macaroon → { rHashBase64, expiresAt } */
const pendingL402 = new Map<
  string,
  { rHashBase64: string; expiresAt: number }
>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  } catch (e: any) {
    console.warn("[ArxMint] LND invoice creation error:", e.message);
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
 * 5. Server verifies SHA256(preimage) === stored rHash → serves resource
 *
 * Env vars required for production:
 *   LND_REST_URL      — LND REST endpoint, e.g. https://localhost:8080
 *   LND_MACAROON_HEX  — Hex-encoded LND invoice macaroon
 *
 * In production, Aperture sits in front of this endpoint and handles
 * the L402 flow transparently for agents using lnget.
 */
export async function GET(request: NextRequest) {
  pruneExpired();

  const authHeader = request.headers.get("Authorization");

  // ── Verification path: client sent L402 token after paying ──
  if (authHeader?.startsWith("L402 ")) {
    const token = authHeader.slice(5);
    const colonIdx = token.indexOf(":");

    if (colonIdx > 0) {
      const macaroon = token.slice(0, colonIdx);
      const preimage = token.slice(colonIdx + 1);
      const pending = pendingL402.get(macaroon);

      if (pending && verifyPreimage(preimage, pending.rHashBase64)) {
        // Valid preimage — consume the token and serve the protected resource
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

      // Dev mode: no pending record (server restarted) — accept any well-formed token
      if (process.env.NODE_ENV === "development" && !pending) {
        console.warn(
          "[ArxMint] DEV MODE: No pending L402 record found (server may have restarted). " +
            "Accepting well-formed token. Configure LND for real verification."
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

      return NextResponse.json(
        { error: "Invalid L402 token — preimage does not match payment hash" },
        { status: 401 }
      );
    }
  }

  // ── Challenge path: no valid token — generate invoice and return 402 ──
  const amountSats = Number(process.env.L402_PRICE_SATS) || 100;

  // Unique macaroon identifier — ties this challenge to one rHash
  const macaroonId = randomBytes(16).toString("hex");
  const macaroon = Buffer.from(
    JSON.stringify({
      identifier: macaroonId,
      location: "arxmint.local",
      caveats: ["service=agent-api", "tier=premium"],
    })
  ).toString("base64");

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
