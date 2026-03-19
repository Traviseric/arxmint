// GET /api/payouts — list payout history for the authenticated merchant
import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { listPayouts } from "@/lib/payouts";

export async function GET(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId query param is required" }, { status: 400 });
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;
  const cursor = searchParams.get("cursor") ?? undefined;

  const { payouts, nextCursor } = await listPayouts(merchantId, { limit, cursor });

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      ...p,
      amountSats: p.amountSats.toString(),
    })),
    nextCursor,
    count: payouts.length,
  });
}
