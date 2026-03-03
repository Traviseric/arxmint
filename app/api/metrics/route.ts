import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedMetricsSnapshot } from "@/lib/red-metrics";
import { observeApiRoute } from "@/lib/api-observability";

export async function GET(request: NextRequest) {
  return observeApiRoute(request, "/api/metrics", async () => {
    const authError = requireAuth(request);
    if (authError) return authError;
    return NextResponse.json(getRedMetricsSnapshot());
  });
}

