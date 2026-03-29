// ============================================================
// ArxMint — Magic Link Verify: GET /api/merchant-auth/verify?token=XXX
// Verifies a magic link token, creates a session, redirects to dashboard.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  verifyMagicLinkToken,
  createMerchantSession,
  MERCHANT_SESSION_COOKIE,
} from "@/lib/merchant-session";
import { logger } from "@/lib/logger";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}/merchant-login?error=invalid`
    );
  }

  try {
    const result = await verifyMagicLinkToken(token);

    if (!result) {
      logger.info("magic_link_verify_failed", {
        token: token.slice(0, 8),
      });
      return NextResponse.redirect(
        `${baseUrl}/merchant-login?error=invalid`
      );
    }

    // Create session token
    const sessionToken = createMerchantSession(result.merchantId);

    logger.info("merchant_login_success", {
      merchantId: result.merchantId,
      email: result.email,
    });

    // Redirect to dashboard with session cookie
    const response = NextResponse.redirect(
      `${baseUrl}/merchant-dashboard`
    );
    response.cookies.set(MERCHANT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    logger.warn("magic_link_verify_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.redirect(
      `${baseUrl}/merchant-login?error=invalid`
    );
  }
}
