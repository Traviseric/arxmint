---
id: 102
title: "Add structured logging — JSON logs for payment ops, auth events, rate limits"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_31
file: lib/logger.ts
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: long_running
context_group: api_security
group_reason: "API security layer: logger used by rate-limit (100), validation (101), value-caps (103) and all API routes"
---

# Add structured logging — JSON logs for payment ops, auth events, rate limits

**Priority:** P1
**Source:** OVERNIGHT_TASKS.md ID 31 — Production Readiness Gate
**Location:** new `lib/logger.ts`, update API routes

## Problem

ArxMint uses `console.log/warn/error` scattered across 21 production files (40+ statements). This provides no structure for log aggregation, no request correlation, no audit trail for payment operations, and leaks internal state in uncontrolled ways.

For the Longmont pilot (real money), we need:
- Structured JSON logs parseable by log collectors (Docker logs, Loki, etc.)
- Payment operation audit trail (amount, backend, status — NO secrets)
- Auth event logging (login, failure, reauth — with IP, NOT passwords)
- Rate limit hit logging
- Request IDs for correlation across log lines

**CRITICAL security constraint:** NEVER log Cashu proof secrets, `C` values, raw tokens, or macaroon preimages. Log amounts and metadata only.

## How to Fix

### Step 1: Create `lib/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta: Omit<LogEntry, 'timestamp' | 'level' | 'message'> = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // Write to stdout for Docker log aggregation
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
    log('debug', message, meta),
  info: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
    log('info', message, meta),
  warn: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
    log('warn', message, meta),
  error: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
    log('error', message, meta),

  // Payment operation log — sanitized, no secrets
  payment: (action: string, meta: { amount: number; backend: string; status: string; requestId?: string }) =>
    log('info', `payment.${action}`, { action: `payment.${action}`, ...meta }),

  // Auth event log — no passwords ever
  auth: (action: string, meta: { ip?: string; pubkey?: string; success: boolean; reason?: string }) =>
    log('info', `auth.${action}`, { action: `auth.${action}`, ...meta }),

  // Rate limit log
  rateLimit: (ip: string, endpoint: string, retryAfter: number) =>
    log('warn', 'rate_limit_exceeded', { action: 'rate_limit', ip, endpoint, retryAfter }),
};
```

### Step 2: Update API routes to use logger

Replace ad-hoc console calls in payment and auth routes:

```typescript
// In app/api/l402/route.ts:
import { logger } from '@/lib/logger';

// Replace: console.log('L402 challenge created')
logger.payment('challenge_created', { amount: sats, backend: 'lightning', status: 'pending', requestId });

// In app/api/auth/route.ts:
logger.auth('login', { ip: clientIp, pubkey: pubkeyPrefix, success: true });
logger.auth('login_failed', { ip: clientIp, success: false, reason: 'invalid_signature' });
```

**Key routes to update:**
- `app/api/l402/route.ts` — log invoice creation, settlement, access grants
- `app/api/payment/route.ts` — log challenge creation, payment verification
- `app/api/auth/route.ts` — log login, logout, failures
- `app/api/settlement/route.ts` — log settlement requests, outcomes
- `middleware.ts` — log rate limit hits (call `logger.rateLimit()` when 429)

### Step 3: Generate request IDs

In `middleware.ts`, generate a request ID and add it to response headers for correlation:
```typescript
const requestId = crypto.randomUUID();
// Pass via header to API routes for log correlation
```

## Acceptance Criteria

- [ ] `lib/logger.ts` created with `logger.info/warn/error/debug/payment/auth/rateLimit` methods
- [ ] Logs are JSON-formatted, written to `process.stdout`
- [ ] Payment operations logged: challenge creation, verification, settlement (amount + backend + status only)
- [ ] Auth events logged: login, logout, failures (IP + pubkey prefix, never full key or password)
- [ ] Rate limit hits logged
- [ ] ZERO instances of logging Cashu proof secrets, C values, raw tokens, or macaroon preimages
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 31. The structured logger replaces scattered console calls. SDK-level console.warn calls in lib/ (SDK fallbacks, WASM failures) are acceptable and don't need to be replaced — only API route handlers and auth logic need the structured logger._
