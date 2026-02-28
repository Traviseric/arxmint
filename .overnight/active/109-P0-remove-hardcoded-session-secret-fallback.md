---
id: 109
title: "Remove hardcoded session secret fallback in auth-middleware"
priority: P0
severity: high
status: completed
source: security_audit
file: lib/auth-middleware.ts
line: 26
created: "2026-02-28T00:00:00Z"
cwe: CWE-321
execution_hint: sequential
context_group: auth_security
group_reason: "AUTH SECURITY group — same domain as tasks 107, 108, 110."
---

# Remove Hardcoded Session Secret Fallback

**Priority:** P0 (high)
**Source:** security_audit
**Location:** lib/auth-middleware.ts:26
**CWE:** CWE-321 — Use of Hard-coded Cryptographic Key

## Problem

Both `lib/auth-middleware.ts` and `middleware.ts` fall back to the hardcoded string `"dev-secret-change-in-production"` if `NEXTAUTH_SECRET` and `AUTH_SECRET` are not set. If a production deployment is misconfigured and these env vars are missing, all session tokens will be signed with this known-public key. An attacker who knows this default (it's in the public source code) can forge valid session tokens for any Nostr pubkey.

**Code with issue:**
```typescript
function getSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-secret-change-in-production"  // ← HARDCODED PUBLIC KEY
  );
}

function getSharedSecret(): string {
  return (
    process.env.AUTH_SHARED_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-secret-change-in-production"  // ← HARDCODED PUBLIC KEY
  );
}
```

Note: `lib/env-check.ts` (added in task 027) already validates `NEXTAUTH_SECRET` at startup. However, the fallback in `auth-middleware.ts` undermines it — if the startup validation is somehow bypassed or if the auth-middleware is used in Edge context where env-check doesn't run, the fallback makes the application silently insecure instead of failing safely.

## How to Fix

Remove the hardcoded fallback strings. Throw a hard error if the secret is not configured:

```typescript
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[ArxMint] FATAL: NEXTAUTH_SECRET is not set. " +
      "Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}

function getSharedSecret(): string {
  const secret =
    process.env.AUTH_SHARED_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "[ArxMint] FATAL: AUTH_SHARED_SECRET or NEXTAUTH_SECRET is not set."
    );
  }
  return secret;
}
```

Also check `middleware.ts` for a similar fallback and apply the same fix there.

In `NODE_ENV === 'development'` only, you may allow a fallback to a randomly-generated ephemeral key (so dev works without env setup), but never a known hardcoded string.

## Acceptance Criteria

- [ ] `getSecret()` and `getSharedSecret()` throw a hard error if no secret env var is configured (in production)
- [ ] No hardcoded secret strings remain in `lib/auth-middleware.ts` or `middleware.ts`
- [ ] Development still works (optional: generate random ephemeral key in dev mode)
- [ ] `.env.example` already documents `NEXTAUTH_SECRET` — verify it does
- [ ] `npm run build` passes
- [ ] Existing auth tests pass (they set the env var)

## Notes

_Generated from security_audit finding. CWE-321 — Use of Hard-coded Cryptographic Key. This is a P0 deployment blocker. The hardcoded fallback completely defeats the startup env validation that was added in task 027._
