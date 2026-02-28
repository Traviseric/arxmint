// ============================================================
// ArxMint — Agent API Endpoints
// Dual paywall: L402 (Lightning) + NUT-24 (Cashu ecash)
// In production: gated behind Aperture L402 + Cashu verification.
//
// Payment is required by default. To bypass in dev/testing:
//   SKIP_PAYMENT_VERIFY=true (env var — explicit override only)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCycleMetrics } from "@/lib/cycle-monitor";
import {
  detectPaymentMethod,
  verifyCashuPayment,
  buildCashuChallenge,
  type CashuPaywallConfig,
} from "@/lib/cashu-paywall";

/** Default paywall config — matches .env.example CASHU_MINT_URL */
const PAYWALL_CONFIG: CashuPaywallConfig = {
  priceSats: Number(process.env.L402_PRICE_SATS) || 100,
  mintUrl: process.env.CASHU_MINT_URL || "http://localhost:3338",
  unit: "sat",
  description: "ArxMint Agent API access",
};

/** Service-specific pricing */
const SERVICE_PRICES: Record<string, number> = {
  "privacy-audit": 200,
  "cycle-signals": 50,
  compute: 500,
  data: 100,
};

/**
 * Verify payment from either L402 or Cashu NUT-24.
 *
 * Returns:
 *  - { authenticated: true }  — valid payment, proceed
 *  - { authenticated: false, response402 }  — invalid payment, return the 402
 *  - { authenticated: false }  — no payment header present (caller builds 402)
 *
 * Dev bypass: SKIP_PAYMENT_VERIFY=true skips all checks (explicit override only).
 */
async function checkPayment(
  request: NextRequest,
  serviceName: string
): Promise<{
  authenticated: boolean;
  method: "l402" | "cashu" | "none" | "skip";
  response402?: NextResponse;
}> {
  // Explicit dev/test bypass — must be opted in, not on by default
  if (process.env.SKIP_PAYMENT_VERIFY === "true") {
    console.warn(
      "[ArxMint] SKIP_PAYMENT_VERIFY=true — skipping payment verification. " +
        "Do not use this in production."
    );
    return { authenticated: true, method: "skip" };
  }

  // Support both standard Authorization and X-Cashu alternative header
  const authHeader =
    request.headers.get("Authorization") ??
    request.headers.get("X-Cashu");

  const { method, token } = detectPaymentMethod(authHeader);

  // L402: In production, Aperture handles verification upstream.
  // If the L402 header reaches us, it's already been validated by the proxy.
  if (method === "l402") {
    return { authenticated: true, method: "l402" };
  }

  // Cashu NUT-24: Verify the ecash token directly against the mint.
  if (method === "cashu" && token) {
    const price = SERVICE_PRICES[serviceName] || PAYWALL_CONFIG.priceSats;
    const result = await verifyCashuPayment(token, {
      ...PAYWALL_CONFIG,
      priceSats: price,
    });

    if (result.paid) {
      return { authenticated: true, method: "cashu" };
    }

    // Payment failed — return 402 with error details
    const config = { ...PAYWALL_CONFIG, priceSats: price };
    return {
      authenticated: false,
      method: "cashu",
      response402: NextResponse.json(
        {
          error: "Payment verification failed",
          detail: result.error,
          required: price,
          received: result.amountSats,
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": buildCashuChallenge(config),
          },
        }
      ),
    };
  }

  // No payment header present — caller will build 402
  return { authenticated: false, method: "none" };
}

