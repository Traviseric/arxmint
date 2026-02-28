---
id: 108
title: "Require authentication for POST /api/settlement"
priority: P0
severity: high
status: completed
source: security_audit
file: app/api/settlement/route.ts
line: 104
created: "2026-02-28T00:00:00Z"
cwe: CWE-306
execution_hint: sequential
context_group: auth_security
group_reason: "AUTH SECURITY group — same domain as tasks 107, 109, 110."
---

# Require Authentication for POST /api/settlement

**Priority:** P0 (high)
**Source:** security_audit
**Location:** app/api/settlement/route.ts:104
**CWE:** CWE-306 — Missing Authentication for Critical Function

## Problem

POST /api/settlement requires no authentication. Any unauthenticated caller can submit a settlement request with arbitrary `saleId`, `saleAmount`, `referralFeePct`, and recipient addresses. While an attacker cannot steal funds directly (a real Lightning payment must be made to trigger ecash minting), they can:
1. Create bogus settlement records in the DB (polluting the transaction ledger)
2. Spam/exhaust Cashu mint quote creation (DoS the mint)
3. Enumerate valid saleIds via idempotency responses (information disclosure)
4. Trigger Fedimint invite lookups with attacker-controlled invite codes

**Code with issue:**
```typescript
export async function POST(request: NextRequest) {
  // Auth is optional here: marketplace tokens accepted via getCallerFromRequest
  // but we don't block unauthenticated calls for the settlement endpoint
  // (called by server-to-server from Teneo Marketplace).
```

The comment reveals the intent (server-to-server), but the implementation allows unauthenticated access.

## How to Fix

Use one of these two authentication modes for server-to-server calls:

**Option A — Shared secret header (for Teneo Marketplace server-to-server):**
```typescript
export async function POST(request: NextRequest) {
  // Server-to-server auth: verify X-Marketplace-Secret header
  const marketplaceSecret = request.headers.get("X-Marketplace-Secret");
  const expectedSecret = process.env.MARKETPLACE_SHARED_SECRET;

  // Also accept valid arxmint session tokens (for direct API calls)
  const caller = getCallerFromRequest(request);

  if (!caller && (!expectedSecret || marketplaceSecret !== expectedSecret)) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  // ... rest of handler
```

**Option B — Require valid arxmint session:**
```typescript
const caller = requireAuth(request);
if (!caller) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Add `MARKETPLACE_SHARED_SECRET` to `.env.example` with documentation about server-to-server auth.
Also update `lib/auth-middleware.ts` `getCallerFromRequest` to handle the `X-Marketplace-Secret` header if Option A is chosen.

## Acceptance Criteria

- [ ] Unauthenticated POST /api/settlement returns 401
- [ ] Teneo Marketplace can still call the endpoint with proper auth (shared secret or session token)
- [ ] `MARKETPLACE_SHARED_SECRET` documented in `.env.example`
- [ ] GET /api/settlement (list by saleId) also requires auth (included in task 111)
- [ ] No regressions on settlement tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-306 — Missing Authentication for Critical Function. This is a P0 deployment blocker._
