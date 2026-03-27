-- ============================================================
-- ArxMint — Checkout Identity Link
-- Migration: 20260329000000_checkout_identity_link.sql
--
-- Adds identity-linking fields to checkout_sessions:
--   • identity_linked  — was cross-auth linking performed for this session?
--   • privacy_level    — customer's privacy preference (standard / maximum)
--   • nostr_pubkey     — Nostr pubkey detected at checkout creation (for webhook retry)
--   • teneo_user_id    — Teneo-auth userId detected at checkout creation (for webhook retry)
--
-- Also enables RLS on identity_aliases with policies that restrict
-- row access to the root user or service-role callers.
-- ============================================================

-- ============================================================
-- 1. checkout_sessions — add identity tracking columns
-- ============================================================

ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS identity_linked  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_level    TEXT    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS nostr_pubkey     TEXT,
  ADD COLUMN IF NOT EXISTS teneo_user_id    TEXT;

-- ============================================================
-- 2. identity_aliases — enable RLS
-- ============================================================

ALTER TABLE identity_aliases ENABLE ROW LEVEL SECURITY;

-- Users can read their own aliases (by root_id matching their auth UID).
-- Service role bypasses this automatically.
CREATE POLICY "identity_aliases_owner_select"
  ON identity_aliases
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND root_id = auth.uid()::text
  );

-- INSERT/UPDATE/DELETE are server-side only (service role).
-- No user-facing write policies — identity linking is performed by API routes.
