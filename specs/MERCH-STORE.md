# ArxMint Merch Store — Implementation Spec

## Goal
Add a merch store to arxmint.com where people can buy ArxMint-branded stickers, tees, and hats. Payment via Lightning (sats) AND Stripe (USD). Fulfillment via Printful dropshipping.

## Reference Implementation
Glacier Ice Cream store-site has the full working pattern:
- **Printful client**: `D:\Travis Eric\TE Code\clients\glacier-ice-cream\store-site\src\lib\printful\client.ts`
- **Stripe checkout + Printful webhook**: `D:\Travis Eric\TE Code\clients\glacier-ice-cream\store-site\src\app\api\checkout\webhook\route.ts`
- **Stripe session with Printful metadata**: `D:\Travis Eric\TE Code\clients\glacier-ice-cream\store-site\src\app\api\checkout\create-session\route.ts`
- **Printful webhook handler**: `D:\Travis Eric\TE Code\clients\glacier-ice-cream\store-site\src\app\api\webhooks\printful\route.ts`
- **Shared package (canonical source)**: `D:\Travis Eric\TE Code\packages\printful-client\src\`

## Existing ArxMint Infrastructure
- **Bazaar page**: `app/bazaar/page.tsx` — currently fetches from OpenBazaar.ai API
- **Lightning payments**: Already built — L402, Cashu, invoice creation
- **Checkout webhook**: `app/api/checkout/webhook/route.ts` — exists for OpenBazaar
- **Pay page**: `app/pay/[merchant-id]/page.tsx` — Lightning checkout UI
- **Stack**: Next.js 15.1.0, React 19, TypeScript, Supabase
- **Deployed**: Vercel at arxmint.com, team `team_VqmnNrmu3BcfUHd5BFdSRAMJ`

## What to Build

### 1. Printful Client
Copy from shared package `packages/printful-client/src/client.ts` into `lib/printful/client.ts`. Self-contained, no workspace dependency needed.

### 2. Merch Products Data
Create `lib/merch/products.ts` with ArxMint-branded products. Each variant needs a `printfulVariantId`.

**To get variant IDs**: Either:
- Create products in Printful dashboard (Store ID: 17809413 — shared with Glacier, or create a new store)
- Or use the Printful API to list existing products:
```bash
curl -s "https://api.printful.com/store/products" \
  -H "Authorization: Bearer $PRINTFUL_API_KEY" \
  -H "X-PF-Store-Id: $PRINTFUL_STORE_ID"
```

### 3. Merch Page
Create `app/merch/page.tsx` (or extend `app/bazaar/page.tsx`):
- Display ArxMint merch products (stickers, tees, hats)
- Variant selector (size, color)
- Two payment buttons: "Pay with Lightning" and "Pay with Card"

### 4. Stripe Integration (USD payments)
ArxMint currently has NO Stripe. Add it:
- `npm install stripe`
- `lib/stripe/client.ts` — Stripe instance
- `app/api/merch/checkout/route.ts` — creates Stripe session with:
  - `shipping_address_collection: { allowed_countries: ["US"] }`
  - `metadata.printful_items` — JSON of variant IDs + quantities
  - `metadata.needs_dropship: "true"`
- `app/api/merch/webhook/route.ts` — Stripe webhook handler that:
  - Verifies signature with `STRIPE_WEBHOOK_SECRET`
  - On `checkout.session.completed` → reads shipping address + printful_items from metadata
  - Calls `createDropshipOrder(payload, true)` → Printful prints & ships

### 5. Lightning Payment → Printful
For sats payments, extend the existing Lightning flow:
- After Lightning invoice is paid (verified via existing ArxMint infrastructure)
- Need to collect shipping address BEFORE payment (add form to merch page)
- On payment confirmation → call `createDropshipOrder()` with stored address + items

### 6. Printful Shipping Webhook
Create `app/api/webhooks/printful/route.ts`:
- Receives `package_shipped` events
- Logs tracking info
- Optionally notify customer

### 7. Environment Variables
Add to Vercel (`npx vercel env add <NAME> production --scope travis-erics-projects`):
```
PRINTFUL_API_KEY=vLMaB2JHEHKgXrvM6gEN6aQm8z8WnKbPzTAiFybL
PRINTFUL_STORE_ID=17809413
STRIPE_SECRET_KEY=<need to get or share Glacier's>
STRIPE_PUBLISHABLE_KEY=<need to get or share Glacier's>
STRIPE_WEBHOOK_SECRET=<created after registering webhook>
```

Note: Glacier's Stripe key is `sk_live_51RigwEAp30wDvU4g...` — this is Tony's Stripe account. ArxMint should probably have its own Stripe account, OR use the same one if it's all under TE Code.

### 8. Create Stripe Webhook
After deploying, create the webhook via Stripe API:
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -u "$STRIPE_SECRET_KEY:" \
  -d "url=https://arxmint.com/api/merch/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "description=ArxMint merch - Printful dropship"
```

## Flow Summary

### USD (Stripe) Flow
```
Customer → /merch → select product/variant → "Pay with Card"
→ POST /api/merch/checkout (creates Stripe session with printful_items metadata + shipping_address_collection)
→ Stripe hosted checkout (collects card + shipping address)
→ Payment succeeds → Stripe fires webhook to /api/merch/webhook
→ Webhook reads printful_items + shipping_details from session
→ createDropshipOrder() → Printful prints & ships
```

### Sats (Lightning) Flow
```
Customer → /merch → select product/variant → enter shipping address → "Pay with Lightning"
→ POST /api/merch/lightning (creates Lightning invoice, stores order + address in DB)
→ Customer pays invoice
→ Payment verified → createDropshipOrder() with stored address
→ Printful prints & ships
```

## Design Notes
- Keep ArxMint's existing dark/Bitcoin aesthetic
- Merch page should feel native to arxmint.com, not like a bolted-on Shopify
- Show both sats and USD prices
- Use ArxMint orange/black brand colors, not Glacier purple
