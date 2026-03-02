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

/**
 * Composite limiter for authenticated APIs:
 * - always applies an IP bucket
 * - additionally applies a principal bucket when a user identity is present
 */
export function checkPrincipalAndIpRateLimit(
  scope: string,
  ip: string,
  principal: string | null | undefined,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const ipResult = checkRateLimit(`rl:${scope}:ip:${ip}`, config);
  if (!ipResult.allowed) return ipResult;

  if (!principal) return ipResult;
  const principalResult = checkRateLimit(
    `rl:${scope}:principal:${principal}`,
    config
  );
  if (!principalResult.allowed) return principalResult;
  return principalResult;
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
  paymentWrite: { windowMs: 60_000, maxRequests: 8 },
  settlementWrite: { windowMs: 60_000, maxRequests: 6 },
};
