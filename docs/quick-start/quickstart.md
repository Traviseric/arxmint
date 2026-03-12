# ArxMint Quickstart — Accept Bitcoin Lightning in 5 Minutes

This guide walks you through integrating ArxMint Bitcoin Lightning payments into your website or app using the `@arxmint/js` SDK.

## Prerequisites

- Node.js 18+
- An ArxMint merchant account (sign up at [arxmint.com/merchants](https://arxmint.com/merchants))
- Your `arx_live_` API key (or `arx_test_` for testnet)

## Step 1: Install the SDK

```bash
npm install @arxmint/js
# or
yarn add @arxmint/js
```

## Step 2: Initialize the Client

```typescript
import { ArxMintClient } from "@arxmint/js";

const arxmint = new ArxMintClient({
  apiKey: process.env.ARXMINT_API_KEY,  // arx_live_xxx or arx_test_xxx
  merchantId: process.env.ARXMINT_MERCHANT_ID,
});
```

## Step 3: Create a Payment Invoice

```typescript
// Create a Lightning invoice for 1,000 sats
const { invoice, sessionId, expiresAt } = await arxmint.checkout.create({
  amountSats: 1000,
  memo: "Coffee at Main St",
});

// invoice: "lnbc10n1p..." — show this as a QR code or copy-paste link
// sessionId: "sess_abc123" — use this to poll for payment status
console.log("Lightning invoice:", invoice);
```

## Step 4: Display the QR Code

```tsx
// React component example
import { QRCodeSVG } from "qrcode.react";

function PaymentQR({ invoice }: { invoice: string }) {
  return (
    <a href={`lightning:${invoice}`}>
      <QRCodeSVG value={`lightning:${invoice.toUpperCase()}`} size={240} />
    </a>
  );
}
```

## Step 5: Poll for Payment Status

```typescript
// Poll every 2 seconds
const checkStatus = setInterval(async () => {
  const status = await arxmint.checkout.status(sessionId);

  if (status.state === "paid") {
    clearInterval(checkStatus);
    console.log("Payment received!", status.paidAt);
    // Fulfill the order
  } else if (status.state === "expired") {
    clearInterval(checkStatus);
    console.log("Invoice expired — generate a new one");
  }
}, 2000);
```

## Step 6: Handle Webhooks (Recommended)

Instead of polling, configure a webhook URL in your ArxMint dashboard to receive real-time payment notifications:

```typescript
// pages/api/arxmint-webhook.ts (Next.js Pages Router)
import { verifyWebhookSignature } from "@arxmint/js/webhooks";

export default async function handler(req, res) {
  const signature = req.headers["x-arxmint-signature"];
  const isValid = verifyWebhookSignature(
    req.body,
    signature,
    process.env.ARXMINT_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(req.body);

  if (event.type === "payment.settled") {
    const { merchantId, sessionId, amountSats, paidAt } = event.data;
    // Fulfill order, update database, etc.
    await fulfillOrder(sessionId, amountSats);
  }

  res.status(200).json({ received: true });
}
```

## Using the React Component (Zero Config)

For the fastest integration, embed the pre-built checkout flow:

```tsx
import { CheckoutButton } from "@arxmint/react";

export default function ProductPage() {
  return (
    <CheckoutButton
      merchantId={process.env.NEXT_PUBLIC_ARXMINT_MERCHANT_ID}
      amountSats={5000}
      memo="Product purchase"
      onPaid={(sessionId) => console.log("Paid!", sessionId)}
    />
  );
}
```

## Use Your Pre-Built Checkout Page

Every ArxMint merchant automatically gets a hosted checkout page at:

```
https://arxmint.com/pay/YOUR_MERCHANT_ID
```

Link to it from any website — no code required:

```html
<a href="https://arxmint.com/pay/your-merchant-id">
  Pay with Bitcoin Lightning
</a>
```

## Environment Variables

```bash
# .env.local
ARXMINT_API_KEY=arx_live_xxxxxxxxxxxx
ARXMINT_MERCHANT_ID=your-merchant-id
NEXT_PUBLIC_ARXMINT_MERCHANT_ID=your-merchant-id
ARXMINT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

## Next Steps

- [API Reference](./api-reference.md) — All endpoints with curl examples
- [Webhooks Guide](./webhooks.md) — Event types, verification, retry logic
- [SDK Reference](./sdk-reference.md) — Full `@arxmint/js` and `@arxmint/react` API
- [Case Study: Glacier Ice Cream](./case-studies/glacier.md) — Real-world integration example

## Need Help?

- Email: [travis@arxmint.com](mailto:travis@arxmint.com)
- GitHub: [github.com/Traviseric/arxmint](https://github.com/Traviseric/arxmint)
