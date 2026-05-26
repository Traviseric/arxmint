# Creator Payout Forward — `POST /api/creator-payout`

**Status:** IMPLEMENTED 2026-05-25 — `lib/creator-payout.ts` (core),
`app/api/creator-payout/route.ts` (thin handler), `supabase/migrations/20260525000000_payout_forwards.sql`,
`tests/creator-payout.test.ts` (16 tests, all green). **Pending:** Supabase migration
applied to the live DB, env config, and a real end-to-end forward.
**Why:** Teneo sells a creator's book; the creator's share must reach **their**
Lightning destination, not the single hardcoded `seed-teneo` wallet. This is the
ArxMint receiver for Teneo's `payout-forwarder`.
**Caller:** `teneo-production` `Lambda/payout-forwarder/` (defines the request it sends).
**Inert until configured** — no money moves until `PHOENIXD_URL`/`PHOENIXD_API_PASSWORD`,
`MARKETPLACE_SHARED_SECRET`, and (on Teneo) `ARXMINT_PAYOUT_URL` (→ `/api/creator-payout`) are all set.

**Route name:** `/api/creator-payout` (not the bare `/api/payout` the draft proposed) —
ArxMint already has `GET /api/payouts` (merchant-scheduled payout history, `lib/payouts.ts`)
and `POST /api/settlement` (referral-fee ecash/fedimint). `creator-payout` is unambiguous and
avoids the singular/plural footgun. Teneo's `ARXMINT_PAYOUT_URL` is a full URL set in env, so
the path is not hardcoded on the caller side — point it at `/api/creator-payout`.

