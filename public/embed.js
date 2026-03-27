// ============================================================
// ArxMint Embeddable Checkout Widget
// Drop one script tag on any site → "Pay with Bitcoin" button
// https://arxmint.com/embed.js
// ============================================================
(function () {
  "use strict";

  var ARXMINT_BASE = "https://www.arxmint.com";
  var MODAL_Z = 999999;

  // Find all embed targets: <script> tags with data-merchant or <div class="arxmint-pay">
  function getTargets() {
    var targets = [];
    // Script tags with data-merchant
    var scripts = document.querySelectorAll('script[data-merchant]');
    for (var i = 0; i < scripts.length; i++) {
      targets.push({ el: scripts[i], insertAfter: true });
    }
    // Div placeholders
    var divs = document.querySelectorAll('.arxmint-pay[data-merchant]');
    for (var j = 0; j < divs.length; j++) {
      targets.push({ el: divs[j], insertAfter: false });
    }
    return targets;
  }

  function getAttr(el, name, fallback) {
    return el.getAttribute("data-" + name) || fallback || "";
  }

  // Create the pay button
  function createButton(config) {
    var btn = document.createElement("button");
    btn.textContent = config.buttonText;
    btn.setAttribute("aria-label", "Pay with Bitcoin via ArxMint");
    btn.setAttribute("type", "button");

    var accent = config.accent || "#F7931A";
    btn.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:8px",
      "padding:12px 24px",
      "background:" + accent,
      "color:#fff",
      "border:none",
      "border-radius:8px",
      "font-size:16px",
      "font-weight:600",
      "font-family:inherit",
      "cursor:pointer",
      "transition:opacity 0.2s",
      "line-height:1.4",
    ].join(";");

    btn.onmouseenter = function () { btn.style.opacity = "0.85"; };
    btn.onmouseleave = function () { btn.style.opacity = "1"; };

    // Lightning bolt icon
    var icon = document.createElement("span");
    icon.textContent = "\u26A1";
    icon.style.fontSize = "18px";
    btn.insertBefore(icon, btn.firstChild);

    return btn;
  }

  // Build the iframe URL
  function buildIframeUrl(config) {
    var url = ARXMINT_BASE + "/checkout-embed/" + encodeURIComponent(config.merchant);
    var params = [];
    if (config.amount) params.push("amount=" + config.amount);
    if (config.memo) params.push("memo=" + encodeURIComponent(config.memo));
    if (config.theme) params.push("theme=" + config.theme);
    if (config.currency) params.push("currency=" + config.currency);
    if (params.length) url += "?" + params.join("&");
    return url;
  }

  // Create and show the modal
  function showModal(config) {
    // Overlay
    var overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "bottom:0",
      "background:rgba(0,0,0,0.6)",
      "z-index:" + MODAL_Z,
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:16px",
      "animation:arxfadein 0.2s ease",
    ].join(";");

    // Card
    var card = document.createElement("div");
    card.style.cssText = [
      "background:#fff",
      "border-radius:16px",
      "width:100%",
      "max-width:420px",
      "height:600px",
      "max-height:90vh",
      "position:relative",
      "overflow:hidden",
      "box-shadow:0 25px 50px rgba(0,0,0,0.25)",
    ].join(";");

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close payment modal");
    closeBtn.style.cssText = [
      "position:absolute",
      "top:12px",
      "right:12px",
      "z-index:10",
      "background:rgba(0,0,0,0.08)",
      "border:none",
      "border-radius:50%",
      "width:32px",
      "height:32px",
      "font-size:20px",
      "cursor:pointer",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "color:#666",
      "line-height:1",
    ].join(";");

    // Iframe
    var iframe = document.createElement("iframe");
    iframe.src = buildIframeUrl(config);
    iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:16px;";
    iframe.setAttribute("allow", "clipboard-write");
    iframe.setAttribute("title", "ArxMint Bitcoin Payment");

    card.appendChild(closeBtn);
    card.appendChild(iframe);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Inject animation keyframes
    if (!document.getElementById("arxmint-styles")) {
      var style = document.createElement("style");
      style.id = "arxmint-styles";
      style.textContent = "@keyframes arxfadein{from{opacity:0}to{opacity:1}}";
      document.head.appendChild(style);
    }

    // Close handlers
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    closeBtn.onclick = close;
    overlay.onclick = function (e) {
      if (e.target === overlay) close();
    };

    function onKey(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    }
    document.addEventListener("keydown", onKey);

    // Listen for payment completion from iframe
    function onMessage(e) {
      if (e.origin !== ARXMINT_BASE) return;
      var data = e.data;
      if (!data || data.event !== "arxmint:payment") return;

      // Dispatch custom event on the merchant's page
      var customEvent = new CustomEvent("arxmint:payment", { detail: data });
      document.dispatchEvent(customEvent);

      // Call named callback if specified
      if (config.onPayment && typeof window[config.onPayment] === "function") {
        window[config.onPayment](data);
      }

      // Redirect if success URL provided
      if (data.status === "paid" && config.successUrl) {
        setTimeout(function () {
          window.location.href = config.successUrl;
        }, 2000);
      }

      // Auto-close after payment
      if (data.status === "paid") {
        setTimeout(close, 3000);
      }

      window.removeEventListener("message", onMessage);
    }
    window.addEventListener("message", onMessage);
  }

  // Initialize all targets
  function init() {
    var targets = getTargets();
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var el = t.el;

      var config = {
        merchant: getAttr(el, "merchant"),
        amount: getAttr(el, "amount"),
        memo: getAttr(el, "memo"),
        theme: getAttr(el, "theme", "light"),
        buttonText: getAttr(el, "button-text", "Pay with Bitcoin"),
        accent: getAttr(el, "accent", "#F7931A"),
        currency: getAttr(el, "currency", "sats"),
        successUrl: getAttr(el, "success-url"),
        onPayment: getAttr(el, "on-payment"),
      };

      if (!config.merchant) continue;

      var btn = createButton(config);
      btn.onclick = function (cfg) {
        return function () { showModal(cfg); };
      }(config);

      if (t.insertAfter) {
        // Script tag: insert button after the script
        el.parentNode.insertBefore(btn, el.nextSibling);
      } else {
        // Div placeholder: replace contents
        el.innerHTML = "";
        el.appendChild(btn);
      }
    }
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
