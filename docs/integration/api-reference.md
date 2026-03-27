# ArxMint API Reference

Base URL: `https://arxmint.com/api` (or `http://localhost:3000/api` for local dev)

## Authentication Methods

| Method | Header / Mechanism | Used By |
|--------|-------------------|---------|
| Nostr NIP-98 session | `arxmint_session` httpOnly cookie (7-day TTL) | Browser clients |
| Merchant API key | `Authorization: Bearer arx_live_*` / `arx_test_*` / `arx_pub_*` | Server-to-server, webhooks |
| Marketplace shared secret | `X-Marketplace-Secret` header | teneo-auth, ecosystem services |
| L402 token | `Authorization: L402 <macaroon>:<preimage>` | AI agents, programmatic access |
| Cashu NUT-24 token | `Authorization: Cashu <token>` | Ecash-native agents |

---

## Authentication

### POST /api/auth

Authenticate via Nostr NIP-98 signed event. Returns httpOnly session cookie.

**Request:**
```json
{
  "nostrEvent": {
    "kind": 27235,
    "pubkey": "hex_pubkey",
    "created_at": 1700000000,
    "tags": [["u", "https://arxmint.com/api/auth"], ["method", "POST"]],
    "sig": "hex_sig",
    "id": "hex_event_id"
  }
}
```

**Response:**
```json
{ "success": true, "pubkey": "hex_pubkey", "session": "pubkey.expiry.hmac_sig" }
```

### POST /api/auth/logout

Clear session cookie and remove server-side session.

**Response:** `{ "success": true }`

---

## Checkout

### POST /api/checkout

Create a Lightning invoice for a merchant payment session. Supports idempotency via `Idempotency-Key` header. Auto-links Nostr + Teneo identities when both auth contexts are present.

**Request:**
```json
{
  "merchantId": "seed-glacier",
  "amountSats": 1000,
  "memo": "Coffee order",
  "invoiceId": "inv_abc123",
  "shipping": {
    "email": "customer@example.com",
    "fullName": "Jane Smith",
    "street": "123 Main St",
    "city": "Fort Collins",
    "state": "CO",
    "zip": "80521"
  }
}
```

`shipping` and `invoiceId` are optional.

**Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "invoice": "lnbc10n1p3xyzabc...",
  "expiresAt": "2026-03-09T12:10:00Z",
  "demoMode": false,
  "merchantName": "Glacier Ice Cream",
  "amountSats": 1000
}
```

`demoMode: true` means the merchant has no live Lightning node — invoice is for testing only.

### GET /api/checkout/status/:sessionId

Poll checkout session status.

**Response:**
```json
{
  "id": "sess_abc123def456",
  "status": "pending",
  "amountSats": 1000,
  "createdAt": "2026-03-09T12:00:00Z",
  "expiresAt": "2026-03-09T12:10:00Z",
  "paidAt": null
}
```

Status values: `pending` | `paid` | `expired`

In demo mode, sessions auto-pay after 5 seconds.

### GET /api/checkout/status/:sessionId/stream

Server-Sent Events stream for real-time payment updates (polls every 3s, 15-minute timeout).

```bash
curl -N https://arxmint.com/api/checkout/status/sess_abc123/stream
# data: {"status":"pending"}
# data: {"status":"paid","paidAt":"2026-03-09T12:05:32Z"}
```

### POST /api/checkout/webhook

Internal webhook fired on payment completion. Triggers OpenBazaar fulfillment via HMAC-signed callback.

**Request:** `{ "sessionId": "sess_abc123" }`

---

## Invoices (SPINE-ARX-01)

Org-to-org B2B invoices with line items, state machine, and PDF generation.

### GET /api/invoices

List invoices for the authenticated org.

**Query params:**
- `direction` — `from` | `to` | `any`
- `orgId` — Filter by org
- `status` — `draft` | `sent` | `paid` | `void`

**Response:** `{ "invoices": [...], "count": 5 }`

### POST /api/invoices

Create a new invoice.

**Auth:** Session (Nostr) or X-Teneo-Auth

**Request:**
```json
{
  "fromOrgId": "org_abc",
  "toOrgId": "org_xyz",
  "currency": "BTC",
  "paymentRail": "lightning",
  "lineItems": [
    { "description": "Consulting — March", "quantity": 1, "unitPrice": 50000 }
  ],
  "dueDate": "2026-04-15",
  "notes": "Net 30",
  "metadata": {}
}
```

**Response:** `{ "invoice": { "id": "inv_abc", "status": "draft", ... } }`

### GET /api/invoices/:id

Retrieve invoice detail. Only accessible by org parties.

### PATCH /api/invoices/:id

Transition invoice state or edit draft fields.

**Request:**
```json
{ "action": "send" }
```

Actions: `send` (draft → sent), `void` (any → void). Draft invoices also accept field updates (`toOrgName`, `notes`, `lineItems`, `dueDate`).

### GET /api/invoices/:id/pdf

Download PDF invoice (A4, orange/black ArxMint theme).

**Response:** PDF binary with `Content-Disposition: attachment; filename="invoice-INV-xxx.pdf"`

---

## Escrow (SPINE-ARX-02)

Escrow contracts with manual, time-based, delivery-confirmed, or dispute-resolved release conditions.

### POST /api/escrow

Create escrow contract.

**Auth:** Session (Nostr)

**Request:**
```json
{
  "payeeId": "user_xyz",
  "amountSats": 50000,
  "releaseCondition": "manual",
  "releasesAt": null,
  "invoiceId": "inv_abc",
  "metadata": { "note": "Freelance milestone" }
}
```

Release conditions: `manual` | `time_based` | `delivery_confirmed` | `dispute_resolved`

### GET /api/escrow

List caller's escrows.

**Query params:**
- `role` — `payer` | `payee` | `any`
- `status` — `pending_funding` | `funded` | `released` | `disputed` | `resolved` | `voided`

**Response:** `{ "escrows": [...], "count": 3 }`

### GET /api/escrow/:id

Retrieve escrow with full event history. Only accessible by parties.

### POST /api/escrow/:id/fund

Fund escrow from a checkout payment session.

**Auth:** Payer only

**Request:** `{ "paymentSessionId": "sess_abc" }`

### POST /api/escrow/:id/release

Release funded escrow to payee.

**Request:** `{ "note": "Work approved" }`

### POST /api/escrow/:id/dispute

Raise or resolve dispute.

**Query:** `?action=dispute` (default) or `?action=resolve` (mediator)

**Request:** `{ "note": "Deliverable incomplete" }`

---

## Payouts (SPINE-ARX-03)

Automated merchant payout scheduling and execution.

### GET /api/payouts

List payout history.

**Query params:**
- `merchantId` — Required
- `limit` — Default 20
- `cursor` — Pagination cursor

**Response:** `{ "payouts": [{ "amountSats": "50000", ... }], "nextCursor": "...", "count": 12 }`

Note: `amountSats` is serialized as string (BigInt safe).

### GET /api/payouts/config

Read merchant payout configuration.

**Query:** `?merchantId=<id>`

### POST /api/payouts/config

Update payout configuration.

**Request:**
```json
{
  "merchantId": "merch_abc",
  "schedule": "weekly",
  "thresholdSats": 100000,
  "rail": "lightning",
  "destination": "lnbc...",
  "enabled": true
}
```

Schedules: `daily` | `weekly` | `on_threshold`
Rails: `lightning` | `ecash` | `onchain`

### POST /api/payouts/trigger

Manually trigger immediate payout.

**Request:** `{ "merchantId": "merch_abc", "amountSats": 50000 }`

### POST /api/cron/payouts

Vercel cron endpoint (runs daily at 02:00 UTC). Requires `Authorization: Bearer <CRON_SECRET>`.

---

## Merchants

### GET /api/merchants

List merchants in a community.

**Query params:**
- `communityId` — Filter by community
- `category` — `food-drink` | `retail` | `services` | etc.
- `status` — `live` | `pipeline` (default: `live`)
- `limit` — Default 50, max 200

**Response:**
```json
{
  "merchants": [
    {
      "id": "seed-glacier",
      "businessName": "The Ice Cream Parlor by Glacier",
      "location": "Fort Collins, CO",
      "category": "food-drink",
      "status": "live",
      "checkoutUrl": "https://arxmint.com/pay/seed-glacier"
    }
  ],
  "total": 15,
  "liveCount": 2,
  "pipelineCount": 13
}
```

### POST /api/merchants

Create merchant listing in a community.

**Request:**
```json
{
  "communityId": "comm_xyz",
  "name": "Sunrise Bakery",
  "description": "Fresh bread, Bitcoin accepted",
  "category": "food-drink",
  "cashuAddress": "...",
  "lightningAddress": "sunrise@pay.arxmint.cloud"
}
```

### POST /api/pledge

Submit a merchant pledge application (public, rate-limited to 5/hour).

**Request:**
```json
{
  "businessName": "Sunrise Bakery",
  "contactName": "Alex Rivera",
  "email": "alex@sunrisebakery.com",
  "location": "Denver, CO",
  "category": "food-drink",
  "website": "https://sunrisebakery.com",
  "reason": "We want to accept Bitcoin Lightning payments"
}
```

Triggers Telegram notification to admin channel on submission.

### GET /api/pledge

List merchants. Admins (Nostr pubkey in ADMIN_PUBKEYS) see pipeline merchants.

---

## Merchant Keys

### GET /api/merchant-keys

List API keys for a merchant (key previews only, not full keys).

**Query:** `?merchantId=<id>`

### POST /api/merchant-keys

Generate new API key.

**Request:** `{ "merchantId": "merch_abc", "scope": "live", "ttlSeconds": 86400 }`

Scopes: `live` | `test` | `pub` (read-only)

**Response:** `{ "key": "arx_live_abc123...", "scope": "live" }`

Key is shown once — store it securely.

### DELETE /api/merchant-keys

Revoke an API key.

**Query:** `?key=arx_live_abc123&merchantId=merch_abc`

---

## Admin

### GET /api/admin/pledges

List all pledge applications with status counts.

**Auth:** Admin Nostr pubkey or X-Marketplace-Secret

**Query:** `?status=pending` | `approved`

### POST /api/admin/pledges

Approve, reject, feature, or delete a pledge.

**Request:** `{ "id": "pledge_abc", "action": "approve" }`

Actions: `approve` | `reject` | `feature` | `delete`

### GET /api/admin/playbook

Download replication playbook as markdown or JSON.

**Auth:** Admin Nostr pubkey

**Query:** `?format=markdown|json&period=YYYY-MM-DD`

### GET /api/reports/monthly

Monthly grant report (KPI snapshot for OpenSats/HRF).

**Auth:** Admin Nostr pubkey

**Query:** `?period=YYYY-MM`

**Response:**
```json
{
  "merchants_active": 5,
  "transactions_count": 142,
  "transactions_volume_sats": 4500000,
  "communities_created": 2,
  "l402_payments": 38,
  "privacy_score_avg": 72,
  "budget_spent_usd": 1200,
  "source": "database"
}
```

---

## Identity Resolution

ArxMint's generic identity alias graph. Any project can link external identifiers to user roots via free-form namespaces. See [teneo-auth integration](./teneo-auth-integration.md) for ecosystem usage.

### POST /api/identity/create-root

Create minimal ArxMint user for ecosystem services (no pubkey/email/name required).

**Auth:** X-Marketplace-Secret (server-to-server only)

**Request:** `{ "linkedBy": "teneo-auth", "metadata": {} }`

**Response (201):** `{ "ok": true, "id": "user_abc", "createdAt": "..." }`

### POST /api/identity/link

Link an external ID to an ArxMint user root.

**Auth:** Session, Bearer JWT, or X-Marketplace-Secret

**Request:**
```json
{
  "rootId": "user_abc",
  "namespace": "aos",
  "externalId": "aos_user_123",
  "metadata": { "source": "signup" }
}
```

Namespace: lowercase alphanumeric, hyphens, underscores (max 64 chars).

**Response (201 new / 200 idempotent):** `{ "ok": true, "alias": {...}, "created": true }`

Returns 409 if the external ID is already linked to a different root.

### GET /api/identity/resolve

Resolve external ID to root identity and all aliases.

**Auth:** Session, Bearer JWT, or X-Marketplace-Secret

**Query:** `?id=<externalId>&namespace=<ns>` or `?rootId=<rootId>`

**Response:**
```json
{
  "ok": true,
  "rootId": "user_abc",
  "aliases": [
    { "namespace": "aos", "externalId": "aos_user_123", "linkedBy": "teneo-auth", "createdAt": "..." }
  ]
}
```

### DELETE /api/identity/unlink

Remove an identity alias link.

**Auth:** Session, Bearer JWT, or X-Marketplace-Secret

**Request:** `{ "namespace": "aos", "externalId": "aos_user_123" }`

---

## Payments

### POST /api/payment

Create payment challenge (L402 or Cashu).

**Request:**
```json
{
  "amount": 1000,
  "type": "l402",
  "resourceId": "agent-privacy-audit"
}
```

Type: `l402` | `cashu` | `auto` (default)

### POST /api/payment/verify

Verify L402 token or Cashu ecash token.

**Request (L402):**
```json
{ "type": "l402", "macaroon": "...", "preimage": "...", "challengeId": "..." }
```

**Request (Cashu):**
```json
{ "type": "cashu", "token": "cashuA...", "mintUrl": "...", "expectedAmount": 1000 }
```

### GET /api/payment/status/:id

Poll payment challenge status.

**Response:** `{ "status": "pending" | "paid" | "expired", "expiresAt": "...", "paidAt": null }`

### GET /api/v1/payments

Paginated payment history (v1 stable API).

**Auth:** Session or `arx_live_*` API key

**Query:** `?status=pending|paid|expired|failed|refunded&limit=50&cursor=<base64>&merchant_id=<id>`

**Response:** `{ "payments": [...], "nextCursor": "...", "total": 142 }`

---

## Settlement

### POST /api/settlement

Initiate Cashu or Fedimint settlement for referral fees. Idempotent by `saleId`.

**Auth:** Session or X-Marketplace-Secret

**Request:**
```json
{
  "saleAmount": 10000,
  "referralFeePct": 5,
  "recipientCashuAddress": "cashuA...",
  "saleId": "sale_abc",
  "communityId": "comm_xyz"
}
```

### GET /api/settlement/:id

Check settlement status.

**Response:** `{ "settlementId": "...", "saleId": "...", "feeAmount": 500, "method": "cashu", "status": "completed" }`

---

## Agent Commerce (L402 / NUT-24)

### GET /api/agent

AI agent data endpoints behind L402 + NUT-24 paywalls.

**Query:** `?service=privacy-audit|cycle-signals|compute|data|verify-payment`

**Unauthenticated response:**
```
HTTP/1.1 402 Payment Required
WWW-Authenticate: L402 macaroon="...", invoice="lnbc..."
```

**Authenticated response:**
```json
{ "data": "privacy-audit", "result": { "score": 72, "layers": [...], "recommendations": [...] } }
```

| Service | Price | Description |
|---------|-------|-------------|
| privacy-audit | 200 sats | Privacy score + layer breakdown |
| cycle-signals | 50 sats | MVRV/NUPL + trade signal |
| compute | 500 sats | Compute job (placeholder) |
| data | 50-100 sats | Dataset catalog |
| verify-payment | 0 sats | Payment verification for downstream services |

### GET /api/l402

Example L402-gated endpoint. Issues HMAC macaroon + BOLT11 invoice on 402 response.

Requires `MACAROON_ROOT_KEY` env var. Returns 503 if not configured.

---

## Webhooks

### POST /api/webhooks

Register webhook endpoint (HTTPS required, max 10 per merchant).

**Auth:** `arx_live_*` or `arx_test_*` API key

**Request:** `{ "url": "https://example.com/hook", "events": ["payment.completed"] }`

**Response:** `{ "id": "wh_abc", "secret": "whsec_abc123", "created_at": "..." }`

Secret is shown once. Use it to verify HMAC-SHA256 signatures on incoming webhooks.

Events: `payment.completed` | `payment.expired` | `payment.failed`

### GET /api/webhooks

List registered webhooks (secret omitted).

### DELETE /api/webhooks/:id

Unregister a webhook.

### POST /api/v1/webhooks

V1 webhook API (alternative path). Same functionality. `arx_pub_*` keys get read-only access.

---

## Community

### POST /api/community

Generate deployment config from natural language prompt. Min 10 characters.

**Request:**
```json
{
  "prompt": "Create a private Bitcoin community for 20 Longmont Bitcoiners with chat, private payments, and AI agents",
  "network": "testnet"
}
```

**Response:** `{ "success": true, "deployment": {...}, "apertureConfig": {...}, "id": "comm_xyz" }`

### GET /api/community

List communities owned by the authenticated user.

### GET /api/transactions

List or create community transactions.

**Query:** `?communityId=<id>&limit=50`

Enforces daily volume caps, single tx caps, and wallet balance caps.

---

## Health & Monitoring

### GET /api/health

Comprehensive health check with service status (DB, Cashu mint, LND, identity alias count).

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "services": { "db": "ok", "mint": "ok", "lnd": "ok" },
  "identity_aliases": 142
}
```