**Architecture:** logic in `lib/creator-payout.ts` (pure orchestration over injected store +
forwarder seams — matches the repo's "test the lib, keep the route thin" idiom); the route only
wires the real Supabase `payout_forwards` store and the `lib/lnbits` forwarders in.

---

## Contract

```
POST /api/creator-payout
Headers: X-Marketplace-Secret: <MARKETPLACE_SHARED_SECRET>   (server-to-server)
Body:
{
  "payoutId":   "po_…",                 // Teneo ledger id — idempotency key
  "merchant":   "seed-teneo",
  "amountSats":  12740,                  // creator's share, ALREADY in sats (see note)
  "destination": { "type": "bolt12" | "lnaddress", "value": "lno1…" | "user@wallet.com" },
  "reference":  { "orderId": "…", "brandId": "…", "listingId": "…" }   // optional, for logs
}

200 → { "success": true,  "status": "forwarded", "forwardId": "po_…" }
200 → { "success": false, "status": "pending",  "idempotent"?: true }   // rail not ready / in-flight / concurrent
502 → { "success": false, "status": "failed",   "error": "…" }          // forward attempt failed (caller retries)
401 → { "error": { "code": "UNAUTHORIZED", … } }
400 → validation error
```

**Amount is sats, not USD.** ArxMint has no live USD→sat oracle (`lib/merch/products.ts`
`usdToSats` is a static placeholder; checkout takes `amountSats` from the caller).
Teneo computes the creator's sats share from the original BTC sale's sats × royalty
split and passes it here. ArxMint never converts.

**Caller behavior (already built):** `payout-forwarder` posts only `pending` ledger
rows, treats `status:"forwarded"` as done, `status:"pending"` as retry-later, and a
non-2xx / `failed` as a retryable failure (max attempts then `failed`).

---

## Implementation

### 1. Idempotency table (migration)

`supabase/migrations/<ts>_payout_forwards.sql` — **required**: Phoenixd `/payoffer` is
NOT idempotent, and the caller retries, so a lost response must not double-pay.

```sql
CREATE TABLE IF NOT EXISTS payout_forwards (
  payout_id          TEXT PRIMARY KEY,          -- Teneo ledger id
  merchant_id        TEXT NOT NULL,
  amount_sats        BIGINT NOT NULL,
  destination_type   TEXT NOT NULL,             -- 'bolt12' | 'lnaddress'
  destination_prefix TEXT,                      -- first 32 chars only (never store the full offer)
  status             TEXT NOT NULL,             -- 'processing' | 'forwarded' | 'pending' | 'failed'
  forward_id         TEXT,
  error              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Route — `app/api/creator-payout/route.ts` (+ core in `lib/creator-payout.ts`)

Conventions (verified in the repo): `apiError` (`@/lib/api-error`),
`checkRateLimit`/`RATE_LIMITS` (`@/lib/rate-limit`), `logger` (`@/lib/logger`),
`getCallerFromRequest` (`@/lib/auth-middleware`), forward fns (`@/lib/lnbits`),
DB via `const { supabase } = await import("@/lib/supabase")`.

```ts
export async function POST(request: NextRequest) {
  // rate limit (RATE_LIMITS.paymentWrite) by IP -> 429 apiError
  // auth: getCallerFromRequest(request) must === "marketplace-system" else 401 apiError
  //   (this is the existing X-Marketplace-Secret === MARKETPLACE_SHARED_SECRET path)
  // parse + validate: payoutId, merchant, amountSats >= 1 (Math.floor), destination.value,
  //   destination.type in {bolt12, lnaddress} (fiat is NOT lightning -> 400)

  // --- idempotency claim ---
  // existing = supabase.from("payout_forwards").select("status,forward_id").eq("payout_id",payoutId).single()
  //   existing.status === "forwarded"  -> 200 {success:true,  status:"forwarded", forwardId, idempotent:true}
  //   existing.status === "processing" -> 200 {success:false, status:"pending",  idempotent:true}   // in-flight
  //   none -> insert {status:"processing", ...}; PK conflict -> 200 {status:"pending"} (lost race)
  //   "pending"|"failed" -> conditional update status->"processing" WHERE status IN ('pending','failed');
  //                         if .select() empty -> 200 {status:"pending"} (lost race)

  // --- forward by rail ---
  // bolt12:    forwardPaymentToBolt12Offer({ amountSats, offer: value, memo })   // Phoenixd /payoffer
  //            PRIMARY, treasury-coherent rail: the sale landed in Phoenix (seed-teneo
  //            auto-forward), so the creator's share leaves the same Phoenix node.
  // lnaddress: forwardPaymentToMerchant({ amountSats, lightningAddress: value, walletAdminKey, memo })
  //            funded from the GLOBAL LNbits wallet (process.env.LNBITS_ADMIN_KEY), not a
  //            per-merchant key — seed-teneo pays out via BOLT12 and has no lnbits sub-wallet
  //            (see 20260516000000_merchant_wallets_bolt12.sql). If LNBITS_ADMIN_KEY is unset
  //            the forwarder returns unsupported -> pending (inert), same as a missing Phoenixd env.

  // --- finalize ---
  // result.success      -> update status="forwarded";  200 {success:true, status:"forwarded", forwardId:payoutId}
  // result.unsupported  -> update status="pending";    200 {success:false,status:"pending", error}  // Phoenixd env missing
  // else (real failure) -> update status="failed";     502 {success:false,status:"failed", error}
}
```

**State machine:** `processing` is in-flight-now (short-circuit concurrent calls);
`pending` = rail not ready, safe to retry; `failed` = retry allowed; `forwarded` = done.
Only `forwarded` and `processing` short-circuit; `pending`/`failed` re-claim → re-attempt.

### 3. Test — `tests/payout.test.ts` (node `--test`)

Mock `@/lib/lnbits` forward fns + `@/lib/supabase`. Cover: auth reject (no/ bad secret);
bolt12 success → `forwarded` + row updated; lnaddress success; idempotent replay (second
call with a `forwarded` row → no second forward); unsupported (Phoenixd env missing) →
`pending`; failure → 502 `failed`; bad amount/destination → 400.

### 4. Env (already partly present)

`PHOENIXD_URL`, `PHOENIXD_API_PASSWORD` (forwarding backend — already used by
`autoForwardToMerchant`), `MARKETPLACE_SHARED_SECRET` (Teneo auth — already used by
`getCallerFromRequest`). No new secrets.

---

## Teneo side (the other half — being aligned now in teneo-production)

- `payout-forwarder` already sends this shape; reconcile: header `X-Marketplace-Secret`
  (not `x-service-key`), and send `amountSats` (creator's sats share) not `amountUSD`.
- `payout_engine.build_payout_row` gains optional `gross_sats` → `creatorShareSats`
  (same split, integer sats, marketplace absorbs the remainder).
- Remaining Teneo wire: thread the BTC sale's sats (`gross_sats`) into settlement so the
  ledger row carries `creatorShareSats` (BTC sales only; fiat sales → Stripe Connect, not
  this rail). Source: the btcpay/ArxMint sale webhook already carries the sale's sats.

---

## Why a separate payout (not a checkout-time split)

The current model forwards 100% of a sale's sats to `seed-teneo` (Travis) at checkout
(`autoForwardToMerchant`). Splitting at checkout would need per-creator destinations on
the checkout session (a bigger sub-merchant model). Instead, Teneo — which owns the sale
→ creator → split ledger — initiates a **separate** payout of the creator's share from the
ArxMint/Phoenixd wallet to the creator's offer. Smaller, and keeps the canonical split in
Teneo. (A future optimization can split at checkout once destinations live on the session.)

## Non-goals
- No USD↔sat conversion in ArxMint (caller sends sats).
- No new merchant/sub-merchant model (destination travels in the request).
- No Stripe/fiat payout here (fiat creator payout = Stripe Connect, Teneo-side, separate).
