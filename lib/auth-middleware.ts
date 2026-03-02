// ============================================================
// ArxMint — Auth Middleware (HMAC-Signed Session Tokens)
// ============================================================
// Tokens are self-verifying HMAC-SHA256 signed payloads.
// No shared in-memory state — works in both Node.js API routes
// and Edge middleware (Web Crypto API compatible format).
//
// Token format: {pubkeyHex}.{expUnixSec}.{hmacHex}
//
// Cross-project session compatibility:
// Both arxmint and teneo-marketplace use the same token format.
// Share AUTH_SHARED_SECRET between both deployments.
// A user logged in at marketplace can call arxmint /api/payment/*
// with their marketplace JWT and be recognized via verifySharedSession().
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const SESSION_COOKIE = "arxmint_session";

// Ephemeral key used only in development when NEXTAUTH_SECRET is absent.
// Regenerated on each server start — sessions won't survive restarts, which is acceptable in dev.
const _DEV_EPHEMERAL_SECRET = `dev-ephemeral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[ArxMint] FATAL: NEXTAUTH_SECRET is not set. " +
          "Generate one with: openssl rand -hex 32"
      );
    }
    logger.warn("auth_dev_ephemeral_secret", {
      action: "auth_dev_ephemeral_secret",
      message:
        "[ArxMint] DEV: NEXTAUTH_SECRET is not set. " +
        "Using ephemeral key — sessions will not survive server restarts.",
    });
    return _DEV_EPHEMERAL_SECRET;
  }
  return secret;
}

/** Shared secret used for cross-project token verification with Teneo Marketplace */
function getSharedSecret(): string {
  const secret =
    process.env.AUTH_SHARED_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[ArxMint] FATAL: AUTH_SHARED_SECRET or NEXTAUTH_SECRET is not set."
      );
    }
    return _DEV_EPHEMERAL_SECRET;
  }
  return secret;
}

function computeHmac(pubkey: string, exp: number): string {
  return createHmac("sha256", getSecret())
    .update(`${pubkey}.${exp}`)
    .digest("hex");
}

/** Create a signed session token for a verified Nostr pubkey */
export function createSession(nostrPubkey: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const sig = computeHmac(nostrPubkey, exp);
  return `${nostrPubkey}.${exp}.${sig}`;
}

/** Validate a session token and return the pubkey if valid, null otherwise */
export function getSession(token: string): string | null {
  if (!token) return null;
  // Split on dots — nostr pubkeys are 64-char hex (no dots), sig is 64-char hex (no dots)
  // Format is exactly: pubkey(64hex).exp(digits).sig(64hex)
  const dotCount = (token.match(/\./g) ?? []).length;
  if (dotCount !== 2) return null;

  const lastDot = token.lastIndexOf(".");
  const secondLastDot = token.lastIndexOf(".", lastDot - 1);

  const pubkey = token.substring(0, secondLastDot);
  const expStr = token.substring(secondLastDot + 1, lastDot);
  const sig = token.substring(lastDot + 1);

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const expectedSig = computeHmac(pubkey, exp);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  return pubkey;
}

/** Returns true if the token is valid and unexpired */
export function validateSession(token: string): boolean {
  return getSession(token) !== null;
}

/**
 * Delete/invalidate a session.
 * With HMAC-signed tokens, revocation requires a blocklist — not implemented
 * in this prototype. The cookie is cleared client-side on logout, which is the
 * practical logout mechanism. Tokens expire naturally after SESSION_TTL_SEC.
 */
export function deleteSession(_token: string): void {
  // No-op: token will expire naturally
  // TODO: implement a DB-backed blocklist if immediate revocation is required
}

/** Extract session token from the request cookie */
export function getSessionFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(SESSION_COOKIE);
  return cookie?.value ?? null;
}

/**
 * Guard an API route — returns a 401 response if the request has no
 * valid session, or null if the request is authenticated.
 *
 * Usage:
 *   const authError = requireAuth(request);
 *   if (authError) return authError;
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = getSessionFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pubkey = getSession(token);
  if (!pubkey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Get the authenticated pubkey from a request (assumes requireAuth passed) */
export function getAuthPubkey(request: NextRequest): string | null {
  const token = getSessionFromRequest(request);
  if (!token) return null;
  return getSession(token);
}

/**
 * Verify a shared session token from Teneo Marketplace or another ArxMint instance.
 *
 * Accepts the same HMAC-signed token format as createSession(), but verifies
 * using AUTH_SHARED_SECRET (which should be set identically in both apps).
 * Falls back to NEXTAUTH_SECRET if AUTH_SHARED_SECRET is not configured.
 *
 * Usage:
 *   const result = verifySharedSession(bearerToken);
 *   if (result) { // result.pubkey is the verified Nostr pubkey }
 */
export function verifySharedSession(token: string): { pubkey: string } | null {
  if (!token) return null;

  // Try local secret first (handles tokens issued by this ArxMint instance)
  const localPubkey = getSession(token);
  if (localPubkey) return { pubkey: localPubkey };

  // Try shared secret (handles tokens issued by Teneo Marketplace)
  const sharedSecret = getSharedSecret();
  // Skip if shared secret is the same as local (avoid redundant check)
  if (sharedSecret === getSecret()) return null;

  try {
    const dotCount = (token.match(/\./g) ?? []).length;
    if (dotCount !== 2) return null;

    const lastDot = token.lastIndexOf(".");
    const secondLastDot = token.lastIndexOf(".", lastDot - 1);

    const pubkey = token.substring(0, secondLastDot);
    const expStr = token.substring(secondLastDot + 1, lastDot);
    const sig = token.substring(lastDot + 1);

    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;

    const expectedSig = createHmac("sha256", sharedSecret)
      .update(`${pubkey}.${exp}`)
      .digest("hex");

    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

    return { pubkey };
  } catch {
    return null;
  }
}

/**
 * Extract caller identity from a request.
 *
 * Accepts (in priority order):
 * 1. ArxMint session cookie (`arxmint_session`)
 * 2. Teneo Marketplace Bearer JWT (`Authorization: Bearer <token>`)
 * 3. Server-to-server `X-Marketplace-Secret` header (Teneo Marketplace backend calls)
 *
 * Returns the caller's Nostr pubkey (or "marketplace-system" for server-to-server),
 * or null if unauthenticated. Does NOT reject the request — callers decide.
 */
export function getCallerFromRequest(request: NextRequest): string | null {
  // 1. ArxMint native session cookie
  const cookiePubkey = getAuthPubkey(request);
  if (cookiePubkey) return cookiePubkey;

  // 2. Marketplace cross-auth: Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    const result = verifySharedSession(bearerToken);
    if (result) return result.pubkey;
  }

  // 3. Server-to-server: X-Marketplace-Secret header (Teneo Marketplace backend → ArxMint)
  const marketplaceSecret = request.headers.get("X-Marketplace-Secret");
  const expectedMarketplaceSecret = process.env.MARKETPLACE_SHARED_SECRET;
  if (
    marketplaceSecret &&
    expectedMarketplaceSecret &&
    marketplaceSecret === expectedMarketplaceSecret
  ) {
    return "marketplace-system";
  }

  return null;
}
