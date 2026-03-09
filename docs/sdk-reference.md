# ArxMint SDK Reference

## @arxmint/js — JavaScript / TypeScript SDK

Install:
```bash
npm install @arxmint/js
```

### `ArxMintClient`

The main client class. Initialize once and reuse across your application.

```typescript
import { ArxMintClient } from "@arxmint/js";

const arxmint = new ArxMintClient({
  apiKey: "arx_live_xxx",          // Required: your API key
  merchantId: "your-merchant-id",  // Required: your merchant ID
  baseUrl: "https://arxmint.com",  // Optional: override base URL (default: arxmint.com)
  timeout: 10_000,                 // Optional: request timeout in ms (default: 10000)
});
```

---

### `arxmint.checkout.create(options)`

Create a Lightning invoice for a payment session.

**Options:**
```typescript
interface CreateCheckoutOptions {
  amountSats: number;           // Amount in satoshis (1–1,000,000)
  memo?: string;                // Optional payment description
  shipping?: ShippingAddress;   // Optional: collect shipping info
}

interface ShippingAddress {
  email: string;
  fullName: string;
  street: string;
  city: string;
  state: string;                // 2-letter US state code
  zip: string;
}
```

**Returns:**
```typescript
interface CreateCheckoutResult {
  sessionId: string;        // Use this to poll status or match webhooks
  invoice: string;          // BOLT11 Lightning invoice string
  expiresAt: string;        // ISO 8601 expiry timestamp
  demoMode: boolean;        // true = no real payment processed
  amountSats: number;
}
```

**Example:**
```typescript
const session = await arxmint.checkout.create({
  amountSats: 5000,
  memo: "Monthly subscription",
});

console.log(session.invoice);   // "lnbc50n1p..."
console.log(session.sessionId); // "sess_abc123"
```

---

### `arxmint.checkout.status(sessionId)`

Retrieve current status of a checkout session.

**Returns:**
```typescript
interface CheckoutStatus {
  sessionId: string;
  status: "pending" | "paid" | "expired";
  amountSats: number;
  merchantId: string;
  paidAt: string | null;    // ISO 8601 timestamp, only if paid
}
```

**Example:**
```typescript
const status = await arxmint.checkout.status("sess_abc123");
if (status.status === "paid") {
  await fulfillOrder(status.sessionId);
}
```

---

### `arxmint.checkout.stream(sessionId, onEvent)`

Stream real-time status updates via Server-Sent Events.

```typescript
const cancel = arxmint.checkout.stream("sess_abc123", (event) => {
  if (event.status === "paid") {
    console.log("Paid at:", event.paidAt);
    cancel(); // Stop listening
  }
});

// Later: cancel() to stop streaming
```

---

### `arxmint.merchants.list(options?)`

List merchants in the ArxMint network.

**Options:**
```typescript
interface ListMerchantsOptions {
  category?: string;                     // Filter by category
  status?: "live" | "pipeline";          // Default: "live"
  limit?: number;                        // Default: 50, max: 200
}
```

**Returns:**
```typescript
interface MerchantsListResult {
  merchants: MerchantSummary[];
  total: number;
  liveCount: number;
  pipelineCount: number;
}
```

---

### `arxmint.metrics.bce(options?)`

Retrieve Bitcoin Circular Economy metrics for your community.

```typescript
const metrics = await arxmint.metrics.bce({ communityId: "comm_xyz" });
console.log(metrics.healthScore);   // 0-100
console.log(metrics.maturityTier);  // "nascent" | "emerging" | "growing" | ...
```

---

## @arxmint/react — React Component Library

Install:
```bash
npm install @arxmint/react
# Peer deps: react >= 18, react-dom >= 18
```

Import styles:
```tsx
import "@arxmint/react/styles.css";
```

---

### `<CheckoutButton />`

A ready-to-use payment button that opens an inline checkout modal.

