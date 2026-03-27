-- ============================================================
-- ArxMint — Merchant Onboarding Status
-- Migration: 20260328000000_merchant_onboarding_status.sql
--
-- Adds onboarding lifecycle fields to merchant_pledges so the
-- system can track whether a merchant's LNbits wallet has been
-- auto-provisioned and their setup is complete.
-- ============================================================

-- Add onboarding_status enum-like column with CHECK constraint
ALTER TABLE merchant_pledges
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'wallet_ready', 'active')),
  ADD COLUMN IF NOT EXISTS wallet_provisioned_at TIMESTAMPTZ;

-- Index for bulk-provisioning queries (find merchants without wallets)
CREATE INDEX IF NOT EXISTS idx_merchant_pledges_onboarding_status
  ON merchant_pledges (onboarding_status)
  WHERE onboarding_status = 'pending';

-- Backfill: merchants that already have a wallet record should be marked wallet_ready
UPDATE merchant_pledges mp
SET onboarding_status = 'wallet_ready',
    wallet_provisioned_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM merchant_wallets mw WHERE mw.merchant_id = mp.id
)
AND mp.onboarding_status = 'pending';

-- Backfill: merchants with checkout_enabled = true are fully active
UPDATE merchant_pledges
SET onboarding_status = 'active'
WHERE checkout_enabled = true
  AND onboarding_status IN ('pending', 'wallet_ready');
