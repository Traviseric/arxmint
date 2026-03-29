// ============================================================
// ArxMint — Magic Link Request: POST /api/merchant-auth/magic-link
// Sends a login email to a registered merchant.
// Rate limited: 3 per hour per email address.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createMagicLinkToken } from "@/lib/merchant-session";
import { sendMagicLinkEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAGIC_LINK_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Rate limit by email
    const rl = checkRateLimit(`magic-link:${email}`, MAGIC_LINK_RATE_LIMIT);
    if (!rl.allowed) {
      // Return success-shaped response to avoid leaking rate limit info
      return NextResponse.json({ sent: true });
    }

    // Also rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const ipRl = checkRateLimit(`magic-link-ip:${ip}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    });
    if (!ipRl.allowed) {
      return NextResponse.json({ sent: true });
    }

    // Look up email in merchant_pledges
    const { supabase } = await import("@/lib/supabase");
    const { data: merchant, error } = await supabase
      .from("merchant_pledges")
      .select("id, business_name, email")
      .eq("email", email)
      .eq("approved", true)
      .single();

    if (error || !merchant) {
      // Don't reveal whether the email exists — return success anyway
      logger.info("magic_link_unknown_email", { email });
      return NextResponse.json({ sent: true });
    }

    // Create magic link token
    const token = await createMagicLinkToken(email, merchant.id);

    // Build login URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      "https://arxmint.com";
    const loginUrl = `${baseUrl}/api/merchant-auth/verify?token=${token}`;

    // Send email
    const sent = await sendMagicLinkEmail({
      email,
      businessName: merchant.business_name,
      loginUrl,
    });

    if (!sent) {
      logger.warn("magic_link_email_failed", {
        email,
        merchantId: merchant.id,
      });
    }

    logger.info("magic_link_requested", {
      email,
      merchantId: merchant.id,
      sent,
    });

    return NextResponse.json({ sent: true });
  } catch (error: unknown) {
    logger.warn("magic_link_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