```tsx
import { CheckoutButton } from "@arxmint/react";

export default function ProductPage() {
  return (
    <CheckoutButton
      merchantId="your-merchant-id"
      amountSats={5000}
      memo="Product purchase"
      onPaid={(sessionId) => {
        console.log("Payment complete!", sessionId);
        // Redirect to success page, update UI, etc.
      }}
      onExpired={() => {
        console.log("Invoice expired — regenerating");
      }}
      onError={(err) => {
        console.error("Payment error:", err.message);
      }}
    />
  );
}
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `merchantId` | `string` | Yes | Your ArxMint merchant ID |
| `amountSats` | `number` | Yes | Amount in satoshis |
| `memo` | `string` | No | Payment description |
| `onPaid` | `(sessionId: string) => void` | No | Called when payment settles |
| `onExpired` | `() => void` | No | Called when invoice expires |
| `onError` | `(err: Error) => void` | No | Called on errors |
| `buttonText` | `string` | No | Button label (default: "Pay with Bitcoin") |
| `className` | `string` | No | Additional CSS classes for the button |

---

### `<CheckoutFlow />`

Full checkout UI component for embedding directly in your page (no modal).

```tsx
import { CheckoutFlow } from "@arxmint/react";

export default function PayPage() {
  return (
    <CheckoutFlow
      merchantId="your-merchant-id"
      merchantName="Sunrise Bakery"
      merchantLogo="/logo.png"
      merchantLocation="Denver, CO"
      presetAmount={1000}
      onPaid={(sessionId) => console.log("Paid:", sessionId)}
    />
  );
}
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `merchantId` | `string` | Yes | ArxMint merchant ID |
| `merchantName` | `string` | Yes | Display name for the merchant |
| `merchantLogo` | `string \| null` | No | URL to merchant logo image |
| `merchantLocation` | `string \| null` | No | Location string (e.g., "Denver, CO") |
| `merchantWebsite` | `string \| null` | No | Merchant website URL |
| `merchantDescription` | `string \| null` | No | Short description of the merchant |
| `presetAmount` | `number` | No | Skip amount entry if set |
| `presetMemo` | `string` | No | Pre-fill the payment memo |
| `collectShipping` | `boolean` | No | Show shipping address form before payment |
| `onPaid` | `(sessionId: string) => void` | No | Payment settled callback |

---

### `<MerchantDirectory />`

Browse and search the ArxMint merchant network.

```tsx
import { MerchantDirectory } from "@arxmint/react";

export default function FindMerchants() {
  return (
    <MerchantDirectory
      onMerchantClick={(merchant) => {
        window.location.href = `/pay/${merchant.id}`;
      }}
    />
  );
}
```

---

### `useArxMintCheckout(options)` Hook

Low-level React hook for building custom checkout UIs.

```tsx
import { useArxMintCheckout } from "@arxmint/react";

function CustomCheckout({ amountSats }: { amountSats: number }) {
  const {
    state,      // "idle" | "loading" | "invoice" | "paid" | "expired" | "error"
    invoice,    // BOLT11 string when state === "invoice"
    sessionId,  // Session ID when state === "invoice"
    error,      // Error message when state === "error"
    createInvoice,
    reset,
  } = useArxMintCheckout({
    merchantId: "your-merchant-id",
    amountSats,
  });

  return (
    <div>
      {state === "idle" && (
        <button onClick={() => createInvoice()}>Generate Invoice</button>
      )}
      {state === "invoice" && (
        <QRCode value={invoice} />
      )}
      {state === "paid" && <p>Payment received!</p>}
      {state === "error" && <p>Error: {error}</p>}
    </div>
  );
}
```

---

## Webhook Utilities

```typescript
import { verifyWebhookSignature } from "@arxmint/js/webhooks";

// Returns true if signature is valid
const isValid = verifyWebhookSignature(rawBody, signature, secret);
```

---

## TypeScript Types

All types are exported from `@arxmint/js`:

```typescript
import type {
  CheckoutSession,
  CheckoutStatus,
  MerchantSummary,
  BCEMetrics,
  ArxMintEvent,
  PaymentSettledEvent,
  PaymentExpiredEvent,
  ShippingAddress,
} from "@arxmint/js";
```

---

## Error Handling

All SDK methods throw `ArxMintError` on failure:

```typescript
import { ArxMintError } from "@arxmint/js";

try {
  const session = await arxmint.checkout.create({ amountSats: 1000 });
} catch (err) {
  if (err instanceof ArxMintError) {
    console.error(err.message);  // Human-readable message
    console.error(err.code);     // Machine-readable code
    console.error(err.status);   // HTTP status code
  }
}
```

Common error codes:
- `MERCHANT_NOT_FOUND` — Merchant ID doesn't exist
- `INVALID_AMOUNT` — Amount out of range (1–1,000,000 sats)
- `CHECKOUT_DISABLED` — Merchant has not enabled checkout
- `RATE_LIMITED` — Too many requests
- `UNAUTHORIZED` — Invalid or missing API key
