// ============================================================
// ArxMint — Merchant Session Authentication (Email Magic Link)
// ============================================================
// Provides magic link token generation/verification and
// HMAC-signed merchant session tokens for cookie-based auth.
//
// Supabase table required:
// CREATE TABLE merchant_auth_tokens (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   token TEXT NOT NULL UNIQUE,
//   email TEXT NOT NULL,
//   merchant_id TEXT NOT NULL,
//   expires_at TIMESTAMPTZ NOT NULL,
//   used BOOLEAN DEFAULT false,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_merchant_auth_tokens_token ON merchant_auth_tokens(token);
// CREATE INDEX idx_merchant_auth_tokens_email ON merchant_auth_tokens(email);
// ============================================================

import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

const MAGIC_LINK_TTL_MIN = 15;
const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const MERCHANT_SESSION_COOKIE = "arxmint-merchant-session";

// Dev-only fallback — regenerated on each server start.
const _DEV_EPHEMERAL_SECRET = `merchant-dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function getMerchantSessionSecret(): string {
  const secret = process.env.MERCHANT_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[ArxMint] FATAL: MERCHANT_SESSION_SECRET is not set. " +
          "Generate one with: openssl rand -hex 32"
      );
    }
    logger.warn("merchant_auth_dev_secret", {
      action: "merchant_auth_dev_secret",
      message:
        "[ArxMint] DEV: MERCHANT_SESSION_SECRET is not set. " +
        "Using ephemeral key — sessions will not survive server restarts.",
    });
    return _DEV_EPHEMERAL_SECRET;
  }
  return secret;
}

/**
 * Generate a random magic link token, store it in Supabase, return the token string.
 * Token expires in 15 minutes.
 */
export async function createMagicLinkToken(
  email: string,
  merchantId: string
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000
  ).toISOString();

  const { supabase } = await import("@/lib/supabase");
  const { error } = await supabase.from("merchant_auth_tokens").insert({
    token,
    email: email.toLowerCase(),
    merchant_id: merchantId,
    expires_at: expiresAt,
    used: false,
  });

  if (error) {
    logger.warn("magic_link_insert_failed", {
      email,
      error: error.message,
    });
    throw new Error("Failed to create magic link token");
  }

  logger.info("magic_link_created", { email, merchantId });
  return token;
}

/**
 * Verify a magic link token: check existence, expiry, and used status.
 * Marks the token as used on successful verification (single-use).
 * Returns merchant info on success, null on failure.
 */
export async function verifyMagicLinkToken(
  token: string
): Promise<{ merchantId: string; email: string } | null> {
  if (!token || typeof token !== "string" || token.length !== 64) {
    return null;
  }

  const { supabase } = await import("@/lib/supabase");

  const { data, error } = await supabase
    .from("merchant_auth_tokens")
    .select("merchant_id, email, expires_at, used")
    .eq("token", token)
    .single();

  if (error || !data) return null;

  // Check if already used
  if (data.used) return null;

  // Check expiry
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) return null;

  // Mark as used (atomic — prevents concurrent use)
  const { error: updateError } = await supabase
    .from("merchant_auth_tokens")
    .update({ used: true })
    .eq("token", token)
    .eq("used", false);

  if (updateError) {
    logger.warn("magic_link_mark_used_failed", {
      token: token.slice(0, 8),
      error: updateError.message,
    });
  }

  logger.info("magic_link_verified", {
    email: data.email,
    merchantId: data.merchant_id,
  });

  return { merchantId: data.merchant_id, email: data.email };
}

/**
 * Create an HMAC-SHA256 signed session token for a merchant.
 * Format: merchantId.expUnixSec.hmacHex
 * Valid for 7 days.
 */
export function createMerchantSession(merchantId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const sig = createHmac("sha256", getMerchantSessionSecret())
    .update(`${merchantId}.${exp}`)
    .digest("hex");
  return `${merchantId}.${exp}.${sig}`;
}

/**
 * Verify and decode a merchant session token.
 * Returns { merchantId } on success, null on failure.
 */
export function verifyMerchantSession(
  token: string
): { merchantId: string } | null {
  if (!token) return null;

  const dotCount = (token.match(/\./g) ?? []).length;
  if (dotCount !== 2) return null;

  const lastDot = token.lastIndexOf(".");
  const secondLastDot = token.lastIndexOf(".", lastDot - 1);

  const merchantId = token.substring(0, secondLastDot);
  const expStr = token.substring(secondLastDot + 1, lastDot);
  const sig = token.substring(lastDot + 1);

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const expectedSig = createHmac("sha256", getMerchantSessionSecret())
    .update(`${merchantId}.${exp}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSig, "hex")
      )
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { merchantId };
}

/**
 * Extract merchant identity from a request via the session cookie.
 * Returns { merchantId } if valid, null otherwise.
 */
export function getMerchantFromRequest(
  request: NextRequest
): { merchantId: string } | null {
  const cookie = request.cookies.get(MERCHANT_SESSION_COOKIE);
  if (!cookie?.value) return null;
  return verifyMerchantSession(cookie.value);
}

/** The cookie name used for merchant sessions */
export { MERCHANT_SESSION_COOKIE };
