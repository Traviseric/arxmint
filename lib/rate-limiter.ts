// ============================================================
// ArxMint — In-Memory Rate Limiter
// ============================================================

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();

/**
 * Check whether a key is within its rate limit.
 * Returns true if the request is allowed, false if it should be rejected.
 *
 * @param key        - Unique key for this rate-limit bucket (e.g. "auth:1.2.3.4")
 * @param maxRequests - Maximum requests allowed per window
 * @param windowMs   - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now > existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed — first request in new window
  }

  if (existing.count >= maxRequests) {
    return false; // rate limited
  }

  existing.count++;
  return true; // allowed
}

// Prune expired windows every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of windows) {
    if (now > window.resetAt) windows.delete(key);
  }
}, 5 * 60 * 1000);
