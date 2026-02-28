---
id: 107
title: "Fix L402 auth bypass in agent route"
priority: P0
severity: high
status: completed
source: security_audit
file: app/api/agent/route.ts
line: 71
created: "2026-02-28T00:00:00Z"
cwe: CWE-287
execution_hint: sequential
context_group: auth_security
group_reason: "AUTH SECURITY group — fixes authentication bypass/misconfiguration. Same domain as tasks 108, 109, 110."
---

# Fix L402 Auth Bypass in Agent Route

**Priority:** P0 (high)
**Source:** security_audit
**Location:** app/api/agent/route.ts:71
**CWE:** CWE-287 — Improper Authentication

## Problem

L402 payment bypass: the agent API route accepts ANY L402 Authorization header as valid without cryptographic verification. It relies entirely on Aperture proxy being configured upstream. If Aperture is absent or misconfigured, a client can send `Authorization: L402 anything:anything` and gain free access to all gated services (privacy-audit, cycle-signals, compute, data).

**Code with issue:**
```typescript
// L402: In production, Aperture handles verification upstream.
// If the L402 header reaches us, it's already been validated by the proxy.
if (method === "l402") {
  return { authenticated: true, method: "l402" };
}
```

This trusts the L402 header blindly — any string starting with "L402 " is accepted without verifying the macaroon signature or preimage validity.

## How to Fix

Two acceptable approaches (choose one based on deployment model):

**Option A — Shared secret proxy header (simpler):**
Add a middleware check: if request has `Authorization: L402 ...`, also require `X-Aperture-Verified: <APERTURE_SHARED_SECRET>` header. Aperture sets this header after successful verification. The route checks both.

```typescript
if (method === "l402") {
  const apertureToken = request.headers.get("X-Aperture-Verified");
  const expected = process.env.APERTURE_SHARED_SECRET;
  if (!expected || apertureToken !== expected) {
    // L402 header present but not validated by proxy
    return buildL402Response(serviceName);
  }
  return { authenticated: true, method: "l402" };
}
```

**Option B — Cryptographic macaroon+preimage verification:**
Parse the L402 header (`<macaroon>:<preimage>`), verify the macaroon HMAC using `MACAROON_ROOT_KEY`, and verify the preimage matches the payment hash in the macaroon caveats. This is the correct approach if Aperture is not used.

Add `APERTURE_SHARED_SECRET` (or equivalent) to `.env.example` with a comment explaining the verification model.

## Acceptance Criteria

- [ ] L402 header is not blindly trusted — either proxy verification OR crypto verification is performed
- [ ] Requests without a valid verified L402 token receive a proper 402 response with payment challenge
- [ ] `SKIP_PAYMENT_VERIFY=true` bypass still works in development only (task 112 addresses the prod guard)
- [ ] Cashu NUT-24 path is unaffected
- [ ] No regressions on existing tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-287 — Improper Authentication. This is a P0 deployment blocker for a financial application._
