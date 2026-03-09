<?php
/**
 * Plugin Name:       ArxMint Lightning Payments
 * Plugin URI:        https://arxmint.com
 * Description:       Accept Bitcoin Lightning payments in WooCommerce via ArxMint. Sovereign, no middleman.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            ArxMint
 * Author URI:        https://arxmint.com
 * License:           MIT
 * Text Domain:       arxmint-woocommerce
 * WC requires at least: 7.0
 * WC tested up to:   9.0
 */

defined( 'ABSPATH' ) || exit;

define( 'ARXMINT_WC_VERSION', '0.1.0' );
define( 'ARXMINT_WC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ARXMINT_WC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Declare HPOS compatibility (WooCommerce High-Performance Order Storage).
 */
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            __FILE__,
            true
        );
    }
} );

/**
 * Boot the gateway after WooCommerce loads.
 */
add_action( 'plugins_loaded', function () {
    if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
        return; // WooCommerce not active
    }

    require_once ARXMINT_WC_PLUGIN_DIR . 'includes/class-arxmint-api.php';
    require_once ARXMINT_WC_PLUGIN_DIR . 'includes/class-arxmint-webhook.php';
    require_once ARXMINT_WC_PLUGIN_DIR . 'includes/class-arxmint-gateway.php';

    add_filter( 'woocommerce_payment_gateways', function ( $gateways ) {
        $gateways[] = 'ArxMint_Gateway';
        return $gateways;
    } );
} );

/**
 * Register the webhook endpoint: POST /wc-api/arxmint-webhook
 */
add_action( 'woocommerce_api_arxmint-webhook', [ 'ArxMint_Webhook', 'handle' ] );

/**
 * Enqueue checkout widget JS on the checkout page.
 */
add_action( 'wp_enqueue_scripts', function () {
    if ( is_checkout() ) {
        wp_enqueue_script(
            'arxmint-checkout',
            ARXMINT_WC_PLUGIN_URL . 'assets/arxmint-checkout.js',
            [],
            ARXMINT_WC_VERSION,
            true
        );

        wp_localize_script( 'arxmint-checkout', 'arxmintWC', [
            'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
            'nonce'     => wp_create_nonce( 'arxmint-checkout' ),
            'siteUrl'   => get_site_url(),
        ] );
    }
} );
