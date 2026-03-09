# ArxMint Lightning Payments for WooCommerce

Accept Bitcoin Lightning payments in WooCommerce via ArxMint. Sovereign, non-custodial, no middleman.

## Requirements

- PHP 8.0+
- WordPress 6.0+
- WooCommerce 7.0+
- An [ArxMint merchant account](https://arxmint.com/merchants)

## Installation

### Manual (development)

1. Copy the `arxmint-woocommerce/` folder to your WordPress `wp-content/plugins/` directory
2. Activate the plugin via **Plugins → Installed Plugins** in WP Admin
3. Go to **WooCommerce → Settings → Payments**
4. Click **ArxMint Lightning → Manage**

### WordPress Plugin Directory (pending review)

Once published to wordpress.org/plugins, you'll be able to install directly from the WP Admin
plugin search. Submission is a manual process — see [Dependencies](#dependencies).

## Configuration

| Setting | Description |
|---------|-------------|
| **API Key** | From your [ArxMint merchant dashboard](https://arxmint.com/dashboard) |
| **Merchant ID** | Your store's ArxMint slug (e.g. `my-store`) |
| **Webhook Secret** | Shared secret for HMAC webhook verification |
| **Test Mode** | Points to a local ArxMint testnet instance |
| **Testnet URL** | Default: `http://localhost:3000` |

### Webhook Setup

Add your webhook URL in ArxMint's webhook settings:

```
https://yourstore.com/wc-api/arxmint-webhook
```

The webhook handler verifies the `X-ArxMint-Signature` HMAC header and marks WooCommerce
orders as paid when ArxMint confirms a Lightning payment.

## How It Works

1. Customer selects "Bitcoin (Lightning)" at WooCommerce checkout
2. Plugin calls `POST /api/checkout` → gets a Lightning invoice + checkout URL
3. Customer is redirected to `arxmint.com/pay/{merchant-id}` to scan the QR / pay
4. ArxMint sends a `payment.completed` webhook to `/wc-api/arxmint-webhook`
5. Plugin verifies HMAC, marks the order as paid, sends WooCommerce order confirmation

## File Structure

```
arxmint-woocommerce/
  arxmint-woocommerce.php         # Plugin entry point + loader
  includes/
    class-arxmint-gateway.php     # WC_Payment_Gateway subclass
    class-arxmint-api.php         # ArxMint API client
    class-arxmint-webhook.php     # Webhook handler + HMAC verification
  assets/
    arxmint-checkout.js           # Checkout page JS (payment status polling)
  readme.txt                      # WordPress plugin directory readme
```

## Currency Conversion

The plugin converts WooCommerce order totals to satoshis using the ArxMint `/api/rate` endpoint.
Fallback: 1 USD ≈ 1500 sats (update `class-arxmint-gateway.php` if you need a different fallback).

For stores denominated in BTC or SAT, no conversion is needed.

## Dependencies

- **Human action required:** Publishing to the WordPress.org plugin directory requires manual
  submission at [wordpress.org/plugins/developers/add/](https://wordpress.org/plugins/developers/add/)
  and passes through a review process (typically 1-4 weeks).

## License

MIT
