# ArxMint Embeddable Checkout Widget — Spec

**Goal:** One script tag on any website → "Pay with Bitcoin" button → modal checkout → Lightning payment → done. Merchant's customer never leaves the merchant's site.

---

## Usage

### Minimal (button with custom amount)
```html
<script src="https://arxmint.com/embed.js" data-merchant="black-bear"></script>
```
Renders an orange "Pay with Bitcoin ⚡" button. Customer clicks → modal opens → enters amount → gets Lightning QR → pays.

### Fixed amount (product/service checkout)
```html
<script src="https://arxmint.com/embed.js"
        data-merchant="black-bear"
        data-amount="25000"
        data-memo="Window cleaning - standard">
</script>
```
Skips amount entry. Modal opens directly to QR code for 25,000 sats.

### Styled to match merchant site
```html
<script src="https://arxmint.com/embed.js"
        data-merchant="black-bear"
        data-theme="light"
        data-button-text="Pay with Bitcoin"
        data-accent="#F7931A">
</script>
```

### Multiple buttons on one page
```html
<div class="arxmint-pay" data-merchant="black-bear" data-amount="25000" data-memo="Standard clean"></div>
<div class="arxmint-pay" data-merchant="black-bear" data-amount="50000" data-memo="Deep clean"></div>
<script src="https://arxmint.com/embed.js"></script>
```

---

## How It Works

### 1. Script loads on merchant's page
- `embed.js` is a small (~5KB gzipped) vanilla JS script
- No React, no framework dependencies
- Finds all `<script>` or `<div class="arxmint-pay">` elements with `data-merchant`
- Renders a button for each

### 2. Customer clicks button
- Opens a modal overlay (iframe pointing to `arxmint.com/checkout-embed/[merchant-id]`)
- iframe approach means:
  - Checkout code runs on arxmint.com domain (secure, no CORS issues)
  - Merchant site can't access payment data (security)
  - Widget auto-updates without merchant changing anything

### 3. Checkout flow inside modal
- If `data-amount` set: show QR immediately
- If no amount: show amount input → then QR
- QR is Unified BIP21 (Lightning + on-chain fallback)
- Polls `/api/checkout/status/[id]` every 2 seconds
- On payment confirmed: shows green checkmark + "Payment Complete"

### 4. Post-payment
- Fires a `postMessage` event to parent window: `{ event: 'arxmint:payment', status: 'paid', amount: 25000 }`
- Merchant's JS can listen for this to trigger their own logic (redirect, show receipt, etc.)
- Modal auto-closes after 3 seconds or on click

---

## Files to Create

### `public/embed.js` — The embed script
Vanilla JS. No build step needed. Served as static file from Vercel.

```
Responsibilities:
- Parse data attributes from script/div elements
- Render button(s) on the merchant's page
- On click: create iframe modal overlay
- Listen for postMessage from iframe
- Dispatch custom events on the merchant's page
- Handle modal close (X button, escape key, click outside)
```

### `app/checkout-embed/[merchant-id]/page.tsx` — Embedded checkout page
Minimal checkout UI designed for iframe context:

```
Responsibilities:
- Amount input (if not pre-set)
- Call POST /api/checkout to create invoice
- Display QR code
- Poll for payment status
- Post message to parent on completion
- Styled for iframe (no nav, no footer, compact)
```

---

## embed.js Implementation

```javascript
// ~150 lines, vanilla JS, no dependencies
// Self-executing, finds elements, renders buttons, manages modals

Features:
- data-merchant (required) — merchant ID
- data-amount (optional) — fixed amount in sats
- data-memo (optional) — payment memo
- data-theme (optional) — "light" | "dark" (default: light)
- data-button-text (optional) — custom button label
- data-accent (optional) — hex color for button
- data-currency (optional) — "sats" | "usd" (default: sats)
- data-success-url (optional) — redirect after payment
- data-on-payment (optional) — JS callback function name

Button styling:
- Default: orange (#F7931A) rounded button with ⚡ icon
- Inherits font from parent page
- Responsive (full-width on mobile)
- Accessible (keyboard focus, aria labels)

Modal:
- Full-screen overlay with centered white card
- iframe inside the card
- X close button top-right
- Click outside to close
- Escape key to close
- Mobile: slides up from bottom (sheet style)
- z-index: 999999 (above everything)
```