/**
 * GET /api/agent — Main agent query endpoint
 *
 * Payment required (unless SKIP_PAYMENT_VERIFY=true in env):
 *   - L402 (Lightning): Authorization: L402 <macaroon>:<preimage>
 *   - Cashu NUT-24:     Authorization: Cashu <cashuB...token>
 *                   or: X-Cashu: <cashuB...token>
 *
 * Returns 402 with NUT-24 challenge when no payment is provided.
 * Returns 401 when an invalid or spent Cashu token is provided.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") || "query";

  const payment = await checkPayment(request, service);

  // Cashu payment present but invalid/spent → 401
  if (payment.response402) {
    return payment.response402;
  }

  // No payment at all → 402 with NUT-24 + instructions
  if (!payment.authenticated) {
    const price = SERVICE_PRICES[service] || PAYWALL_CONFIG.priceSats;
    const config = { ...PAYWALL_CONFIG, priceSats: price };
    return NextResponse.json(
      {
        error: "Payment required",
        message:
          "Pay via Cashu ecash (NUT-24) or Lightning (L402) to access this service.",
        price_sats: price,
        payment_methods: [
          "Cashu NUT-24: Authorization: Cashu <cashuB_token>",
          "Cashu NUT-24 (alt): X-Cashu: <cashuB_token>",
          "L402 Lightning: Authorization: L402 <macaroon>:<preimage>",
        ],
        hint: `Obtain a Cashu token from your mint at ${PAYWALL_CONFIG.mintUrl}`,
      },
      {
        status: 402,
        headers: {
          "WWW-Authenticate": buildCashuChallenge(config),
        },
      }
    );
  }

  const paymentMethod = payment.method;

  // Route to the right agent service
  switch (service) {
    case "privacy-audit":
      return NextResponse.json({
        service: "privacy-audit",
        paymentMethod,
        audit: {
          score: 78,
          recommendations: [
            "Enable CoinJoin for on-chain consolidation transactions",
            "Use Silent Payments (BIP352) for receiving — prevents address reuse",
            "Consider Ark spends for large transfers — better privacy than on-chain",
            "Your ecash usage within the mint is already fully private",
          ],
          layers: {
            ecash: { status: "active", privacy: "strong" },
            silentPayments: { status: "recommended", privacy: "high" },
            coinJoin: { status: "available", privacy: "medium-high" },
            ark: { status: "experimental", privacy: "very-high" },
          },
          timestamp: Date.now(),
        },
      });

    case "cycle-signals": {
      try {
        const metrics = await getCycleMetrics();
        return NextResponse.json({
          service: "cycle-signals",
          paymentMethod,
          signals: {
            ...metrics,
            recommendation:
              metrics.signal === "strong-buy" || metrics.signal === "buy"
                ? "Accumulate BTC. Convert USD reserves."
                : metrics.signal === "sell" || metrics.signal === "strong-sell"
                  ? "Consider spending BTC on real goods/assets."
                  : "Hold steady. Stack normally.",
          },
          timestamp: Date.now(),
        });
      } catch {
        return NextResponse.json({
          service: "cycle-signals",
          error: "Failed to fetch live data — returning cached signal",
          cached: {
            signal: "neutral",
            recommendation: "Hold steady. Stack normally.",
          },
        });
      }
    }

    case "compute":
      return NextResponse.json({
        service: "compute",
        paymentMethod,
        result: {
          jobId: `job_${Date.now().toString(36)}`,
          status: "completed",
          output: "Compute task executed successfully",
          compute_units: 1,
          cost_sats: 500,
        },
        timestamp: Date.now(),
      });

    case "data":
      return NextResponse.json({
        service: "data-marketplace",
        paymentMethod,
        datasets: [
          {
            id: "btc-mempool-stats",
            name: "BTC Mempool Statistics",
            description: "Real-time mempool size, fee rates, and tx count",
            price_sats: 50,
            format: "json",
          },
          {
            id: "lightning-capacity",
            name: "Lightning Network Capacity",
            description: "Channel capacity distribution and routing stats",
            price_sats: 100,
            format: "json",
          },
        ],
        timestamp: Date.now(),
      });

    default:
      return NextResponse.json({
        service: "agent-query",
        paymentMethod,
        message: "ArxMint Agent API",
        available_services: [
          "privacy-audit",
          "cycle-signals",
          "compute",
          "data",
        ],
        pricing: {
          "privacy-audit": "200 sats",
          "cycle-signals": "50 sats",
          compute: "500 sats/job",
          data: "50-100 sats/dataset",
        },
        payment_methods: [
          "L402 (Lightning): Pay BOLT11 invoice, include preimage in Authorization header",
          "Cashu NUT-24: Send ecash token in Authorization: Cashu <token>",
        ],
        timestamp: Date.now(),
      });
  }
}
