-- ============================================================
-- ArxMint — Merchant/payment table RLS hardening
-- Migration: 20260514000000_harden_merchant_payment_rls.sql
--
-- The application accesses these tables through server-side API routes using
-- SUPABASE_SERVICE_ROLE_KEY. Supabase service_role bypasses RLS, so broad
-- public policies are unnecessary and risky.
-- ============================================================

-- Remove legacy broad policies from earlier supplemental SQL runs.
DROP POLICY IF EXISTS "service_role_all" ON merchant_wallets;
DROP POLICY IF EXISTS "service_role_all_merchant_wallets" ON merchant_wallets;
DROP POLICY IF EXISTS "service_role_all" ON btcmap_submissions;
DROP POLICY IF EXISTS "service_role_all_btcmap" ON btcmap_submissions;
DROP POLICY IF EXISTS "service_role_all_checkout" ON checkout_sessions;

-- Remove draft direct-client policies that assume auth.uid() equals merchant ids.
DROP POLICY IF EXISTS "invoices_merchant_select" ON invoices;
DROP POLICY IF EXISTS "invoices_merchant_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_merchant_update" ON invoices;
DROP POLICY IF EXISTS "checkout_sessions_merchant_select" ON checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_merchant_update" ON checkout_sessions;
DROP POLICY IF EXISTS "merchant_pledges_public_approved_select" ON merchant_pledges;
DROP POLICY IF EXISTS "merchant_pledges_own_select" ON merchant_pledges;
DROP POLICY IF EXISTS "merchant_pledges_public_insert" ON merchant_pledges;

-- Enable RLS on all merchant/payment tables. Service-role server routes bypass
-- RLS; anon/authenticated clients are denied unless a future explicit policy is
-- added for a specific direct-client use case.
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE btcmap_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Defense in depth: remove direct table privileges from public API roles.
REVOKE ALL ON TABLE merchant_wallets FROM anon, authenticated;
REVOKE ALL ON TABLE btcmap_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE checkout_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE merchant_pledges FROM anon, authenticated;
REVOKE ALL ON TABLE invoices FROM anon, authenticated;
REVOKE ALL ON TABLE invoice_line_items FROM anon, authenticated;

-- Keep service role explicit for operational clarity, even though it bypasses
-- RLS in Supabase.
GRANT ALL ON TABLE merchant_wallets TO service_role;
GRANT ALL ON TABLE btcmap_submissions TO service_role;
GRANT ALL ON TABLE checkout_sessions TO service_role;
GRANT ALL ON TABLE merchant_pledges TO service_role;
GRANT ALL ON TABLE invoices TO service_role;
GRANT ALL ON TABLE invoice_line_items TO service_role;
