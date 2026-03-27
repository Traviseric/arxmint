# Merchant Dashboard MVP — Spec

**Phase:** 4.7 Milestone 2
**Goal:** Self-service merchant experience. Merchant signs up, enters 3 fields, starts accepting Lightning payments. No manual intervention from ArxMint operator after initial pilot setup.
**Research basis:** `docs/research/7-ArxMint Merchant Payment Operations Research.md`

---

## Onboarding Flow (3 fields → live)

### Step 1: Merchant signs up at `/merchants`
Already built. Auto-approved, gets Founding Merchant badge (first 20).

### Step 2: Merchant completes payment setup at `/merchant-dashboard/setup`
New page. Shown after signup or when merchant clicks "Set Up Payments" from their listing.

**Fields:**
1. **Email** — for payment notifications and invoice delivery (already collected in signup)
2. **Payout address** — Lightning Address (e.g., `evan@walletofsatoshi.com`) or on-chain BTC address. This is where funds auto-sweep.
3. **Telegram handle** (optional) — for instant payment notifications via existing ArxMint Telegram bot

**On submit (automated, no human needed):**
1. Call LNbits API `POST /api/v1/wallets` to create a merchant wallet
2. Store wallet ID + invoice key + admin key in Supabase `merchant_wallets` table (encrypted)
3. Configure LNbits auto-forward to merchant's payout address
4. Set `checkoutEnabled: true` on the merchant's pledge record
5. Redirect to dashboard

### Step 3: Merchant is live
Their pay link works immediately: `arxmint.com/pay/[merchant-id]`

---

## Dashboard Pages

### `/merchant-dashboard` — Home (requires auth)

**Layout:** Clean, light theme (matches `/merchants` page). Mobile-first.

**Components:**

#### Payment Link Card
- Shareable link: `arxmint.com/pay/[merchant-id]`
- Copy button
- QR code (Unified BIP21 — works with any wallet)
- "Print QR" button (generates printable PDF for storefront window)
- "Open POS" button → links to `/pos/[merchant-id]` (Phase 4.7 POS PWA)

#### Today's Activity
- Total received today (sats + USD equivalent)
- Number of payments today
- Most recent payment (amount, time, status)

#### Transaction List
- Chronological list of payments
- Each row: date/time, amount (sats), USD equivalent at time of payment, status (paid/pending/expired)
- Pagination (10 per page)
- Data source: LNbits API `/api/v1/payments` filtered by merchant's wallet key
- Search/filter by date range

#### Balance & Payouts
- Current LNbits wallet balance (should be ~0 if auto-forward is working)
- Payout address displayed
- "Change payout address" button
- Last successful payout timestamp
- If balance > 0: "Withdraw Now" button (manual sweep trigger)

### `/merchant-dashboard/settings` — Configuration

**Sections:**

#### Business Info
- Business name, location, category, logo, website (pre-filled from signup)
- Edit button → updates Supabase `merchant_pledges` table

#### Payment Settings
- Payout address (Lightning Address or BTC)
- Default amount (optional — pre-fills checkout with a fixed amount)
- Custom memo template (e.g., "Thanks for choosing Black Bear!")

#### Notifications
- Telegram notification toggle + handle
- Email notification toggle
- Webhook URL (advanced — for merchants with their own systems)

#### API Keys
- Show invoice/read key (for POS integration or custom checkout)
- Regenerate key button
- API docs link

#### Export
- "Download CSV" button → QuickBooks-compatible 4-column format (Date, Description, Credit, Debit)
- Date range picker
- USD values use historical exchange rate at time of each payment

---

## Database Schema

### New table: `merchant_wallets` (Supabase)

```sql
CREATE TABLE merchant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL REFERENCES merchant_pledges(id),
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

-- RLS: merchant can only see their own wallet
ALTER TABLE merchant_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_own_wallet" ON merchant_wallets
  FOR ALL USING (merchant_id = current_setting('app.merchant_id'));
```

---

## API Routes

### `POST /api/merchant-dashboard/setup`
- Auth: requires merchant session (Nostr NIP-98 or email magic link)
- Body: `{ payoutAddress, payoutType, telegramHandle? }`
- Creates LNbits wallet via API
- Stores credentials in `merchant_wallets`
- Enables checkout
- Returns: `{ success: true, paymentLink }`