Status codes: 200 (healthy/degraded), 503 (unhealthy)

### GET /api/health-check

Simple liveness probe. **Response:** `{ "ok": true, "time": "..." }`

### GET /api/bce-metrics

Bitcoin Circular Economy community health metrics.

**Auth:** Session

**Query:** `?communityId=<id>`

**Response:**
```json
{
  "metrics": {
    "merchantCount": 8,
    "merchantsActive": 5,
    "mau": 42,
    "spendVelocity": 1.8,
    "paymentSuccessRate": 0.955,
    "healthScore": 34,
    "maturityTier": "nascent"
  }
}
```

### GET /api/cycle

BTC market cycle signals (MVRV, NUPL, price data from CoinGecko).

**Auth:** Public

**Response:** `{ "metrics": {...}, "market": { "price": 87000, "marketCap": ..., "volume24h": ... } }`

### GET /api/metrics

RED (Rate/Error/Duration) observability metrics snapshot.

**Auth:** Session

---

## Lightning Infrastructure

### POST /api/lsp/bootstrap

Request inbound Lightning channel from LSP. Falls back gracefully when `LSP_URL` not set.

**Auth:** Merchant macaroon

**Request:** `{ "nodeId": "03abc...", "host": "merchant.example.com", "requestedSats": 1000000 }`

