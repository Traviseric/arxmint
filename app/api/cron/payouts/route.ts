// POST /api/cron/payouts — Vercel cron job endpoint for scheduled merchant payouts
//
// Vercel cron config in vercel.json:
//   { "crons": [{ "path": "/api/cron/payouts", "schedule": "0 2 * * *" }] }
//
// Auth: CRON_SECRET env var (set in Vercel dashboard).
// Vercel automatically sends Authorization: Bearer <CRON_SECRET> for cron invocations.
import { NextRequest, NextResponse } from "next/server";
import { processScheduledPayouts } from "@/lib/payouts";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  logger.info("cron_payouts_start", { action: "cron_payouts_start" });

  const result = await processScheduledPayouts();

  logger.info("cron_payouts_complete", {
    action: "cron_payouts_complete",
    ...result,
  });

  return NextResponse.json({ ok: true, ...result });
}

// Also accept GET so Vercel can verify the endpoint is reachable
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "cron/payouts" });
}
