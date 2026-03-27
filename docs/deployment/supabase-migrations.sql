-- ============================================================
-- ArxMint — Supabase Migrations for Phase 4.7
-- Run in Supabase Dashboard → SQL Editor
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

-- Allow service role full access (server-side API routes)
CREATE POLICY "service_role_all" ON merchant_wallets
  FOR ALL USING (true) WITH CHECK (true);

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

-- Allow service role full access
CREATE POLICY "service_role_all" ON btcmap_submissions
  FOR ALL USING (true) WITH CHECK (true);

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