### GET /api/lnurlp/:username/invoice

LNURL-pay invoice callback (LUD-06). Public endpoint.

**Query:** `?amount=<millisats>&comment=<string>`

**Response:** `{ "pr": "lnbc...", "routes": [] }`

### POST /api/dns/provision

Provision Cloudflare Tunnel + DNS CNAME for merchant subdomain.

**Auth:** Merchant macaroon

**Request:** `{ "merchantId": "merch_abc" }`

Falls back when `CLOUDFLARE_API_TOKEN` not set.

---

## Utilities

### GET /api/badge

SVG "Bitcoin Accepted Here" badge for merchant embeds. 24h browser cache.

**Query:** `?variant=dark|light&ref=<merchantId>`

### POST /api/csp-report

Content Security Policy violation report sink. Rate-limited. Returns 204.

### GET /api/update/check

Check for ArxMint client updates.

**Query:** `?channel=beta|stable`

### POST /api/telegram-webhook

Telegram bot webhook handler (admin notifications).

---

## Error Responses

All errors follow this format:

```json
{ "error": "Human-readable error message", "code": "MACHINE_READABLE_CODE" }
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request body or parameters |
| 401 | Missing or invalid authentication |
| 402 | Payment required (L402/NUT-24 challenge) |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (e.g., identity already linked to different root) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable (missing env config) |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/checkout | 60/min per IP |
| GET /api/checkout/status/* | 120/min per IP |
| POST /api/pledge | 5/hour per IP |
| POST /api/auth | 20/min per IP |
| GET /api/bce-metrics | 30/min |
| POST /api/escrow | 30/min per principal |
| POST /api/invoices | 30/min per principal |

Rate limit headers on all responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1741516860
```

