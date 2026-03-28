# ArxMint Merchant Experience — How It Actually Works

**Updated:** 2026-03-28
**Status:** Spec + progress tracker for Phase 4.7

---

## What ArxMint Is

ArxMint is a **payment processor**, not a wallet. Like Stripe, but for Bitcoin.

- **Stripe:** Customer pays → Stripe receives → settles to merchant's bank account
- **ArxMint:** Customer pays → Phoenixd receives → **instantly auto-forwards** to merchant's own Lightning wallet

The merchant controls their own wallet (Phoenix, Wallet of Satoshi, etc). ArxMint never holds funds longer than seconds. Legal basis: Agent of Payee exemption under Colorado MTMA (C.R.S. 11-110-301(1)(b)).

## What ArxMint Provides

| Feature | What Merchant Gets | Status |
|---------|-------------------|--------|
| **Checkout page** | `arxmint.com/pay/[merchant]` — professional payment UI with Lightning QR | LIVE |
| **Embeddable widget** | One `<script>` tag on any website → "Pay with Bitcoin" button | LIVE |
| **Mobile POS** | `arxmint.com/pos/[merchant]` — keypad on phone, installable PWA | LIVE |
| **Fiat pricing** | Customer enters $50, ArxMint converts to sats at current rate | LIVE |
| **Auto-forward to merchant wallet** | Payment received → instantly forwarded to merchant's Lightning Address | NOT WIRED |
| **Payment notification email** | "You received $50.00 from checkout #ABC" | NOT WIRED |
| **Customer receipt email** | "Your payment of $50.00 to Black Bear was successful" | NOT WIRED |
| **Transaction history** | Dashboard at `/merchant-dashboard` with payment list | BUILT, NOT CONNECTED |
| **Tax CSV export** | QuickBooks-compatible 4-column CSV with USD values | BUILT, NOT TESTED |
| **Invoice emails** | Merchant sends payment request to customer's email | BUILT, NO UI |
| **BTCMap listing** | Auto-submit to global Bitcoin merchant map on first payment | BUILT |
| **Welcome email** | "You're in! Here's your QR, your pay link, your embed code" | BUILT, RESEND VERIFIED |

---

## The Ideal Merchant Journey

### Day 0: Sign Up (2 minutes)

1. Merchant goes to `arxmint.com/merchants`
2. Fills out form: business name, location, email, why they want to join
3. **Instantly approved**, appears on directory as "Founding Merchant"
4. Gets **welcome email** with:
   - Their pay link + QR code
   - "Download a Lightning wallet (Phoenix recommended)"
   - Their embed script for their website
   - Link to POS, dashboard, badge page

### Day 0: Set Up Payout (1 minute)

5. Merchant downloads Phoenix wallet on their phone
6. In Phoenix: copies their Lightning Address (e.g., `evan@phoenix.acinq.co`)
7. Goes to `arxmint.com/merchant-dashboard/setup`
8. Enters Lightning Address
9. **Done.** All future payments auto-forward to their Phoenix wallet.

### Day 1+: Accepting Payments

10. Merchant prints QR, puts in window / on business cards
11. Customer scans QR → enters amount → pays Lightning → 3 seconds → done
12. **Merchant's phone buzzes** — Phoenix notification: "Received 50,000 sats"
13. **Merchant gets email** — "Payment received: $50.00 from checkout #ABC123"
14. Customer gets receipt email (if they provided email)

### Month End: Tax Prep

15. Merchant goes to `arxmint.com/merchant-dashboard`
16. Clicks Export → selects date range → downloads CSV
17. Sends CSV to accountant → imports into QuickBooks

### Key Point

**Evan never checks a balance on arxmint.com.** His money is in his Phoenix wallet — his keys, his money. ArxMint is just the plumbing between "customer wants to pay" and "Evan's phone buzzes."

---

## Fund Flow Diagram

```
Customer                    ArxMint                     Merchant (Black Bear)
   │                           │                              │
   │  Scans QR / clicks link   │                              │
   │ ─────────────────────────>│                              │
   │                           │  Creates Lightning invoice   │
   │                           │  (Phoenixd on ArxMint VPS)   │
   │  Pays invoice (3 sec)     │                              │
   │ ─────────────────────────>│                              │
   │                           │  Payment received            │
   │                           │  ──────────────────────────> │
   │                           │  Auto-forward to merchant's  │
   │                           │  Lightning Address (instant)  │
   │                           │                              │
   │                           │  Send notification emails    │  Phone buzzes:
   │                           │  Log transaction for export  │  "Received 50,000 sats"
   │                           │                              │
   │  ArxMint custodial window: < 5 seconds                   │
   │  Merchant controls keys: Phoenix wallet on their phone   │
```

---

## Build Status

### LIVE (deployed, working)
- [x] Merchant sign-up + auto-approve + Founding Merchant badge
- [x] Checkout page (`/pay/[merchant]`) with real Lightning invoices
- [x] Embeddable widget (`embed.js` + `/checkout-embed/[merchant]`)
- [x] Mobile POS (`/pos/[merchant]`) with keypad + PWA manifest
- [x] Phoenixd + LNbits on DigitalOcean (mainnet, HTTPS via Caddy)
- [x] Per-merchant LNbits wallet isolation
- [x] BTCMap auto-submit on first payment
- [x] SSE real-time payment status stream
- [x] Supabase tables created (merchant_wallets, checkout_sessions, btcmap_submissions)
- [x] Resend domain verified

### BUILT (code exists, not fully wired)
- [x] Merchant dashboard UI (home, setup, settings)
- [x] Dashboard API routes (stats, transactions, export, settings, setup)
- [x] Welcome email template (Resend)
- [x] Invoice email template (Resend)
- [x] CSV export endpoint
- [x] Auto wallet provisioning on signup (LNbits API)

### NOT BUILT (must build)
- [ ] **Auto-forward to merchant wallet** — LNbits pay link or scheduled sweep to merchant's Lightning Address
- [ ] **Payment notification email to merchant** — "You received $50.00" on every payment
- [ ] **Customer receipt email** — "Your payment was successful" (if email provided)
- [ ] **Invoice send UI** — merchant enters customer email + amount, hits send
- [ ] **Agent of Payee ToS** — click-wrap in onboarding flow, attorney-reviewed text
- [ ] **Merchant getting started guide** — 1-page PDF for non-technical merchants

### BLOCKED
- [ ] **Sticker store** — needs OpenBazaar.ai ready
- [ ] **NFC Bolt Cards** — needs hardware ordered
- [ ] **Sovereign opt-in (NWC/Alby Hub)** — nice to have, not blocking pilot

---

## Emails ArxMint Sends

| Trigger | To | Subject | Status |
|---------|-----|---------|--------|
| Merchant signs up | Merchant | "Welcome to ArxMint — You're Founding Merchant #X!" | BUILT |
| Payment received | Merchant | "Payment received: $50.00 — Checkout #ABC123" | NOT BUILT |
| Payment received | Customer (if email provided) | "Receipt: Your $50.00 payment to Black Bear" | NOT BUILT |
| Invoice sent | Customer | "Payment request from Black Bear — 50,000 sats" | BUILT (template) |
| Day 3 follow-up | Merchant | "Have you received your first payment yet?" | NOT BUILT |
