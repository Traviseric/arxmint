// ============================================================
// ArxMint — LSP Liquidity API
// POST /api/lsp/bootstrap — request inbound channel for merchant
// GET  /api/lsp/status    — poll channel open status
//
// Requires: merchant auth header (Authorization: Bearer <macaroon>)
// Falls back gracefully when LSP_URL is not configured.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapLiquidity,
  pollChannelStatus,
} from "@/lib/lsp-bootstrap";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function requireAuth(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return auth;
}

/**
 * POST /api/lsp/bootstrap
 *
 * Request inbound Lightning liquidity from the configured LSP.
 * Body: { nodeId: string, host?: string, requestedSats?: number }
 *
 * Returns:
 *   200 — channel request submitted (status: "opening" or "not_started")
 *   400 — missing nodeId
 *   401 — not authenticated
 *   429 — rate limited
 *   503 — LSP not configured (returns manual instructions)
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`lsp:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const token = requireAuth(req);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required — provide merchant macaroon" },
      { status: 401 }
    );
  }

  let body: {
    nodeId?: string;
    host?: string;
    requestedSats?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.nodeId || typeof body.nodeId !== "string") {
    return NextResponse.json(
      { error: "nodeId is required (your LND node public key)" },
      { status: 400 }
    );
  }

  // Validate nodeId is a plausible 33-byte compressed pubkey (66 hex chars)
  if (!/^[0-9a-fA-F]{66}$/.test(body.nodeId)) {
    return NextResponse.json(
      { error: "nodeId must be a 66-character hex Lightning node public key" },
      { status: 400 }
    );
  }

  logger.info("lsp_bootstrap_requested", {
    nodeId: body.nodeId.slice(0, 12) + "...",
    requestedSats: body.requestedSats,
    action: "lsp_bootstrap_requested",
  });

  const result = await bootstrapLiquidity({
    nodeId: body.nodeId,
    host: body.host,
    requestedSats: body.requestedSats,
  });

  if (result.skipped) {
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: result.skipReason,
        channelState: result.channelState,
        manualInstructions: result.manualInstructions,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      success: result.success,
      channelState: result.channelState,
      ...(result.manualInstructions && {
        manualInstructions: result.manualInstructions,
      }),
    },
    { status: result.success ? 200 : 502 }
  );
}

/**
 * GET /api/lsp/status?channelId=<id>
 *
 * Poll the status of a pending channel from the LSP.
 * Returns current channel state (pending | opening | active | failed).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`lsp-status:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const token = requireAuth(req);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json(
      { error: "channelId query parameter is required" },
      { status: 400 }
    );
  }

  const state = await pollChannelStatus(channelId);

  return NextResponse.json({ channelState: state });
}
