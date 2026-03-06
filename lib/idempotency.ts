// ============================================================
// ArxMint — Idempotency-Key middleware helper
//
// Implementation: in-memory Map with 24h TTL.
// Limitation: cache is per-process and clears on server restart.
// For production at scale, provision a Supabase `idempotency_keys` table
// and replace the Map with a DB-backed store.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10_000;
const MAX_KEY_LENGTH = 128;

interface CachedEntry {
  body: unknown;
  status: number;
  expiresAt: number;
}

const _cache = new Map<string, CachedEntry>();

/** Evict expired entries when the cache grows too large. */
function pruneExpired(): void {
  if (_cache.size < MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [k, v] of _cache) {
    if (v.expiresAt < now) _cache.delete(k);
  }
}

/**
 * Extract and validate the Idempotency-Key header.
 * Returns null if the header is missing or exceeds the max length.
 */
export function getIdempotencyKey(req: NextRequest): string | null {
  const key = req.headers.get("Idempotency-Key");
  if (!key) return null;
  if (key.length > MAX_KEY_LENGTH) return null;
  return key;
}

/**
 * Wrap a handler with Idempotency-Key deduplication.
 *
 * - If the key was seen within 24h, returns the cached response immediately
 *   with `X-Idempotent-Replayed: true`.
 * - Otherwise, calls the handler, caches the response (for non-5xx), and
 *   echoes the key back in a `Idempotency-Key` response header.
 * - If no Idempotency-Key header is present the handler is called directly
 *   with no caching.
 */
export async function withIdempotency(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = getIdempotencyKey(req);

  if (key) {
    pruneExpired();
    const cached = _cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      const response = NextResponse.json(cached.body, { status: cached.status });
      response.headers.set("Idempotency-Key", key);
      response.headers.set("X-Idempotent-Replayed", "true");
      return response;
    }
  }

  const response = await handler();

  if (key && response.status < 500) {
    try {
      const body = await response.clone().json();
      _cache.set(key, {
        body,
        status: response.status,
        expiresAt: Date.now() + TTL_MS,
      });
    } catch {
      // Response body is not JSON — skip caching
    }
    response.headers.set("Idempotency-Key", key);
  }

  return response;
}
