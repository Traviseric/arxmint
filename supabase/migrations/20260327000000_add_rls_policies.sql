-- ============================================================
-- ArxMint — Row Level Security Policies
-- Migration: 20260327000000_add_rls_policies.sql
--
-- Protects merchant data isolation across three tables:
--   • invoices          (Prisma Invoice model, @@map("invoices"))
--   • checkout_sessions (payment sessions created by checkout API)
--   • merchant_pledges  (merchant onboarding / directory)
--
-- All server-side API routes use SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS automatically — these policies apply to direct
-- Supabase client access (anon key / authenticated users).
-- ============================================================

-- ============================================================
-- 1. invoices table
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Merchants can only SELECT their own invoices.
-- merchant_id is nullable; null rows are not returned to authenticated users.
CREATE POLICY "invoices_merchant_select"
  ON invoices
  FOR SELECT
  USING (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  );

-- Merchants can only INSERT invoices attributed to themselves.
CREATE POLICY "invoices_merchant_insert"
  ON invoices
  FOR INSERT
  WITH CHECK (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  );

-- Merchants can only UPDATE their own invoices.
CREATE POLICY "invoices_merchant_update"
  ON invoices
  FOR UPDATE
  USING (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  )
  WITH CHECK (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  );

-- ============================================================
-- 2. checkout_sessions table
-- ============================================================

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Merchants can only SELECT their own payment sessions.
CREATE POLICY "checkout_sessions_merchant_select"
  ON checkout_sessions
  FOR SELECT
  USING (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  );

-- INSERT is server-side only (service role); no user INSERT policy.
-- If a user somehow calls INSERT without service role, it is denied.

-- Merchants can see status updates for their own sessions.
CREATE POLICY "checkout_sessions_merchant_update"
  ON checkout_sessions
  FOR UPDATE
  USING (
    merchant_id IS NOT NULL
    AND merchant_id = auth.uid()::text
  );

-- ============================================================
-- 3. merchant_pledges table
-- ============================================================

ALTER TABLE merchant_pledges ENABLE ROW LEVEL SECURITY;

-- Public: anyone can view approved, featured merchants (directory listing).
CREATE POLICY "merchant_pledges_public_approved_select"
  ON merchant_pledges
  FOR SELECT
  USING (approved = true AND featured = true);

-- Authenticated: merchants can view their own pledge (including unapproved).
-- Matches on email since merchant_pledges.id is a cuid, not a Supabase auth UUID.
CREATE POLICY "merchant_pledges_own_select"
  ON merchant_pledges
  FOR SELECT
  USING (
    auth.jwt() IS NOT NULL
    AND email = auth.email()
  );

-- Public: anyone can submit a pledge (onboarding sign-up flow).
-- Server-side validation still applies via API route logic.
CREATE POLICY "merchant_pledges_public_insert"
  ON merchant_pledges
  FOR INSERT
  WITH CHECK (true);

-- Only service role can UPDATE or DELETE pledges (approval workflow is server-side).
-- No authenticated-user UPDATE/DELETE policies — those are admin operations only.
