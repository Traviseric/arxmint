// ============================================================
// ArxMint — Agent API Endpoints
// L402-gated in production (via Aperture), demo mode locally
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCycleMetrics } from "@/lib/cycle-monitor";

/**
 * GET /api/agent — Main agent query endpoint
 * In production: gated behind Aperture L402 (100 sats)
 * In dev: returns demo data with L402 instructions
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") || "query";

  // Check for L402 token (passed through by Aperture in production)
  const hasAuth = authHeader?.startsWith("L402 ");

  // Route to the right agent service
  switch (service) {
    case "privacy-audit":
      return NextResponse.json({
        service: "privacy-audit",
        authenticated: hasAuth,
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
          authenticated: hasAuth,
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
        authenticated: hasAuth,
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
        authenticated: hasAuth,
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
        authenticated: hasAuth,
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
        note: hasAuth
          ? "Authenticated via L402 — full access granted"
          : "Unauthenticated — connect Lightning and pay via L402 for premium data",
        timestamp: Date.now(),
      });
  }
}
