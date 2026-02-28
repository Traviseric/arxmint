---
id: 115
title: "Add authentication or minimal response to GET /api/payment/status/:id"
priority: P2
severity: low
status: completed
source: security_audit
file: app/api/payment/status/[id]/route.ts
line: 14
created: "2026-02-28T00:00:00Z"
cwe: CWE-284
execution_hint: sequential
context_group: api_auth
group_reason: "API AUTH group — same domain as tasks 111, 112."
---

# Add Authentication to Payment Status Endpoint

**Priority:** P2 (low — sensitive data exposure)
**Source:** security_audit
**Location:** app/api/payment/status/[id]/route.ts:14
**CWE:** CWE-284 — Improper Access Control

## Problem

GET /api/payment/status/:id requires no authentication and returns the full `PaymentChallenge` object including Lightning invoice and macaroon data. Challenge IDs for L402 challenges are particularly sensitive — they are the macaroon itself, making challenge IDs also verification keys.

An attacker who guesses or obtains a challenge ID can see the associated invoice and potentially the macaroon structure.

**Code with issue:**
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // No auth check — returns full PaymentChallenge to anyone
```

## How to Fix

Two approaches (the first is simpler and preferred for this P2 item):

**Option A — Minimal response without auth (preferred):**
Return only `status` and `expiresAt` without auth. Only return full challenge details if the caller is authenticated and owns the challenge.

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = _challenges.get(id);

  if (!entry) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  const caller = getCallerFromRequest(request);
  const isAuthenticated = !!caller;

  // Always return minimal status
  const minimalResponse = {
    status: entry.paidAt ? 'paid' : 'pending',
    expiresAt: entry.challenge.expiresAt,
  };

  // Return full details only to authenticated callers
  if (isAuthenticated) {
    return NextResponse.json({ ...minimalResponse, challenge: entry.challenge });
  }
  return NextResponse.json(minimalResponse);
}
```

**Option B — Require authentication:**
Fully gate behind auth if the marketplace integration always provides credentials.

## Acceptance Criteria

- [ ] Unauthenticated GET /api/payment/status/:id returns only `{ status, expiresAt }` (no invoice, no macaroon)
- [ ] Authenticated callers receive full challenge details
- [ ] Challenge IDs that don't exist return 404 to both authenticated and unauthenticated callers
- [ ] No regressions on marketplace integration tests
- [ ] `npm run build` passes

## Notes

_Generated from security_audit finding. CWE-284. P2 — lower urgency than P0/P1 auth fixes but should be addressed before production. The minimal response approach (Option A) avoids breaking marketplace callers that may not have session tokens._