---

## Checkout Embed Page

### Route: `/checkout-embed/[merchant-id]`

Compact checkout designed for iframe:

```
States:
1. AMOUNT — numeric keypad (if no preset amount)
   - Large number display
   - USD/sats toggle
   - "Pay" button

2. INVOICE — QR code display
   - Unified BIP21 QR (large, scannable)
   - Amount shown
   - "Open in wallet" deep link (lightning: protocol)
   - "Copy invoice" button
   - Countdown timer (10 min expiry)
   - Spinner: "Waiting for payment..."

3. PAID — confirmation
   - Green checkmark animation
   - "Payment received!"
   - Amount + merchant name
   - Auto-posts message to parent
   - Auto-closes after 3 seconds

4. EXPIRED — invoice timed out
   - "Invoice expired"
   - "Try again" button → back to AMOUNT or INVOICE
```

### Styling
- No ArxMint nav/footer — clean, minimal
- White background (light theme) or dark
- Merchant name + logo at top (fetched from pledge data)
- "Powered by ArxMint" small text at bottom (links to arxmint.com)
- Max-width: 400px, centered
- Font: system font stack (matches any site)

---

## API Changes

### Existing: `POST /api/checkout`
Already works. No changes needed. The embed page calls this same endpoint.

### Existing: `GET /api/checkout/status/[id]`
Already works with LNbits payment checking. No changes needed.

### New: CORS headers for embed
Add `Access-Control-Allow-Origin` headers to checkout API routes so the iframe can communicate:
- `/api/checkout` — allow `*` (POST creates invoice, no sensitive data exposed)
- `/api/checkout/status/*` — allow `*` (GET returns payment status only)

Actually, since we use an iframe (not cross-origin fetch), CORS isn't needed. The iframe loads `arxmint.com` pages which call `arxmint.com` APIs — same origin.

---

## Security

- **iframe sandbox:** The iframe runs on `arxmint.com`, isolated from the merchant's page
- **postMessage origin check:** Only accept messages from `arxmint.com` origin
- **No sensitive data in URL:** Amount and memo are passed via URL params but contain no secrets
- **Rate limiting:** Existing checkout rate limits apply (10/hour per IP)
- **CSP:** Add `frame-ancestors *` to the embed checkout page so it can be iframed from any domain

---

## Implementation Order

```
1. public/embed.js                              (1 day)
   - Button rendering
   - Modal/iframe management
   - postMessage handling

2. app/checkout-embed/[merchant-id]/page.tsx     (2 days)
   - Compact checkout UI
   - Amount input with USD/sats toggle
   - QR display + polling
   - Payment confirmation + postMessage
   - frame-ancestors CSP header

3. Test on glacierparlor.com + teneo.io          (0.5 day)
   - Drop script tag on both sites
   - Test full payment flow

4. Docs: embed integration guide                 (0.5 day)
   - Copy-paste examples
   - All data attributes documented
   - JS event listener examples
```

**Total: ~4 days**

---

## Example: Black Bear Window Cleaning

On `blackbearwindowcleaning.com`, Evan adds to his site footer:
```html
<script src="https://arxmint.com/embed.js" data-merchant="black-bear"></script>
```

His customers see an orange "Pay with Bitcoin ⚡" button. Click → enter amount → scan QR → paid. Evan gets a Telegram ping. Done.

## Example: Glacier Ice Cream

On `glacierparlor.com`, product page for a waffle cone:
```html
<div class="arxmint-pay"
     data-merchant="seed-glacier"
     data-amount="500"
     data-memo="Waffle cone"
     data-button-text="Pay 500 sats ⚡">
</div>
<script src="https://arxmint.com/embed.js"></script>
```

## Example: Teneo

On `teneo.io`, subscription checkout:
```html
<script src="https://arxmint.com/embed.js"
        data-merchant="seed-teneo"
        data-amount="1000"
        data-memo="Monthly subscription"
        data-success-url="https://teneo.io/welcome"
        data-theme="dark">
</script>
```
After payment, customer redirected to `/welcome`.
