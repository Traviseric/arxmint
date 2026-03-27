// ============================================================
// ArxMint — BTCMap Status API
// GET /api/btcmap/status
// Returns BTCMap submission statuses for all merchants.
// Used by the merchants page to show "Listed on BTCMap" badges.
// ============================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("btcmap_submissions")
      .select("merchant_id, status");

    if (error) {
      logger.warn("btcmap_status_db_error", { error: error.message });
      return NextResponse.json({ statuses: {} });
    }

    const statuses: Record<string, string> = {};
    if (data) {
      for (const row of data) {
        statuses[row.merchant_id] = row.status;
      }
    }

    return NextResponse.json({ statuses });
  } catch (err: unknown) {
    logger.error("btcmap_status_route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ statuses: {} });
  }
}
