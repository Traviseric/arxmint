// ============================================================
// ArxMint — Auth Middleware (HMAC-Signed Session Tokens)
// ============================================================
// Tokens are self-verifying HMAC-SHA256 signed payloads.
// No shared in-memory state — works in both Node.js API routes
// and Edge middleware (Web Crypto API compatible format).
//
// Token format: {pubkeyHex}.{expUnixSec}.{hmacHex}
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const SESSION_COOKIE = "arxmint_session";

function getSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-secret-change-in-production"
  );
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
