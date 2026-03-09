# ArxMint Zapier Integration

Connect ArxMint Lightning payments to 5000+ apps — CRMs, spreadsheets, Slack, email, and more.
No code required for merchants; power users can extend with the Zapier CLI.

## Triggers

| Trigger | Description |
|---------|-------------|
| **Payment Received** | Fires when a Lightning payment is confirmed |
| **New Merchant Signup** | Fires when a merchant joins the ArxMint network |

## Actions

| Action | Description |
|--------|-------------|
| **Create Lightning Invoice** | Generate a payment request from any Zapier trigger |

## Searches

| Search | Description |
|--------|-------------|
| **Find Merchant** | Look up a merchant by name, slug, or city |

## Example Zaps

- **New Payment → Add row to Google Sheets** — auto-log every Bitcoin payment in your accounting spreadsheet
- **New Payment → Send Slack message** — notify your team when a customer pays
- **New Merchant Signup → Add to Mailchimp** — welcome new Citadel merchants automatically
- **New Shopify Order → Create Lightning Invoice** — generate a payment request for every new order

## Setup

### Authentication

1. Go to [zapier.com](https://zapier.com) → My Apps → Add Connection → ArxMint
2. Enter your **API Key** (from your [ArxMint merchant dashboard](https://arxmint.com/dashboard))
3. Enter your **Merchant ID** (your store's ArxMint slug)

### Webhook Triggers

The **Payment Received** and **New Merchant Signup** triggers use webhooks for real-time delivery.
Zapier automatically registers the webhook URL with ArxMint when you activate a Zap.

## Development (Zapier CLI)

```bash
# Install dependencies
npm install

# Authenticate with Zapier
npx zapier login

# Validate the app definition
npm run validate

# Run tests
npm test

# Push to Zapier (creates/updates the integration)
npm run push
```

### Requirements

- Node.js 18+
- A [Zapier developer account](https://developer.zapier.com/)
- `zapier-platform-core` 15.5+

### Running Tests

```bash
npm test
```

Tests use Jest and mock `zapier-platform-core`'s `z` object.

## File Structure

```
packages/zapier/
  index.js                        # Zapier app definition + auth
  triggers/
    payment_received.js           # Trigger: new Lightning payment
    merchant_signup.js            # Trigger: new merchant joined
  creates/
    create_invoice.js             # Action: create Lightning invoice
  searches/
    find_merchant.js              # Search: find merchant by name/slug
  .zapierapprc                    # Zapier app ID config (update after registration)
  package.json
```

## Dependencies

- **Human action required:** Publishing the integration to the Zapier App Directory requires
  a Zapier Partner review. Submit at [developer.zapier.com](https://developer.zapier.com/).
  Review typically takes 2-4 weeks. Until approved, the integration can be used privately
  or shared via invite link.

## License

MIT
