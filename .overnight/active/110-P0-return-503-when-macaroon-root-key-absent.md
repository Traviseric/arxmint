---
id: 110
title: "Return 503 when MACAROON_ROOT_KEY is absent instead of issuing unsigned macaroons"
priority: P0
severity: high
status: completed
source: security_audit
file: app/api/l402/route.ts
line: 28
created: "2026-02-28T00:00:00Z"
cwe: CWE-347
execution_hint: sequential
context_group: auth_security
group_reason: "AUTH SECURITY group — same domain as tasks 107, 108, 109."
---

# Return 503 When MACAROON_ROOT_KEY Absent

**Priority:** P0 (high)
**Source:** security_audit
**Location:** app/api/l402/route.ts:28
**CWE:** CWE-347 — Improper Verification of Cryptographic Signature

## Problem

When `MACAROON_ROOT_KEY` is not configured, the L402 route logs a FATAL error but **continues to serve requests**. It falls back to issuing unsigned base64 macaroons. This makes every L402 token forgeable: an attacker can craft any macaroon payload, base64-encode it, and reuse it indefinitely to access gated resources. The `verifyMacaroon` function returns `null` when `MACAROON_ROOT_KEY` is absent, causing the verification check to be skipped entirely.

**Code with issue:**
```typescript
const MACAROON_ROOT_KEY = process.env.MACAROON_ROOT_KEY;
if (!MACAROON_ROOT_KEY) {
  console.error(
    "[ArxMint] FATAL: MACAROON_ROOT_KEY is not set. " +
      "L402 macaroon signing is disabled — tokens are unsigned and forgeable. " +
      "Set MACAROON_ROOT_KEY in your environment (openssl rand -hex 32)."
  );
}
// ...later, falls back to unsigned base64 macaroons when MACAROON_ROOT_KEY is null
```

## How to Fix

**In production**, return a 503 Service Unavailable if `MACAROON_ROOT_KEY` is not set. Never issue unsigned macaroons in production:

```typescript
const MACAROON_ROOT_KEY = process.env.MACAROON_ROOT_KEY;

// Gate at the top of POST and GET handlers:
function requireMacaroonKey(): NextResponse | null {
  if (!MACAROON_ROOT_KEY) {
    if (process.env.NODE_ENV === 'production') {
      logger.error({ action: 'l402_misconfigured' }, 'MACAROON_ROOT_KEY not set in production');
      return NextResponse.json(
        { error: 'Service temporarily unavailable — payment system misconfigured' },
        { status: 503 }
      );
    }
    // Development-only: log and allow unsigned macaroons with explicit warning
    console.warn('[ArxMint] DEV: MACAROON_ROOT_KEY not set. Using unsigned macaroons (development only).');
  }
  return null;
}
```

Call `requireMacaroonKey()` at the top of each handler function and return early if it returns a response.

Also add `MACAROON_ROOT_KEY` to `lib/env-check.ts` `validateRequiredEnv()` as a required variable so startup validation catches this before requests arrive.

## Acceptance Criteria

- [ ] In `NODE_ENV=production`, requests to `/api/l402` return 503 when `MACAROON_ROOT_KEY` is not set
- [ ] In development, unsigned macaroons are still allowed with an explicit console warning
- [ ] `lib/env-check.ts` `validateRequiredEnv()` includes `MACAROON_ROOT_KEY` in its required vars check
- [ ] No regressions on existing L402 tests (they set the env var)
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-347 — Improper Verification of Cryptographic Signature. This is a P0 deployment blocker. The current fallback to unsigned macaroons completely defeats the L402 payment gating._
