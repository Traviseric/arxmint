# ArxMint API Reference

Base URL: `https://arxmint.com/api`

All requests require authentication via API key header or session cookie. Server-to-server calls use the `Authorization: Bearer arx_live_xxx` header.

---

## Authentication

### POST /api/auth

Authenticate via Nostr NIP-98 to get a session token.

**Request body:**
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
{
  "success": true,
  "pubkey": "hex_pubkey",
  "session": "pubkey.expiry.hmac_sig"
}
```

**Curl example:**
```bash
curl -X POST https://arxmint.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"nostrEvent": {...}}'
```

---

## Checkout

### POST /api/checkout

Create a Lightning invoice for a merchant payment session.

**Request body:**
```json
{
  "merchantId": "seed-glacier",
  "amountSats": 1000,
  "memo": "Coffee order",
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

`shipping` is optional — only include for physical goods.

**Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "invoice": "lnbc10n1p3xyzabc...",
  "expiresAt": "2026-03-09T12:10:00Z",
  "demoMode": false,
  "amountSats": 1000
}
```

`demoMode: true` indicates the merchant has no live Lightning node configured — invoice is for testing only.

**Curl example:**
```bash
curl -X POST https://arxmint.com/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "seed-glacier",
    "amountSats": 1000,
    "memo": "Coffee"
  }'
```

---

### GET /api/checkout/status/:sessionId

Poll for payment status on an open checkout session.

**Response:**
```json
{
  "sessionId": "sess_abc123def456",
  "status": "pending",
  "amountSats": 1000,
  "merchantId": "seed-glacier",
  "paidAt": null
}
```

`status` values: `pending` | `paid` | `expired`

**Curl example:**
```bash
curl https://arxmint.com/api/checkout/status/sess_abc123def456
```

---

### GET /api/checkout/status/:sessionId/stream

Server-Sent Events stream for real-time payment status updates (alternative to polling).

```bash
curl -N https://arxmint.com/api/checkout/status/sess_abc123def456/stream
# Streams: data: {"status":"pending"}\n\n
# Then:    data: {"status":"paid","paidAt":"2026-03-09T12:05:32Z"}\n\n
```

---

## Merchants

### GET /api/merchants

List all active merchants in the network.

**Query params:**
- `category` — Filter by category (`food-drink`, `retail`, `services`, etc.)
- `status` — `live` | `pipeline` (default: `live`)
- `limit` — Number of results (default: 50, max: 200)

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
      "checkoutUrl": "https://arxmint.com/pay/seed-glacier",
      "website": "https://glacierparlor.com"
    }
  ],
  "total": 15,
  "liveCount": 2,
  "pipelineCount": 13
}
```

**Curl example:**
```bash
curl "https://arxmint.com/api/merchants?category=food-drink&status=live"
```

---

### POST /api/pledge

Submit a merchant pledge application (join the merchant network).

**Request body:**
```json
{
  "businessName": "Sunrise Bakery",
  "ownerName": "Alex Rivera",
  "email": "alex@sunrisebakery.com",
  "location": "Denver, CO",
  "category": "food-drink",
  "website": "https://sunrisebakery.com",
  "reason": "We want to accept Bitcoin Lightning payments from our community"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application received",
  "id": "pledge_abc123"
}
```

---

## Community

### POST /api/community

Create a new Bitcoin circular economy community (requires auth).

**Request body:**
```json
{
  "name": "Fort Collins Bitcoin Circle",
  "description": "Local Bitcoin circular economy for Fort Collins merchants and residents",
  "mintBackend": "cashu",
  "network": "mainnet",
  "memberCount": 50,
  "privacy": {
    "level": "high",
    "coinjoinEnabled": false,
    "silentPaymentsEnabled": false
  }
}
```

**Response:**
```json
{
  "community": {
    "id": "comm_xyz789",
    "name": "Fort Collins Bitcoin Circle",
    "mintBackend": "cashu",
    "network": "mainnet",
    "createdAt": "2026-03-09T12:00:00Z"
  }
}
```

---

### GET /api/community

List communities owned by the authenticated user.

**Response:**
```json
{
  "communities": [
    {
      "id": "comm_xyz789",
      "name": "Fort Collins Bitcoin Circle",
      "config": { ... }
    }
  ]
}
```

---

## Payments

### POST /api/payment

Initiate a payment (requires auth session).

**Request body:**
```json
{
  "type": "lightning",
  "invoice": "lnbc...",
  "amountSats": 1000
}
```

**Response:**
```json
{
  "paymentId": "pay_abc123",
  "status": "pending",
  "preimage": null
}
```

---

### GET /api/payment/status/:id

Check payment status.

**Response:**
```json
{
  "paymentId": "pay_abc123",
  "status": "settled",
  "preimage": "hex_preimage",
  "settledAt": "2026-03-09T12:05:00Z"
}
```

---

## BCE Metrics

### GET /api/bce-metrics

Get Bitcoin Circular Economy metrics for the current community.

**Query params:**
- `communityId` — Filter by community ID

**Response:**
```json
{
  "metrics": {
    "id": "bce_xyz",
    "timestamp": 1741516800000,
    "merchantCount": 8,
    "merchantsActive": 5,
    "mau": 42,
    "spendVelocity": 1.8,
    "paymentSuccessRate": 0.955,
    "uptime": 0.98,
    "ecashCirculation": 2450000,
    "inboundLiquidity": 5000000,
    "liquidityCoverage": 10.2,
    "maturityTier": "nascent",
    "healthScore": 34
  }
}
```

---

## Agent / L402

### GET /api/agent

AI agent data endpoints behind L402 paywall. Returns HTTP 402 with WWW-Authenticate header if unpaid.

**Response (unpaid):**
```
HTTP/1.1 402 Payment Required
WWW-Authenticate: L402 macaroon="...", invoice="lnbc..."
```

**Response (paid — with Authorization: L402 macaroon:preimage):**
```json
{
  "data": "privacy-audit" | "cycle-signals",
  "result": { ... }
}
```

**Query params:**
- `type` — `privacy-audit` | `cycle-signals`

---

## Webhooks

### POST /api/v1/webhooks

Register a webhook endpoint to receive payment notifications.

See [Webhooks Guide](./webhooks.md) for full event reference.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common HTTP status codes:
- `400` — Invalid request body or parameters
- `401` — Missing or invalid authentication
- `403` — Authenticated but not authorized (e.g., not an admin)
- `404` — Resource not found
- `429` — Rate limit exceeded
- `500` — Internal server error (check status page)

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/checkout | 60 requests/minute per IP |
| GET /api/checkout/status/* | 120 requests/minute per IP |
| POST /api/pledge | 5 requests/hour per IP |
| POST /api/auth | 20 requests/minute per IP |
| GET /api/bce-metrics | 30 requests/minute |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1741516860
```
