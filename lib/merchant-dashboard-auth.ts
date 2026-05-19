// ============================================================
// ArxMint — Merchant Dashboard Authorization
// Shared guard for merchant-owned dashboard routes.
// ============================================================

import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-error";
import { getMerchantFromRequest } from "@/lib/merchant-session";
import { verifyMerchantKey, type MerchantKeyScope } from "@/lib/merchant-auth";

const DEV_DEMO_MERCHANTS = new Set([
  "seed-black-bear",
  "seed-glacier",
  "seed-teneo",
  "arxmint-store",
]);

type DashboardPermission = "read" | "write";

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function scopeAllows(scope: MerchantKeyScope, permission: DashboardPermission): boolean {
  if (permission === "read") return true;
  return scope === "live" || scope === "test";
}

/**
 * Authorize access to a merchant dashboard route.
 *
 * Accepted credentials:
 * - Merchant session cookie created by /api/merchant-auth/verify
 * - Bearer merchant API key scoped to the requested merchant
 *
 * Non-production keeps seeded merchants open so the demo dashboard remains usable.
 */
export async function requireMerchantDashboardAccess(
  request: NextRequest,
  merchantId: string,
  permission: DashboardPermission = "read"
): Promise<Response | null> {
  const session = getMerchantFromRequest(request);
  if (session?.merchantId === merchantId) return null;

  if (session && session.merchantId !== merchantId) {
    return apiError(403, "FORBIDDEN_MERCHANT", "Merchant session does not match requested merchant.");
  }

  const token = bearerToken(request);
  if (token) {
    const key = await verifyMerchantKey(token, merchantId);
    if (key && scopeAllows(key.scope, permission)) return null;
    return apiError(403, "FORBIDDEN_MERCHANT_KEY", "Merchant key is not allowed for this action.");
  }

  if (process.env.NODE_ENV !== "production" && DEV_DEMO_MERCHANTS.has(merchantId)) {
    return null;
  }

  return apiError(401, "MERCHANT_AUTH_REQUIRED", "Merchant login is required.");
}

