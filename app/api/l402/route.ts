// ============================================================
// ArxMint — L402 Proxy API
// Demonstrates L402 paywall pattern for agent commerce
// In production, Aperture handles this at the reverse proxy layer
// ============================================================

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/l402 — Example L402-gated endpoint
 *
 * Flow:
 * 1. Client sends GET request
 * 2. If no valid L402 token, return 402 with challenge
 * 3. Client pays Lightning invoice, gets preimage
 * 4. Client retries with Authorization: L402 <macaroon>:<preimage>
 * 5. Server validates and returns data
 *
 * In production, Aperture sits in front of this endpoint and
 * handles the L402 flow transparently. This API demonstrates
 * the pattern for development/testing without Aperture.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  // Check for L402 token
  if (authHeader?.startsWith("L402 ")) {
    const token = authHeader.slice(5);
    const [macaroon, preimage] = token.split(":");

    if (macaroon && preimage) {
      // In production, validate macaroon + preimage against LND
      // For now, any well-formed token passes
      return NextResponse.json({
        success: true,
        data: {
          message: "Welcome to the sovereign economy",
          timestamp: Date.now(),
          premium: true,
          // This is where premium agent data would go
          example_signal: {
            signal: "accumulate",
            confidence: 0.85,
            reasoning:
              "MVRV below 1.5, NUPL in accumulation zone, supply convergence detected",
          },
        },
      });
    }
  }

  // No valid token — return 402 Payment Required with L402 challenge
  // In a real setup, the macaroon + invoice come from LND via Aperture
  const demoMacaroon = Buffer.from(
    JSON.stringify({
      identifier: "arxmint-demo",
      location: "arxmint.local",
      caveats: ["service=agent-api", "tier=premium"],
    })
  ).toString("base64");

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message:
        "This endpoint requires L402 payment. Pay the Lightning invoice and retry with the token.",
      price_sats: 100,
      instructions: [
        "1. Pay the Lightning invoice in the WWW-Authenticate header",
        "2. Get the preimage from the payment",
        "3. Retry with header: Authorization: L402 <macaroon>:<preimage>",
        "In production, Aperture handles this automatically for agents using lnget",
      ],
    },
    { status: 402 }
  );

  // Set the L402 challenge header
  // In production, this would contain a real BOLT11 invoice from LND
  response.headers.set(
    "WWW-Authenticate",
    `L402 macaroon="${demoMacaroon}", invoice="lnbc1000n1demo_invoice_replace_with_real_bolt11"`
  );

  return response;
}
