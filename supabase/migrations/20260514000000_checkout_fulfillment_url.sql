-- ============================================================
-- ArxMint — Checkout Fulfillment URL
-- Migration: 20260514000000_checkout_fulfillment_url.sql
--
-- Adds fulfillment_url + metadata columns to checkout_sessions.
--
-- fulfillment_url lets a caller (Teneo, Bazaar, OpenBazaar, etc.) attach a
-- signed-webhook callback URL when minting a session. On payment confirmation,
-- ArxMint's checkout/webhook fires a POST to this URL with the ArxMint-Signature
-- header (Stripe-compatible: t=<unix>,v1=<hmac>).
--
-- This column was implicitly expected by app/api/checkout/webhook/route.ts
-- (which reads session.fulfillment_url) but no migration ever created it —
-- so every fulfillment-url-based integration silently failed. This fixes that.
--
-- metadata was already being written by /api/checkout but no column existed,
-- which made the entire insert silently fail when metadata was provided.
-- ============================================================

ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS fulfillment_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata        JSONB,
  ADD COLUMN IF NOT EXISTS customer_email  TEXT,
  ADD COLUMN IF NOT EXISTS shipping_data   JSONB;

-- Lightweight index for the webhook engine to look up sessions by
-- fulfillment_url when retrying deliveries.
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_fulfillment_url
  ON checkout_sessions (fulfillment_url)
  WHERE fulfillment_url IS NOT NULL;
