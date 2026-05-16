-- ============================================================
-- ArxMint — merchant_wallets BOLT12 support
-- Migration: 20260516000000_merchant_wallets_bolt12.sql
--
-- 1. Relax the payout_type CHECK constraint to allow 'bolt12_offer'.
--    BOLT12 is Phoenix's most sovereign payout method (no LSP middleman
--    serving Lightning Addresses). seed-teneo uses this — see memory
--    teneo_payout_destination.md.
--
-- 2. Drop NOT NULL on lnbits_wallet_id / lnbits_invoice_key /
--    lnbits_admin_key. The constraint assumed every merchant has its
--    own LNbits sub-wallet, but in practice many use the global wallet
--    (LNBITS_INVOICE_KEY env var) — forcing per-merchant keys creates
--    placeholder values that are worse than NULL.
--
-- Both changes are additive — existing rows are untouched, lightning_address
-- and onchain payouts continue working exactly as before.
-- ============================================================

ALTER TABLE merchant_wallets DROP CONSTRAINT IF EXISTS merchant_wallets_payout_type_check;
ALTER TABLE merchant_wallets
  ADD CONSTRAINT merchant_wallets_payout_type_check
  CHECK (payout_type IS NULL OR payout_type = ANY (ARRAY[
    'lightning_address'::text,
    'onchain'::text,
    'bolt12_offer'::text
  ]));

ALTER TABLE merchant_wallets ALTER COLUMN lnbits_wallet_id   DROP NOT NULL;
ALTER TABLE merchant_wallets ALTER COLUMN lnbits_invoice_key DROP NOT NULL;
ALTER TABLE merchant_wallets ALTER COLUMN lnbits_admin_key   DROP NOT NULL;
