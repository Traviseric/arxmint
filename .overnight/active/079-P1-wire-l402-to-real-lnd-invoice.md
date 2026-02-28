---
id: 79
title: "Wire L402 endpoint to real LND invoice generation"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_7
file: app/api/l402/route.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: lightning_payments
group_reason: "Same lightning stack as task 082. E2E payment tests (task 091) depend on this."
---

# Wire L402 endpoint to real LND invoice generation

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 7
**Location:** app/api/l402/route.ts, lib/lightning-agent.ts

## Problem

The current `app/api/l402/route.ts` is demo-only — it generates fake macaroons and accepts any token as valid. Real L402 requires:
1. Generating a real LND invoice via gRPC
2. Client pays the invoice and gets the preimage
3. Server validates macaroon + preimage before granting access

Currently any request with a fake `Authorization: L402 fake:fake` header bypasses the paywall entirely.

## How to Fix

1. **Update `app/api/l402/route.ts`** — replace demo mode with real LND integration:

```typescript
// When no Authorization header: generate real LND invoice
const { getLightningClient } = await import('@/lib/lightning-agent');
const client = getLightningClient();
const invoice = await client.addInvoice({
  value: PRICE_SATS,
  memo: `ArxMint L402 — ${resourcePath}`,
  expiry: 3600
});

// Return 402 with real payment request
return new Response(null, {
  status: 402,
  headers: {
    'WWW-Authenticate': `L402 macaroon="${macaroon}", invoice="${invoice.paymentRequest}"`
  }
});
```

2. **Update token validation** — verify the preimage against the actual payment hash from LND:

```typescript
// On retry with Authorization: L402 <macaroon>:<preimage>
const paymentHash = extractHashFromMacaroon(macaroon);
const isSettled = await client.lookupInvoice(paymentHash);
if (!isSettled) {
  return NextResponse.json({ error: 'Invoice not paid' }, { status: 402 });
}
```

3. **Add LND connection config** to `.env.example`:
   - `LND_GRPC_HOST=localhost:10009`
   - `LND_MACAROON_HEX=<admin-macaroon-hex>`
   - `LND_TLS_CERT_BASE64=<tls-cert-base64>`

4. **Update `lib/lightning-agent.ts`** to expose `addInvoice()` and `lookupInvoice()` methods using the LNC-Web or gRPC connection.

## Acceptance Criteria

- [ ] `GET /api/l402/resource` returns real 402 with valid LND invoice
- [ ] Paying the invoice and retrying with preimage grants access
- [ ] Invalid or unpaid preimage returns 402
- [ ] LND connection config documented in `.env.example`
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 7. Requires running LND node — use `npm run setup:full` for the Docker stack or configure env vars to point at existing node._
