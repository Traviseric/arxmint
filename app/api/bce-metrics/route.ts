// ============================================================
// ArxMint — BCE Metrics API
// GET /api/bce-metrics?communityId=xxx
// Computes real BCE metrics from DB transaction and merchant data.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeBCEMetrics } from "@/lib/bce-metrics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");

    const where = communityId ? { communityId } : {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [merchantCount, txData] = await Promise.all([
      db.merchant.count({ where }),
      db.transaction.findMany({
        where: {
          ...where,
          timestamp: { gte: thirtyDaysAgo },
        },
        select: {
          type: true,
          amount: true,
          status: true,
          counterparty: true,
        },
      }),
    ]);

    // Return empty signal when there is no data yet
    if (merchantCount === 0 && txData.length === 0) {
      return NextResponse.json({ empty: true, metrics: null });
    }

    const totalTransactions30d = txData.length;
    const successfulTransactions30d = txData.filter(
      (t) => t.status === "completed"
    ).length;

    // Unique non-null counterparties as a MAU proxy
    const uniqueCounterparties = new Set(
      txData.filter((t) => t.counterparty).map((t) => t.counterparty)
    ).size;

    const totalVolumeSats = txData.reduce((sum, t) => sum + t.amount, 0);
    const avgDailySpend = totalVolumeSats / 30;

    const metrics = computeBCEMetrics({
      merchantCount,
      // No per-merchant last-active tracking yet — assume all onboarded are active
      merchantsActive: merchantCount,
      mau: uniqueCounterparties,
      totalTransactions30d,
      successfulTransactions30d,
      // Assume full uptime until Prometheus data is available (task 011)
      uptimeMinutes30d: 30 * 24 * 60,
      ecashCirculation: totalVolumeSats,
      inboundLiquidity: 0, // LND channel data not yet available server-side
      avgDailySpend,
    });

    return NextResponse.json({ empty: false, metrics });
  } catch (error: any) {
    // DB not configured — return empty so UI degrades gracefully
    console.warn("Could not compute BCE metrics from DB:", error.message);
    return NextResponse.json({ empty: true, metrics: null });
  }
}
