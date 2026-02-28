---
id: 111
title: "Add authentication to all unauthenticated read API endpoints"
priority: P1
severity: medium
status: completed
source: security_audit
file: app/api/community/route.ts, app/api/merchants/route.ts, app/api/transactions/route.ts, app/api/settlement/[id]/route.ts
line: 14
created: "2026-02-28T00:00:00Z"
cwe: CWE-284
execution_hint: sequential
context_group: api_auth
group_reason: "API AUTH group — same fix pattern across 4 read endpoints. Sequential because they share auth-middleware import."
---

# Add Authentication to All Unauthenticated Read API Endpoints

**Priority:** P1 (medium)
**Source:** security_audit (merged finding: 4 endpoints)
**CWE:** CWE-284 — Improper Access Control

## Problem

Four read-only API endpoints return potentially sensitive data without any authentication:

**1. GET /api/community** (`app/api/community/route.ts:14`)
Returns all community deployment configs including network settings, agent config, and federation invite structure to any unauthenticated caller. Enables enumeration of all communities.

**2. GET /api/merchants** (`app/api/merchants/route.ts`)
Returns merchant payment addresses (Cashu, Lightning) to any unauthenticated caller.

**3. GET /api/transactions** (`app/api/transactions/route.ts`)
Returns full transaction history including amounts, backends, and timestamps. Financial records should never be accessible without authentication.

**4. GET /api/settlement/:id** (`app/api/settlement/[id]/route.ts:39`)
Returns full settlement details including recipient Cashu address, Fedimint invite codes, Lightning invoices, and mint URLs. The `notes` field leaks the full internal JSON blob.

**Code example (community route):**
```typescript
export async function GET() {
  try {
    const communities = await db.community.findMany({
      select: { id: true, name: true, prompt: true, config: true, createdAt: true },
    });
    // No auth check — returns all communities to any caller
```

## How to Fix

Add `getCallerFromRequest()` or `requireAuth()` to all four GET handlers. For endpoints that may have legitimate public use (community directory), consider tiered access:

```typescript
// app/api/transactions/route.ts — must be fully authenticated
export async function GET(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  // Scope to caller's own transactions
  const transactions = await db.transaction.findMany({
    where: { userId: caller.pubkey },
    ...
  });
```

```typescript
// app/api/settlement/[id]/route.ts — authenticated, strip sensitive fields for non-owners
export async function GET(request: NextRequest, ...) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  // Return settlement data; strip recipientFedimintInvite from response
  const { notes, ...safeFields } = tx;
  return NextResponse.json({ ...safeFields, notes: undefined });
```

For GET /api/community, consider: unauthenticated callers get only `id` and `name`; authenticated callers get full config.

For GET /api/merchants, consider: unauthenticated callers get public merchant info (name, category); authenticated callers or the merchant owner get payment addresses.

## Acceptance Criteria

- [ ] GET /api/transactions requires authentication; returns only the caller's own transactions
- [ ] GET /api/settlement/:id requires authentication; sensitive fields (recipientFedimintInvite, full notes blob) not returned
- [ ] GET /api/settlement?saleId=... also requires authentication
- [ ] GET /api/community and GET /api/merchants have at minimum authentication check (full gating acceptable for pilot)
- [ ] Unauthenticated requests return 401, not 403
- [ ] No regressions on existing tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit — merged finding (4 endpoints with CWE-284). These are financial data exposure risks for a Bitcoin wallet application. P1 deployment concern before real money is accepted._
