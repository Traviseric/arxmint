// ============================================================
// ArxMint — Managed DNS API
// POST /api/dns/provision — provision Cloudflare Tunnel + DNS
// GET  /api/dns/status    — check tunnel health
//
// Requires: merchant auth header (Authorization: Bearer <macaroon>)
// Falls back gracefully when CLOUDFLARE_API_TOKEN is not set.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  provisionMerchantDNS,
  getTunnelStatus,
} from "@/lib/managed-dns";
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

/** Validate merchant ID: alphanumeric + hyphens, 3-60 chars */
function isValidMerchantId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/i.test(id);
}

/**
 * POST /api/dns/provision
 *
 * Provisions a Cloudflare Tunnel and DNS CNAME for a merchant.
 * Body: { merchantId: string }
 *
 * Returns:
 *   200 — tunnel + DNS provisioned, includes tunnel token
 *   400 — invalid merchantId
 *   401 — not authenticated
 *   429 — rate limited
 *   503 — Cloudflare not configured (returns manual instructions)
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`dns:${ip}`, RATE_LIMITS.api);
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

  let body: { merchantId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merchantId = body.merchantId?.toLowerCase().trim();
  if (!merchantId || !isValidMerchantId(merchantId)) {
    return NextResponse.json(
      {
        error:
          "merchantId must be 3-60 lowercase alphanumeric characters or hyphens",
      },
      { status: 400 }
    );
  }

  logger.info("dns_provision_requested", {
    merchantId,
    action: "dns_provision_requested",
  });

  const result = await provisionMerchantDNS(merchantId);

  if (result.skipped) {
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: result.skipReason,
        manualInstructions: result.manualInstructions,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      success: result.success,
      tunnelConfig: result.tunnelConfig,
      ...(result.manualInstructions && {
        manualInstructions: result.manualInstructions,
      }),
    },
    { status: result.success ? 200 : 502 }
  );
}

/**
 * GET /api/dns/status?tunnelId=<id>
 *
 * Returns the health status of a Cloudflare Tunnel.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`dns-status:${ip}`, RATE_LIMITS.api);
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

  const tunnelId = req.nextUrl.searchParams.get("tunnelId");
  if (!tunnelId) {
    return NextResponse.json(
      { error: "tunnelId query parameter is required" },
      { status: 400 }
    );
  }

  const status = await getTunnelStatus(tunnelId);

  return NextResponse.json({ tunnelId, status });
}
