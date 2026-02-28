// ============================================================
// ArxMint — Rate Limiter with Retry-After support
// Used by middleware.ts for centralized per-IP rate limiting.
// Edge Runtime compatible (no setInterval, no Node.js APIs).
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;    // time window in ms
  maxRequests: number; // max requests per window
}

/**
 * Check rate limit for a key. Returns allowed:true or allowed:false with retryAfter seconds.
 * Lazily cleans up expired entries on each call.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/** Remove expired entries to prevent unbounded memory growth */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/** Standard rate limit configurations */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  payment: { windowMs: 60_000, maxRequests: 10 },
  auth:    { windowMs: 60_000, maxRequests: 5 },
  public:  { windowMs: 60_000, maxRequests: 60 },
};
