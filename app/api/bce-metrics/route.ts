// ArxMint - BCE Metrics API endpoint
// GET /api/bce-metrics - returns community health metrics from Postgres
// Falls back to demo metrics when DB is unavailable

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeBCEMetrics, getDemoBCEMetrics, type BCEMetrics } from "@/lib/bce-metrics";

async function computeRealBCEMetrics(communityId?: string): Promise<BCEMetrics> {
  const where = communityId ? { communityId } : {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [merchantCount, merchantsActive, recentTxs, allTxs] = await Promise.all([
    db.merchant.count({ where }),
    db.merchant.count({ where }),
    db.transaction.findMany({
      where: { ...where, timestamp: { gte: sevenDaysAgo } },
      select: { counterparty: true, amount: true, status: true },
    }),
    db.transaction.findMany({
      where: { ...where, timestamp: { gte: thirtyDaysAgo } },
      select: { status: true, amount: true, counterparty: true },
    }),
  ]);

  const activeSpenders = new Set(
    allTxs.map((t) => t.counterparty).filter(Boolean)
  ).size;
  const confirmedTxs = allTxs.filter((t) => t.status === "confirmed");
  const spendVelocity7d = recentTxs
    .filter((t) => t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0);
  const avgDailySpend = spendVelocity7d / 7;

  return computeBCEMetrics({
    merchantCount,
    merchantsActive,
    mau: activeSpenders,
    totalTransactions30d: allTxs.length,
    successfulTransactions30d: confirmedTxs.length,
    uptimeMinutes30d: 30 * 24 * 60, // assume full uptime without monitoring data
    ecashCirculation: 0,
    inboundLiquidity: 0,
    avgDailySpend,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId") ?? undefined;

  try {
    const metrics = await computeRealBCEMetrics(communityId);
    return NextResponse.json({ metrics, source: "database" });
  } catch (_error) {
    // DB unavailable - fall back to demo metrics
    const metrics = getDemoBCEMetrics();
    return NextResponse.json({ metrics, source: "demo" });
  }
}
