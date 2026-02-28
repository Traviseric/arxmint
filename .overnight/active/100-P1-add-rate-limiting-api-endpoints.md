---
id: 100
title: "Add rate limiting to API endpoints"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_28
file: lib/rate-limit.ts
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: sequential
context_group: api_security
group_reason: "API security layer: rate-limit, validation (101), logging (102), value-caps (103) all modify the same API routes"
---

# Add rate limiting to API endpoints

**Priority:** P1
**Source:** OVERNIGHT_TASKS.md ID 28 — Production Readiness Gate
**Location:** new `lib/rate-limit.ts`, update `middleware.ts`

## Problem

ArxMint's payment, auth, and agent endpoints have no rate limiting. Without it:
- Payment endpoints (`/api/l402/*`, `/api/payment/*`, `/api/agent/*`) are vulnerable to invoice flooding and API abuse
- Auth endpoints (`/api/auth/*`) are open to brute-force credential attacks
- The system has no protection against DoS via request flooding

This is a production blocker before the Longmont pilot accepts real money.

**Required rate limits (from OVERNIGHT_TASKS.md):**
- Payment endpoints: 10 req/min per IP
- Auth endpoints: 5 req/min per IP (brute-force protection)
- Public endpoints: 60 req/min per IP
- Response: HTTP 429 with `Retry-After` header

## How to Fix

### Step 1: Create `lib/rate-limit.ts`

Implement an in-memory rate limiter (no Redis needed for pilot scale):

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;   // time window in ms
  maxRequests: number; // max requests per window
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
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

// Cleanup expired entries periodically (call on a timer or lazily)
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export const RATE_LIMITS = {
  payment: { windowMs: 60_000, maxRequests: 10 },
  auth: { windowMs: 60_000, maxRequests: 5 },
  public: { windowMs: 60_000, maxRequests: 60 },
};
```

### Step 2: Add rate limiting to `middleware.ts`

In the existing middleware, add rate limit checks before route protection:

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// In the middleware function, before route protection:
const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
const pathname = request.nextUrl.pathname;

let rateConfig = RATE_LIMITS.public;
if (pathname.startsWith('/api/l402') || pathname.startsWith('/api/payment') || pathname.startsWith('/api/agent') || pathname.startsWith('/api/settlement')) {
  rateConfig = RATE_LIMITS.payment;
} else if (pathname.startsWith('/api/auth')) {
  rateConfig = RATE_LIMITS.auth;
}

const rateLimitKey = `${ip}:${pathname.startsWith('/api/auth') ? 'auth' : pathname.startsWith('/api/payment') ? 'payment' : 'public'}`;
const { allowed, retryAfter } = checkRateLimit(rateLimitKey, rateConfig);

if (!allowed) {
  return new NextResponse('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': String(retryAfter ?? 60),
      'Content-Type': 'text/plain',
    },
  });
}
```

### Step 3: Add the rate-limit store cleanup

Add a route or startup call to periodically clean the in-memory store to prevent unbounded growth. A simple option: call `cleanupExpiredEntries()` at the start of each rate limit check.

## Acceptance Criteria

- [ ] `lib/rate-limit.ts` created with `checkRateLimit()` and `RATE_LIMITS` config
- [ ] Payment endpoints (`/api/l402/*`, `/api/payment/*`, `/api/agent/*`, `/api/settlement/*`) limited to 10 req/min per IP
- [ ] Auth endpoints (`/api/auth/*`) limited to 5 req/min per IP
- [ ] Public endpoints limited to 60 req/min per IP
- [ ] Rate-limited responses return HTTP 429 with `Retry-After` header
- [ ] In-memory store has cleanup to prevent unbounded growth
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 28. In-memory rate limiter is appropriate for pilot scale (single-host Docker deployment). When moving to multi-instance, replace with Redis-backed rate limiter. The store Map is module-level and persists across requests in a single Next.js worker process._
