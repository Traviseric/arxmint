# Teneo ↔ ArxMint Bridge

**Last updated:** 2026-05-19
**Counterpart doc:** `teneo-production/docs/features/payments/BTC-CHECKOUT.md` (canonical)

This file is the ArxMint-side summary. The complete architecture (Lambdas, DynamoDB, deploy flags, smoke tests) lives in the Teneo repo's `BTC-CHECKOUT.md`. Cross-reference only what's ArxMint-specific.

---

## seed-teneo merchant

`seed-teneo` is a hardcoded seed merchant in `app/api/checkout/route.ts` (search "seed-teneo"). It accepts checkout sessions from Teneo's `btc-create-checkout` Lambda for credit packs, $10 starter, and annual subscription prepays.

When Teneo mints a session, ArxMint's `POST /api/checkout` accepts:
- `merchantId: "seed-teneo"`
- `amountSats` (USD→sats conversion happens Teneo-side via mempool.space)
- `memo`
- `metadata.purchaseId` — round-trip identifier for the Teneo-side btc-purchases row
- `fulfillmentUrl` — Teneo's API Gateway `/webhook/btcpay` route (staging: `https://o0i57pbnhb.execute-api.us-west-2.amazonaws.com/staging/webhook/btcpay`)

On payment confirmation, `app/api/checkout/webhook/route.ts` POSTs a signed `payment.completed` event to that fulfillment URL. The signing secret comes from `getFulfillmentSecret(session.merchant_id)` — for `seed-teneo` it returns `process.env.ARXMINT_TENEO_WEBHOOK_SECRET` (per-merchant secret, must match the value Teneo's `btc-webhook-ingest` Lambda has in `ARXMINT_WEBHOOK_SECRET` env).

Signature format: Stripe-compatible `t=<unix>,v1=<hmac_sha256_hex>` over `${timestamp}.${rawBody}`. 5-min skew tolerance. See `lib/webhook-engine.ts`.

---

## Payout — BOLT12 to Travis's Phoenix wallet

`seed-teneo`'s `merchant_wallets` row has `payout_type='bolt12_offer'` and `payout_address` containing Travis's Phoenix mobile BOLT12 offer (334 chars, starts with `lno1zrxq8`).

When payment confirms, `app/api/checkout/webhook/route.ts → autoForwardToMerchant()` dispatches by `payout_type`:
- `'bolt12_offer'` → `forwardPaymentToBolt12Offer()` in `lib/lnbits.ts`
- `'lightning_address'` → `forwardPaymentToMerchant()` (LNURL-pay flow, used by Glacier etc.)

`forwardPaymentToBolt12Offer` posts to Phoenixd's native `/payoffer` endpoint (Phoenixd has BOLT12 baked in — no LND tunnel, no fetchinvoice round-trip). Phoenixd is at `process.env.PHOENIXD_URL` (`http://167.71.189.144:9740`) with HTTP Basic auth (`process.env.PHOENIXD_API_PASSWORD`).

The path: customer pays Lightning invoice (sats arrive at Phoenixd via lnbits.arxmint.com) → ArxMint webhook fires → Phoenixd `/payoffer` → onion message to Travis's Phoenix mobile → invoice fetched and paid → sats land in Phoenix within seconds.

---

## Schema additions (Supabase)

Migration `20260516000000_merchant_wallets_bolt12.sql`:
- Relaxed `merchant_wallets.payout_type` CHECK to allow `'bolt12_offer'`
- Dropped NOT NULL on `lnbits_wallet_id`, `lnbits_invoice_key`, `lnbits_admin_key` — many merchants share the global wallet via env fallback, so per-merchant keys are optional

Migration `20260514000000_checkout_fulfillment_url.sql`:
- Added `fulfillment_url`, `metadata`, `customer_email`, `shipping_data` columns to `checkout_sessions`. These were implicitly expected by the existing webhook code but no migration ever created them — every metadata-bearing or fulfillment-url-bearing checkout was silently failing the insert before this.

---

## See also

- `teneo-production/docs/features/payments/BTC-CHECKOUT.md` — canonical full architecture
- `lib/lnbits.ts` — `forwardPaymentToBolt12Offer()` (Phoenixd /payoffer) + `forwardPaymentToMerchant()` (LNURL-pay)
- `app/api/checkout/webhook/route.ts` — `autoForwardToMerchant()` dispatch + `getFulfillmentSecret()` per-merchant secrets
- `app/api/checkout/route.ts` — accepts `fulfillmentUrl` in checkout body, persists to session row
- `app/pay/[merchant-id]/page.tsx` — consumes `?session=` query param for cross-system pre-minted sessions
