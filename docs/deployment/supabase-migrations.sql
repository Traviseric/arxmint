-- ============================================================
-- ArxMint — Supplemental Supabase Migrations for Phase 4.7
-- Run in Supabase Dashboard → SQL Editor
--
-- This file is NOT the full application schema.
-- Run Prisma migrations first:
--   npx prisma migrate deploy
--
-- If you are applying migrations manually in Supabase SQL Editor, run the
-- Prisma migration files under prisma/migrations/ first. Invoicing requires:
--   prisma/migrations/20260316233000_invoice_primitive/migration.sql
--
-- Do not rerun raw Prisma migration SQL after it succeeds. If PostgreSQL
-- reports type "InvoiceStatus" already exists, the invoice migration has
-- already been applied at least once; verify tables instead of rerunning it.
--
-- After this supplemental file, run:
--   supabase/migrations/20260514000000_harden_merchant_payment_rls.sql
-- to remove broad anon/authenticated table access from merchant/payment data.
-- ============================================================

-- 1. Merchant Wallets (stores LNbits wallet credentials per merchant)
CREATE TABLE IF NOT EXISTS merchant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL UNIQUE,
  lnbits_wallet_id TEXT NOT NULL,
  lnbits_invoice_key TEXT NOT NULL,
  lnbits_admin_key TEXT NOT NULL,
  payout_address TEXT,
  payout_type TEXT CHECK (payout_type IN ('lightning_address', 'onchain')),
  telegram_handle TEXT,
  email_notifications BOOLEAN DEFAULT true,
  webhook_url TEXT,
  auto_forward_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for merchant_wallets
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;

-- Server-side API routes use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Do not add broad USING (true) public policies here.
REVOKE ALL ON TABLE merchant_wallets FROM anon, authenticated;
GRANT ALL ON TABLE merchant_wallets TO service_role;

-- 2. BTCMap Submissions (tracks merchant submissions to BTCMap.org)
CREATE TABLE IF NOT EXISTS btcmap_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  website TEXT,
  payment_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'listed', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for btcmap_submissions
ALTER TABLE btcmap_submissions ENABLE ROW LEVEL SECURITY;

-- Server-side API routes use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Do not add broad USING (true) public policies here.
REVOKE ALL ON TABLE btcmap_submissions FROM anon, authenticated;
GRANT ALL ON TABLE btcmap_submissions TO service_role;

-- 3. Add columns to checkout_sessions if they don't exist
-- (These may have been added by earlier migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'r_hash') THEN
    ALTER TABLE checkout_sessions ADD COLUMN r_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'privacy_level') THEN
    ALTER TABLE checkout_sessions ADD COLUMN privacy_level TEXT DEFAULT 'standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'nostr_pubkey') THEN
    ALTER TABLE checkout_sessions ADD COLUMN nostr_pubkey TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'teneo_user_id') THEN
    ALTER TABLE checkout_sessions ADD COLUMN teneo_user_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'identity_linked') THEN
    ALTER TABLE checkout_sessions ADD COLUMN identity_linked BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Add onboarding columns to merchant_pledges if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_pledges' AND column_name = 'onboarding_status') THEN
    ALTER TABLE merchant_pledges ADD COLUMN onboarding_status TEXT DEFAULT 'signed_up';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_pledges' AND column_name = 'wallet_provisioned_at') THEN
    ALTER TABLE merchant_pledges ADD COLUMN wallet_provisioned_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchant_pledges' AND column_name = 'default_amount_sats') THEN
    ALTER TABLE merchant_pledges ADD COLUMN default_amount_sats INTEGER;
  END IF;
END $$;
