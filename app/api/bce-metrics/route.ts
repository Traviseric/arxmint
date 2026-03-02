// ArxMint - BCE Metrics API endpoint
// GET /api/bce-metrics - returns community health metrics from Postgres
// Falls back to demo metrics when DB is unavailable

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeBCEMetrics, getDemoBCEMetrics, type BCEMetrics } from "@/lib/bce-metrics";
import { requireAuth } from "@/lib/auth-middleware";
import {
  isCommunityOwnedByUser,
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";
import { logger } from "@/lib/logger";
import { observeApiRoute } from "@/lib/api-observability";

async function getUserIdOrAuthError(
  request: NextRequest
): Promise<string | NextResponse> {
  try {
    return await requireSessionUserId(request);
  } catch (error: unknown) {
    if (error instanceof SessionUserError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 503;
      return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status });
    }
    return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status: 503 });
  }
}

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
  return observeApiRoute(request, "/api/bce-metrics", async () => {
    const authError = requireAuth(request);
    if (authError) return authError;

    const userId = await getUserIdOrAuthError(request);
    if (userId instanceof NextResponse) return userId;

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId") ?? undefined;

    if (communityId) {
      const owned = await isCommunityOwnedByUser(communityId, userId);
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    try {
      const metrics = await computeRealBCEMetrics(communityId);
      return NextResponse.json({ metrics, source: "database" });
    } catch (error: unknown) {
      logger.warn("GET /api/bce-metrics fallback to demo", {
        error: error instanceof Error ? error.message : String(error),
      });
      const metrics = getDemoBCEMetrics();
      return NextResponse.json({ metrics, source: "demo" });
    }
  });
}
