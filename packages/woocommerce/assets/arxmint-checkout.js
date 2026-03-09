/**
 * ArxMint WooCommerce Checkout Widget
 *
 * Loaded on WooCommerce checkout pages when ArxMint is selected as payment method.
 * Wraps @arxmint/js SDK behavior for the WordPress context.
 */
(function () {
  "use strict";

  /**
   * Poll for payment confirmation after redirecting to ArxMint checkout.
   * The checkout page itself handles the Lightning invoice display;
   * this script handles any inline status feedback on the WC thank-you page.
   */
  function initArxMintCheckout() {
    var sessionId = new URLSearchParams(window.location.search).get("session");
    var statusEl = document.getElementById("arxmint-payment-status");

    if (!sessionId || !statusEl) return;

    var maxAttempts = 60; // 5 minutes at 5s intervals
    var attempt = 0;

    function poll() {
      if (attempt >= maxAttempts) {
        statusEl.textContent = "Payment window expired. Please refresh or contact support.";
        statusEl.className = "arxmint-status arxmint-status--error";
        return;
      }
      attempt++;

      fetch(
        arxmintWC.siteUrl +
          "/wc-api/arxmint-status?session=" +
          encodeURIComponent(sessionId),
        { credentials: "same-origin" }
      )
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data.status === "paid") {
            statusEl.textContent = "Payment confirmed! Redirecting…";
            statusEl.className = "arxmint-status arxmint-status--success";
            window.location.reload();
          } else {
            setTimeout(poll, 5000);
          }
        })
        .catch(function () {
          setTimeout(poll, 5000);
        });
    }

    poll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArxMintCheckout);
  } else {
    initArxMintCheckout();
  }
})();
