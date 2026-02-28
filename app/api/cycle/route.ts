// ============================================================
// ArxMint — Cycle Signals API
// GET /api/cycle — returns current BTC cycle metrics
// ============================================================

import { NextResponse } from "next/server";
import { getCycleMetrics, fetchMarketData } from "@/lib/cycle-monitor";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const [metrics, market] = await Promise.all([
      getCycleMetrics(),
      fetchMarketData(),
    ]);

    return NextResponse.json({
      success: true,
      metrics,
      market: {
        price: market.price,
        marketCap: market.marketCap,
        volume24h: market.volume24h,
        priceChange24h: market.priceChange24h,
        priceChange7d: market.priceChange7d,
        ath: market.ath,
        athDate: market.athDate,
      },
    });
  } catch (error: unknown) {
    logger.error("GET /api/cycle error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
