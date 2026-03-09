<?php
/**
 * ArxMint webhook handler — verifies HMAC and updates WooCommerce order status.
 *
 * Endpoint: POST /wc-api/arxmint-webhook
 */

defined( 'ABSPATH' ) || exit;

class ArxMint_Webhook {

    /**
     * Called by WooCommerce API hook `woocommerce_api_arxmint-webhook`.
     */
    public static function handle(): void {
        $raw_body = file_get_contents( 'php://input' );

        // 1. Verify HMAC signature
        $secret    = get_option( 'arxmint_webhook_secret', '' );
        $signature = $_SERVER['HTTP_X_ARXMINT_SIGNATURE'] ?? '';

        if ( ! self::verify_signature( $raw_body, $signature, $secret ) ) {
            wp_die( 'Invalid signature', 'ArxMint Webhook', [ 'response' => 401 ] );
        }

        // 2. Decode payload
        $payload = json_decode( $raw_body, true );
        if ( ! $payload ) {
            wp_die( 'Invalid JSON', 'ArxMint Webhook', [ 'response' => 400 ] );
        }

        $event      = $payload['event'] ?? '';
        $session_id = $payload['sessionId'] ?? '';
        $order_id   = $payload['meta']['orderId'] ?? '';

        if ( $event !== 'payment.completed' || ! $order_id ) {
            // Not something we handle — acknowledge and exit
            status_header( 200 );
            echo json_encode( [ 'received' => true ] );
            exit;
        }

        // 3. Load and update the WooCommerce order
        $order = wc_get_order( absint( $order_id ) );
        if ( ! $order ) {
            wp_die( 'Order not found', 'ArxMint Webhook', [ 'response' => 404 ] );
        }

        if ( $order->is_paid() ) {
            // Already processed — idempotent response
            status_header( 200 );
            echo json_encode( [ 'received' => true, 'skipped' => 'already_paid' ] );
            exit;
        }

        $amount_sats = absint( $payload['amountSats'] ?? 0 );
        $paid_at     = sanitize_text_field( $payload['paidAt'] ?? current_time( 'mysql' ) );

        $order->payment_complete( $session_id );
        $order->add_order_note(
            sprintf(
                /* translators: 1: session ID 2: sats amount 3: timestamp */
                __( 'ArxMint Lightning payment confirmed. Session: %1$s · %2$s sats · %3$s', 'arxmint-woocommerce' ),
                esc_html( $session_id ),
                number_format( $amount_sats ),
                esc_html( $paid_at )
            )
        );
        $order->save();

        status_header( 200 );
        echo json_encode( [ 'received' => true, 'order_id' => $order_id ] );
        exit;
    }

    /**
     * Constant-time HMAC verification.
     */
    private static function verify_signature( string $body, string $signature, string $secret ): bool {
        if ( empty( $secret ) || empty( $signature ) ) {
            return false;
        }
        $expected = hash_hmac( 'sha256', $body, $secret );
        return hash_equals( $expected, $signature );
    }
}
