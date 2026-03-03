// ============================================================
// ArxMint - API route observability helpers
// Request IDs + structured request logs + RED metrics.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { recordRedMetric } from "@/lib/red-metrics";

function makeRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    makeRequestId()
  );
}

export function attachRequestId(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export async function observeApiRoute(
  request: NextRequest,
  route: string,
  handler: (requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  let status = 500;

  try {
    const response = await handler(requestId);
    status = response.status;
    return attachRequestId(response, requestId);
  } catch (error: unknown) {
    status = 500;
    logger.error("api_unhandled_error", {
      action: "api_unhandled_error",
      route,
      method: request.method,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    const response = NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
    return attachRequestId(response, requestId);
  } finally {
    const durationMs = Date.now() - startedAt;
    recordRedMetric({
      route,
      method: request.method,
      status,
      durationMs,
    });
    logger.info("api_request", {
      action: "api_request",
      route,
      method: request.method,
      status,
      durationMs,
      requestId,
    });
  }
}

