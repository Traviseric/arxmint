// ============================================================
// ArxMint — Auth Middleware (Session Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionEntry {
  pubkey: string;
  expiresAt: number;
}

// In-memory session store (prototype — no DB, resets on server restart)
// Maps sessionToken → { pubkey, expiresAt }
const sessions = new Map<string, SessionEntry>();

// Prune expired sessions every hour to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of sessions) {
    if (now > entry.expiresAt) sessions.delete(token);
  }
}, 60 * 60 * 1000);

/** Create a new session for a verified Nostr pubkey */
export function createSession(nostrPubkey: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, {
    pubkey: nostrPubkey,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

/** Look up the pubkey for a session token — returns null if missing or expired */
export function getSession(token: string): string | null {
  const entry = sessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(token); // Prune on access
    return null;
  }
  return entry.pubkey;
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