### `GET /api/merchant-dashboard/stats`
- Auth: merchant session
- Returns: today's total, payment count, recent transactions
- Data source: LNbits `/api/v1/payments` with merchant's invoice key

### `GET /api/merchant-dashboard/transactions`
- Auth: merchant session
- Query params: `?page=1&limit=10&from=2026-03-01&to=2026-03-27`
- Returns: paginated transaction list with USD conversion
- Data source: LNbits API

### `POST /api/merchant-dashboard/withdraw`
- Auth: merchant session
- Triggers manual sweep from LNbits wallet to payout address
- Uses LNbits admin key to pay out

### `GET /api/merchant-dashboard/export`
- Auth: merchant session
- Query params: `?from=2026-03-01&to=2026-03-27&format=csv`
- Returns: QuickBooks 4-column CSV download

### `PUT /api/merchant-dashboard/settings`
- Auth: merchant session
- Body: partial update of payout address, notifications, webhook URL, etc.

---

## Tech Stack

- **Pages:** Next.js 15 App Router, Server Actions for form submissions
- **Auth:** Nostr NIP-98 (existing) or email magic link (existing Auth.js setup)
- **Data:** Supabase for merchant_wallets table, LNbits API for transaction data
- **UI:** Tailwind CSS, merchant light theme (existing `data-theme="merchant"`)
- **QR:** `qrcode.react` or `@bitjson/qr-code` for Unified BIP21
- **PDF:** `@react-pdf/renderer` for printable QR sheets
- **CSV:** Server Action streaming response

---

## Implementation Order

```
1. merchant_wallets Supabase table + RLS          (1 day)
2. POST /api/merchant-dashboard/setup              (2 days)
   - LNbits wallet creation via API
   - Auto-forward configuration
   - Enable checkout flag
3. /merchant-dashboard page                        (2 days)
   - Payment link + QR card
   - Transaction list (LNbits API)
   - Balance display
4. /merchant-dashboard/settings page               (1 day)
   - Payout address, notifications, API keys
5. GET /api/merchant-dashboard/export (CSV)         (1 day)
6. Telegram payment notifications                   (1 day)
7. Print QR / POS link                             (0.5 day)
```

**Total: ~8.5 days of agent work**

---

## What the Merchant Sees (User Journey)

### Day 0: Sign up
1. Goes to `arxmint.com/merchants`
2. Fills out signup form (business name, location, etc.)
3. Instantly appears on the directory as "Founding Merchant"
4. Gets email: "Welcome! Set up payments →"

### Day 0: Payment setup (2 minutes)
1. Clicks link → `/merchant-dashboard/setup`
2. Enters payout Lightning Address (e.g., from Wallet of Satoshi, Phoenix, Cash App)
3. Optionally enters Telegram handle
4. Clicks "Start Accepting Bitcoin"
5. Sees their payment link + QR code

### Day 1+: Accepting payments
1. Prints QR code, puts in window / on business card / in email signature
2. Customer scans QR → pays Lightning → 3 seconds → done
3. Merchant gets Telegram ping: "⚡ 50,000 sats received"
4. Funds auto-sweep to their personal wallet
5. Checks dashboard anytime for transaction history

### Month end: Tax prep
1. Opens dashboard → Export → selects date range → downloads CSV
2. Sends CSV to accountant → imports into QuickBooks
3. Done

---

## What ArxMint Operator Does (for pilot)

### Currently (before dashboard is built):
- Manually create LNbits wallet per merchant
- Manually configure auto-forward
- Manually set env vars / enable checkout

### After dashboard is built:
- Nothing per-merchant — it's all automated
- Monitor LNbits admin for node health
- Monitor Phoenixd for liquidity / channel status
- Handle support questions in Discord/Matrix

---

## Open Questions (decide during implementation)

1. **Auth for merchants:** Do we use the existing Nostr NIP-98 login, or add email magic link for non-technical merchants? (Research recommends both via Auth.js)
2. **LNbits wallet creation:** Does the LNbits API support creating wallets programmatically, or does it require the super-user admin key? Need to verify.
3. **Auto-forward:** Does LNbits have an API for configuring the Scrub/Auto-forward extension, or is it UI-only? May need to use the LNbits extensions API.
4. **Price oracle:** Which BTC/USD price feed for the dashboard? CoinGecko (free, rate-limited) vs Kraken (reliable) vs Mempool.space (Bitcoin-native).
