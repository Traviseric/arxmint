=== ArxMint Lightning Payments ===
Contributors: arxmint
Tags: bitcoin, lightning, payments, woocommerce, l402
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 0.1.0
Requires PHP: 8.0
WC requires at least: 7.0
WC tested up to: 9.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Accept Bitcoin Lightning payments in WooCommerce via ArxMint. Sovereign, no middleman.

== Description ==

ArxMint Lightning Payments lets your WooCommerce store accept Bitcoin via the Lightning Network.
Payments settle directly to your Lightning node — ArxMint never holds your funds.

**Features:**

* One-click Lightning checkout — customers scan a QR or pay from any Lightning wallet
* Automatic order fulfillment via HMAC-verified webhooks
* Test mode support against a local ArxMint testnet instance
* HPOS (High-Performance Order Storage) compatible
* No KYC, no custodian, sovereign by design

**How it works:**

1. Customer selects "Bitcoin (Lightning)" at checkout
2. WooCommerce creates an ArxMint checkout session via the `/api/checkout` API
3. Customer is redirected to the ArxMint hosted payment page with a Lightning invoice
4. On payment, ArxMint calls your `/wc-api/arxmint-webhook` endpoint
5. WooCommerce order is automatically marked as paid

== Installation ==

1. Upload the `arxmint-woocommerce` folder to `/wp-content/plugins/`
2. Activate the plugin via the **Plugins** menu in WordPress
3. Go to **WooCommerce → Settings → Payments → ArxMint Lightning**
4. Enter your API key and merchant ID (from your ArxMint merchant dashboard)
5. Copy your webhook URL and add it to your ArxMint webhook settings

== Configuration ==

= API Key =
Get this from your [ArxMint merchant dashboard](https://arxmint.com/dashboard).

= Merchant ID =
Your store's ArxMint slug (e.g. `my-store`).

= Webhook Secret =
Set a strong random string in both this plugin and your ArxMint webhook settings.
Your webhook endpoint: `https://yourstore.com/wc-api/arxmint-webhook`

= Test Mode =
Enable to point API calls to a local ArxMint instance (default: `http://localhost:3000`).
Useful for integration testing with regtest Lightning.

== Frequently Asked Questions ==

= What currencies are supported? =

The plugin converts your WooCommerce store currency to satoshis using the ArxMint rate API.
BTC and SAT denominated stores work natively. For USD/EUR stores, a live rate is fetched;
if unavailable, a fallback rate is used (update the fallback in `class-arxmint-gateway.php`
for your preferred rate source).

= Does ArxMint hold my funds? =

No. ArxMint is non-custodial. Payments route directly through your connected Lightning node.

= Is there a fee? =

ArxMint charges no protocol fee. You pay only normal Lightning routing fees (typically <1%).

== Changelog ==

= 0.1.0 =
* Initial release — WC_Payment_Gateway integration, webhook handler, admin settings.

== Upgrade Notice ==

= 0.1.0 =
First public release.
