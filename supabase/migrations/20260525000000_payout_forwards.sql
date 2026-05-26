-- ============================================================
-- ArxMint — Creator payout-forward idempotency ledger
-- Migration: 20260525000000_payout_forwards.sql
--
-- Receiver-side idempotency for Teneo's creator payouts (POST /api/creator-payout).
-- Phoenixd /payoffer is NOT idempotent and the Teneo payout-forwarder retries,
-- so a lost HTTP response must never double-pay. The route claims a row
-- (status='processing') before forwarding and finalizes it after.
--
-- Distinct from the merchant-scheduled `payouts` table (lib/payouts.ts) and the
-- referral-fee `settlement` flow — this tracks per-order creator-share forwards
-- keyed by the Teneo ledger id.
--
-- Written only by server-side API routes using SUPABASE_SERVICE_ROLE_KEY
-- (service_role bypasses RLS). RLS is enabled with no public policies so
-- anon/authenticated clients are denied by default — same posture as the
-- merchant/payment tables hardened in 20260514000000_harden_merchant_payment_rls.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS payout_forwards (
  payout_id          TEXT PRIMARY KEY,            -- Teneo ledger id (idempotency key)
  merchant_id        TEXT NOT NULL,
  amount_sats        BIGINT NOT NULL,
  destination_type   TEXT NOT NULL CHECK (destination_type IN ('bolt12', 'lnaddress')),
  destination_prefix TEXT,                         -- first 32 chars only; never store the full offer/address
  status             TEXT NOT NULL DEFAULT 'processing'
                       CHECK (status IN ('processing', 'forwarded', 'pending', 'failed')),
  forward_id         TEXT,
  error              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_forwards_merchant_idx ON payout_forwards (merchant_id);
CREATE INDEX IF NOT EXISTS payout_forwards_status_idx   ON payout_forwards (status);

ALTER TABLE payout_forwards ENABLE ROW LEVEL SECURITY;

-- Defense in depth: deny direct table access to the public API roles. Only the
-- service-role server routes touch this table.
REVOKE ALL ON TABLE payout_forwards FROM anon, authenticated;
GRANT ALL ON TABLE payout_forwards TO service_role;
