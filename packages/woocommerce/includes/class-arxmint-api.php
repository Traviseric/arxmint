<?php
/**
 * ArxMint API client — wraps the ArxMint /api/checkout endpoint.
 */

defined( 'ABSPATH' ) || exit;

class ArxMint_API {

    /** @var string */
    private string $api_key;

    /** @var string Base URL for the ArxMint API (configurable for testnet). */
    private string $base_url;

    public function __construct( string $api_key, string $base_url = 'https://arxmint.com' ) {
        $this->api_key  = $api_key;
        $this->base_url = rtrim( $base_url, '/' );
    }

    /**
     * Create a Lightning checkout session.
     *
     * @param string $merchant_id   Your ArxMint merchant slug.
     * @param int    $amount_sats   Amount in satoshis.
     * @param string $memo          Order description / reference.
     * @param string $return_url    URL to redirect after payment.
     * @return array{session_id: string, invoice: string, checkout_url: string}|WP_Error
     */
    public function create_checkout( string $merchant_id, int $amount_sats, string $memo, string $return_url ) {
        $response = wp_remote_post(
            $this->base_url . '/api/checkout',
            [
                'headers' => [
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . $this->api_key,
                ],
                'body'    => wp_json_encode( [
                    'merchantId'  => $merchant_id,
                    'amountSats'  => $amount_sats,
                    'memo'        => $memo,
                    'returnUrl'   => $return_url,
                ] ),
                'timeout' => 20,
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 || empty( $body['sessionId'] ) ) {
            $msg = $body['error'] ?? "ArxMint API error (HTTP $code)";
            return new WP_Error( 'arxmint_api_error', $msg );
        }

        return [
            'session_id'   => $body['sessionId'],
            'invoice'      => $body['invoice'] ?? '',
            'checkout_url' => $this->base_url . '/pay/' . $merchant_id . '?session=' . $body['sessionId'],
        ];
    }

    /**
     * Fetch checkout session status.
     *
     * @param string $session_id
     * @return array{status: string, paid_at: string|null}|WP_Error
     */
    public function get_session_status( string $session_id ) {
        $response = wp_remote_get(
            $this->base_url . '/api/checkout/status?sessionId=' . urlencode( $session_id ),
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                ],
                'timeout' => 10,
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 ) {
            return new WP_Error( 'arxmint_api_error', $body['error'] ?? "HTTP $code" );
        }

        return [
            'status'  => $body['status'] ?? 'pending',
            'paid_at' => $body['paidAt'] ?? null,
        ];
    }

    /**
     * Test the API connection (used on admin settings page).
     *
     * @return bool|WP_Error
     */
    public function test_connection() {
        $response = wp_remote_get(
            $this->base_url . '/api/health',
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                ],
                'timeout' => 10,
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        return $code === 200;
    }
}
