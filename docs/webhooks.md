# ArxMint Webhooks

Webhooks let ArxMint push real-time payment events to your server instead of polling. Configure your webhook URL in the ArxMint merchant dashboard.

## Overview

When a payment event occurs (e.g., a customer pays your Lightning invoice), ArxMint sends an HTTP POST to your registered webhook URL with a JSON body describing the event.

Your endpoint must:
1. **Verify the HMAC signature** to confirm the request is from ArxMint
2. **Respond with HTTP 200** within 5 seconds
3. Process the event asynchronously (queue it if needed)

---

## Signature Verification

Every webhook request includes an `X-ArxMint-Signature` header containing an HMAC-SHA256 signature of the raw request body.

### Verification (Node.js)

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyArxMintWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature.replace("sha256=", ""), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### Using the SDK

```typescript
import { verifyWebhookSignature } from "@arxmint/js/webhooks";

// In your webhook handler:
const isValid = verifyWebhookSignature(
  rawBody,           // Buffer or string — raw request body
  signature,         // X-ArxMint-Signature header value
  webhookSecret      // ARXMINT_WEBHOOK_SECRET env var
);

if (!isValid) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

### Next.js App Router Example

```typescript
// app/api/arxmint-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@arxmint/js/webhooks";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-arxmint-signature") ?? "";

  const isValid = verifyWebhookSignature(
    rawBody,
    signature,
    process.env.ARXMINT_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Handle event asynchronously
  await handleWebhookEvent(event);

  return NextResponse.json({ received: true });
}
```

---

## Event Types

### `payment.settled`

Fires when a Lightning invoice is fully settled (payment received).

```json
{
  "id": "evt_abc123xyz",
  "type": "payment.settled",
  "created": 1741516832,
  "data": {
    "sessionId": "sess_abc123def456",
    "merchantId": "seed-glacier",
    "amountSats": 1000,
    "paidAt": "2026-03-09T12:05:32Z",
    "preimage": "hex_payment_preimage",
    "demoMode": false,
    "shipping": null
  }
}
```

### `payment.expired`

Fires when a Lightning invoice expires without payment.

```json
{
  "id": "evt_def456uvw",
  "type": "payment.expired",
  "created": 1741517432,
  "data": {
    "sessionId": "sess_abc123def456",
    "merchantId": "seed-glacier",
    "amountSats": 1000,
    "expiredAt": "2026-03-09T12:10:00Z"
  }
}
```

### `merchant.approved`

Fires when a merchant pledge application is approved by an admin.

```json
{
  "id": "evt_ghi789rst",
  "type": "merchant.approved",
  "created": 1741517000,
  "data": {
    "merchantId": "new-merchant-abc",
    "businessName": "Sunrise Bakery",
    "email": "alex@sunrisebakery.com",
    "approvedAt": "2026-03-09T12:00:00Z"
  }
}
```

### `checkout.created`

Fires when a new checkout session is created (invoice generated, not yet paid).

```json
{
  "id": "evt_jkl012mno",
  "type": "checkout.created",
  "created": 1741516800,
  "data": {
    "sessionId": "sess_abc123def456",
    "merchantId": "seed-glacier",
    "amountSats": 1000,
    "expiresAt": "2026-03-09T12:10:00Z"
  }
}
```

---

## Retry Policy

ArxMint retries failed webhook deliveries with exponential backoff:

| Attempt | Delay | Total elapsed |
|---------|-------|---------------|
| 1 (initial) | — | 0s |
| 2 | 30s | 30s |
| 3 | 5min | 5m 30s |
| 4 | 30min | 35m 30s |
| 5 | 2hr | 2h 35m |

A delivery is considered failed if:
- Your endpoint returns a non-2xx status code
- Your endpoint does not respond within 5 seconds
- A network error occurs

After 5 failed attempts, the event is marked as undeliverable. You can manually replay events from the ArxMint dashboard.

---

## Idempotency

Each event has a unique `id` field. Store processed event IDs to prevent duplicate processing:

```typescript
async function handleWebhookEvent(event: ArxMintEvent) {
  // Check if already processed
  const existing = await db.webhookEvents.findOne({ id: event.id });
  if (existing) {
    console.log("Duplicate event, skipping:", event.id);
    return;
  }

  // Mark as processing
  await db.webhookEvents.insert({ id: event.id, type: event.type });

  // Process
  if (event.type === "payment.settled") {
    await fulfillOrder(event.data.sessionId, event.data.amountSats);
  }
}
```

---

## Testing Webhooks Locally

Use a tunneling tool like [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

Set your webhook URL in the ArxMint dashboard to `https://abc123.ngrok.io/api/arxmint-webhook`.

You can also trigger test events from the dashboard or use the ArxMint CLI:

```bash
npx arxmint webhook:send payment.settled \
  --url http://localhost:3000/api/arxmint-webhook \
  --secret whsec_your_webhook_secret
```

---

## Webhook Security Checklist

- [ ] Verify HMAC signature on every request
- [ ] Use `timingSafeEqual` to prevent timing attacks
- [ ] Store raw body before parsing (signature is over raw bytes)
- [ ] Respond with 200 quickly, process async
- [ ] Implement idempotency using event `id`
- [ ] Log all received events for debugging
- [ ] Alert on consecutive delivery failures
