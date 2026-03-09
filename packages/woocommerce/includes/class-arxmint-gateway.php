<?php
/**
 * WooCommerce payment gateway: ArxMint Lightning.
 */

defined( 'ABSPATH' ) || exit;

class ArxMint_Gateway extends WC_Payment_Gateway {

    public function __construct() {
        $this->id                 = 'arxmint';
        $this->icon               = ARXMINT_WC_PLUGIN_URL . 'assets/icon.svg';
        $this->has_fields         = false;
        $this->method_title       = __( 'ArxMint Lightning', 'arxmint-woocommerce' );
        $this->method_description = __( 'Accept Bitcoin Lightning payments via ArxMint. Funds settle directly to your Lightning node — no custodian.', 'arxmint-woocommerce' );
        $this->supports           = [ 'products' ];

        $this->init_form_fields();
        $this->init_settings();

        $this->title       = $this->get_option( 'title' );
        $this->description = $this->get_option( 'description' );
        $this->enabled     = $this->get_option( 'enabled' );

        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );
        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'save_webhook_secret' ] );
    }

    /**
     * Admin settings fields.
     */
    public function init_form_fields(): void {
        $this->form_fields = [
            'enabled'         => [
                'title'   => __( 'Enable/Disable', 'arxmint-woocommerce' ),
                'type'    => 'checkbox',
                'label'   => __( 'Enable ArxMint Lightning Payments', 'arxmint-woocommerce' ),
                'default' => 'no',
            ],
            'title'           => [
                'title'       => __( 'Title', 'arxmint-woocommerce' ),
                'type'        => 'text',
                'description' => __( 'Payment method title shown to customers.', 'arxmint-woocommerce' ),
                'default'     => __( 'Bitcoin (Lightning)', 'arxmint-woocommerce' ),
                'desc_tip'    => true,
            ],
            'description'     => [
                'title'       => __( 'Description', 'arxmint-woocommerce' ),
                'type'        => 'textarea',
                'description' => __( 'Shown on the checkout page below the payment method name.', 'arxmint-woocommerce' ),
                'default'     => __( 'Pay instantly with Bitcoin via Lightning Network. No sign-up required.', 'arxmint-woocommerce' ),
            ],
            'api_key'         => [
                'title'       => __( 'ArxMint API Key', 'arxmint-woocommerce' ),
                'type'        => 'password',
                'description' => __( 'Found in your ArxMint merchant dashboard.', 'arxmint-woocommerce' ),
                'default'     => '',
                'desc_tip'    => true,
            ],
            'merchant_id'     => [
                'title'       => __( 'Merchant ID / Slug', 'arxmint-woocommerce' ),
                'type'        => 'text',
                'description' => __( 'Your ArxMint merchant slug (e.g. "my-store").', 'arxmint-woocommerce' ),
                'default'     => '',
                'desc_tip'    => true,
            ],
            'webhook_secret'  => [
                'title'       => __( 'Webhook Secret', 'arxmint-woocommerce' ),
                'type'        => 'password',
                'description' => sprintf(
                    /* translators: webhook URL */
                    __( 'Set this in your ArxMint webhook settings. Your webhook URL is: %s', 'arxmint-woocommerce' ),
                    '<code>' . get_site_url() . '/wc-api/arxmint-webhook</code>'
                ),
                'default'     => '',
            ],
            'testmode'        => [
                'title'       => __( 'Test Mode', 'arxmint-woocommerce' ),
                'type'        => 'checkbox',
                'label'       => __( 'Use testnet / regtest ArxMint instance', 'arxmint-woocommerce' ),
                'default'     => 'no',
                'description' => __( 'Points API calls to your local ArxMint testnet node.', 'arxmint-woocommerce' ),
            ],
            'testnet_url'     => [
                'title'       => __( 'Testnet URL', 'arxmint-woocommerce' ),
                'type'        => 'text',
                'description' => __( 'ArxMint testnet base URL (only used when Test Mode is on).', 'arxmint-woocommerce' ),
                'default'     => 'http://localhost:3000',
                'desc_tip'    => true,
            ],
            'connection_test' => [
                'title'       => __( 'Connection Test', 'arxmint-woocommerce' ),
                'type'        => 'button',
                'custom_attributes' => [ 'id' => 'arxmint-test-connection' ],
                'description' => __( 'Test that your API key is valid.', 'arxmint-woocommerce' ),
                'button_text' => __( 'Test Connection', 'arxmint-woocommerce' ),
            ],
        ];
    }

    /**
     * Persist webhook secret to its own option (used by webhook handler).
     */
    public function save_webhook_secret(): void {
        $secret = $this->get_option( 'webhook_secret' );
        if ( $secret ) {
            update_option( 'arxmint_webhook_secret', $secret );
        }
    }

    /**
     * Build a configured API client.
     */
    private function get_api(): ArxMint_API {
        $testmode = $this->get_option( 'testmode' ) === 'yes';
        $base_url = $testmode
            ? $this->get_option( 'testnet_url', 'http://localhost:3000' )
            : 'https://arxmint.com';

        return new ArxMint_API( $this->get_option( 'api_key' ), $base_url );
    }

    /**
     * Process the payment — create an ArxMint checkout session and redirect.
     */
    public function process_payment( $order_id ): array {
        $order       = wc_get_order( $order_id );
        $merchant_id = $this->get_option( 'merchant_id' );

        if ( ! $merchant_id ) {
            wc_add_notice( __( 'ArxMint payment gateway is not configured correctly.', 'arxmint-woocommerce' ), 'error' );
            return [ 'result' => 'failure' ];
        }

        // Convert order total (store currency) to satoshis using a simple BTC price lookup.
        // In production replace with a live rate feed or require the store to be denominated in sats.
        $amount_sats = $this->convert_to_sats( (float) $order->get_total(), get_woocommerce_currency() );
        if ( is_wp_error( $amount_sats ) ) {
            wc_add_notice( $amount_sats->get_error_message(), 'error' );
            return [ 'result' => 'failure' ];
        }

        $memo = sprintf(
            /* translators: 1: store name 2: order ID */
            __( '%1$s — Order #%2$s', 'arxmint-woocommerce' ),
            get_bloginfo( 'name' ),
            $order->get_order_number()
        );

        $return_url = $this->get_return_url( $order );
        $api        = $this->get_api();
        $result     = $api->create_checkout( $merchant_id, $amount_sats, $memo, $return_url );

        if ( is_wp_error( $result ) ) {
            wc_add_notice( $result->get_error_message(), 'error' );
            return [ 'result' => 'failure' ];
        }

        // Store session ID on the order for later webhook correlation
        $order->update_meta_data( '_arxmint_session_id', $result['session_id'] );
        $order->update_status( 'pending-payment', __( 'Awaiting ArxMint Lightning payment.', 'arxmint-woocommerce' ) );
        $order->save();

        return [
            'result'   => 'success',
            'redirect' => $result['checkout_url'],
        ];
    }

    /**
     * Naively convert a fiat amount to satoshis.
     * Uses the ArxMint /api/rate endpoint; falls back to a static approximation.
     *
     * @return int|WP_Error
     */
    private function convert_to_sats( float $amount, string $currency ) {
        if ( strtoupper( $currency ) === 'BTC' ) {
            return (int) round( $amount * 1e8 );
        }
        if ( strtoupper( $currency ) === 'SAT' || strtoupper( $currency ) === 'SATS' ) {
            return (int) $amount;
        }

        // Try fetching a live USD rate from the ArxMint API
        $api      = $this->get_api();
        $base_url = ( $this->get_option( 'testmode' ) === 'yes' )
            ? $this->get_option( 'testnet_url', 'http://localhost:3000' )
            : 'https://arxmint.com';

        $rate_response = wp_remote_get( $base_url . '/api/rate?currency=' . urlencode( $currency ), [
            'timeout' => 5,
        ] );

        if ( ! is_wp_error( $rate_response ) ) {
            $rate_body = json_decode( wp_remote_retrieve_body( $rate_response ), true );
            if ( ! empty( $rate_body['satsPerUnit'] ) ) {
                return (int) round( $amount * (float) $rate_body['satsPerUnit'] );
            }
        }

        // Hardcoded fallback: 1 USD ≈ 1500 sats at $67k BTC (update if you deploy a fixed-rate store)
        $fallback_rate = 1500;
        return (int) round( $amount * $fallback_rate );
    }
}
