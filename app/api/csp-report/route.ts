import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { observeApiRoute } from "@/lib/api-observability";

function extractIp(request: NextRequest): string {
  const forwarded =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  return observeApiRoute(request, "/api/csp-report", async () => {
    const ip = extractIp(request);
    const rl = checkRateLimit(`csp-report:${ip}`, RATE_LIMITS.public);
    if (!rl.allowed) {
      return new NextResponse(null, {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter ?? 60) },
      });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    logger.warn("csp_report_violation", {
      action: "csp_report_violation",
      ip,
      report: payload,
    });

    return new NextResponse(null, { status: 204 });
  });
}