---

## Identity

> **Agent scopes:** `identity:read` (resolve, getAliases) · `identity:write` (link, unlink, createRoot)
>
> **OpenAPI spec:** `docs/openapi/identity.yaml`
>
> **SDK:** `import { IdentityClient } from "@arxmint/js"`

Cross-auth identity graph: link external identifiers (Nostr pubkeys, Lightning Addresses,
Teneo-auth userIds, etc.) to a canonical ArxMint User root across payment methods.

### POST /api/identity/link

Link an external identifier to an ArxMint user root.

**Auth:** NIP-98 | X-Marketplace-Secret | L402 `identity:write`

**Request:**
```json
{
  "rootId": "clroot5678",
  "namespace": "nostr",
  "externalId": "npub1abc...",
  "metadata": { "source": "checkout" }
}
```

**Response 201** (created) / **200** (already linked):
```json
{ "ok": true, "alias": { "id": "clxyz...", "rootId": "...", "namespace": "nostr", ... }, "created": true }
```

**Error responses:** 400 (validation), 401 (unauth), 404 (root not found), 409 (externalId already linked to different root)

### GET /api/identity/resolve

Resolve an external identifier or root ID to all aliases.

**Auth:** NIP-98 | X-Marketplace-Secret | L402 `identity:read`

**Query params:** `?id=<externalId>` or `?rootId=<rootId>`, optional `&namespace=<ns>`

**Response 200:**
```json
{ "ok": true, "rootId": "clroot5678", "aliases": [ { "namespace": "nostr", "externalId": "npub1...", ... } ] }
```

### DELETE /api/identity/unlink

Remove an identity alias link.

**Auth:** NIP-98 | X-Marketplace-Secret | L402 `identity:write`

**Request:** `{ "namespace": "nostr", "externalId": "npub1abc..." }`

**Response 200:** `{ "ok": true }`

### POST /api/identity/create-root

Create a minimal ArxMint identity root (server-to-server only).

**Auth:** X-Marketplace-Secret required

**Request:** `{ "linkedBy": "teneo-production", "metadata": { "event": "signup" } }`

**Response 201:** `{ "ok": true, "id": "clnewroot...", "createdAt": "ISO 8601" }`
