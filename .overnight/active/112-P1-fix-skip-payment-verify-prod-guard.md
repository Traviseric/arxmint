---
id: 112
title: "Add NODE_ENV production guard to SKIP_PAYMENT_VERIFY bypass"
priority: P1
severity: medium
status: completed
source: security_audit
file: app/api/agent/route.ts
line: 55
created: "2026-02-28T00:00:00Z"
cwe: CWE-489
execution_hint: sequential
context_group: api_auth
group_reason: "API AUTH group — same domain as task 111."
---

# Add NODE_ENV Production Guard to SKIP_PAYMENT_VERIFY Bypass

**Priority:** P1 (medium)
**Source:** security_audit
**Location:** app/api/agent/route.ts:55
**CWE:** CWE-489 — Active Debug Code

## Problem

The `SKIP_PAYMENT_VERIFY` bypass in the agent route does NOT check `NODE_ENV === 'production'`. If this env var is accidentally set on a production server, all payment checks are bypassed silently (only a `console.warn` is emitted). The L402 route does check for production (and ignores the flag), but the agent route does not, creating an inconsistency.

**Code with issue:**
```typescript
if (process.env.SKIP_PAYMENT_VERIFY === "true") {
  console.warn(
    '[ArxMint] SKIP_PAYMENT_VERIFY=true — skipping payment verification. ' +
    'Do not use this in production.'
  );
  return { authenticated: true, method: "skip" };
}
```

This bypass is active in all environments when the env var is set, including production.

## How to Fix

Add an explicit production guard. If `SKIP_PAYMENT_VERIFY` is set AND `NODE_ENV === 'production'`, log a FATAL error and do NOT bypass payment:

```typescript
if (process.env.SKIP_PAYMENT_VERIFY === "true") {
  if (process.env.NODE_ENV === "production") {
    // FATAL: Never bypass payment verification in production
    logger.error(
      { action: "payment_bypass_blocked" },
      "SKIP_PAYMENT_VERIFY=true is not allowed in production — ignoring."
    );
    // Fall through to normal payment verification
  } else {
    // Development/test only
    console.warn(
      "[ArxMint] DEV: SKIP_PAYMENT_VERIFY=true — skipping payment verification."
    );
    return { authenticated: true, method: "skip" };
  }
}
```

## Acceptance Criteria

- [ ] `SKIP_PAYMENT_VERIFY=true` is ignored in `NODE_ENV=production` — a FATAL log is emitted and payment verification proceeds normally
- [ ] `SKIP_PAYMENT_VERIFY=true` still works in `NODE_ENV=development` and `NODE_ENV=test`
- [ ] Logger (not console.warn) is used for the production warning
- [ ] Consistent with how the L402 route handles the same flag
- [ ] No regressions on existing tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-489 — Active Debug Code. Simple one-file fix. A misconfigured production env could accidentally expose all agent endpoints for free._
