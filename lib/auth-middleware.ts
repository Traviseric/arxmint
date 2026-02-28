// ============================================================
// ArxMint — Auth Middleware (Session Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";

// In-memory session store (prototype — no DB, resets on server restart)
// Maps sessionToken → nostrPubkey
const sessions = new Map<string, string>();

/** Create a new session for a verified Nostr pubkey */
export function createSession(nostrPubkey: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, nostrPubkey);
  return token;
}

/** Look up the pubkey for a session token */
export function getSession(token: string): string | null {
  return sessions.get(token) ?? null;
}

/** Remove a session (logout) */
export function deleteSession(token: string): void {
  sessions.delete(token);
}

/** Extract session token from the request cookie */
export function getSessionFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get("arxmint_session");
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
