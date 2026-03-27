// ============================================================
// ArxMint — Point of Sale Terminal
// /pos/[merchant-id] — merchant-facing POS for in-person Lightning payments
// Mobile-first PWA. Numeric keypad, real-time USD/sats, QR code, polling.
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type POSScreen = "keypad" | "qr" | "paid" | "expired" | "loading" | "error";
type Currency = "usd" | "sats";

interface MerchantInfo {
  id: string;
  businessName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = "#F7931A";
const BG = "#fafafa";
const TEXT = "#171717";
const MUTED = "#888";
const BORDER = "#e0e0e0";
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const INVOICE_TTL_SECONDS = 600; // 10 minutes
const POLL_INTERVAL_MS = 2_000;

// Seed merchants (matches checkout API seed list)
const SEED_MERCHANTS: Record<string, MerchantInfo> = {
  "seed-black-bear": { id: "seed-black-bear", businessName: "Black Bear Window Cleaning" },
  "seed-glacier": { id: "seed-glacier", businessName: "The Ice Cream Parlor by Glacier" },
  "seed-teneo": { id: "seed-teneo", businessName: "Teneo" },
  "arxmint-store": { id: "arxmint-store", businessName: "ArxMint Store" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usdToSats(usd: number, btcPrice: number): number {
  return Math.round((usd / btcPrice) * 100_000_000);
}

function satsToUsd(sats: number, btcPrice: number): string {
  return ((sats / 100_000_000) * btcPrice).toFixed(2);
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Main POS Page Component
// ---------------------------------------------------------------------------

export default function POSPage() {
  const params = useParams();
  const merchantId = params["merchant-id"] as string;

  // State
  const [screen, setScreen] = useState<POSScreen>("loading");
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [currency, setCurrency] = useState<Currency>("usd");
  const [display, setDisplay] = useState("0");
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [invoice, setInvoice] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [amountSats, setAmountSats] = useState(0);
  const [amountUsd, setAmountUsd] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(INVOICE_TTL_SECONDS);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch BTC price from mempool.space
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function fetchPrice() {
      try {
        const res = await fetch("https://mempool.space/api/v1/prices");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.USD) setBtcPrice(data.USD);
      } catch {
        // keep previous price
      }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Load merchant info
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!merchantId) return;

    // Check seed list (instant)
    if (SEED_MERCHANTS[merchantId]) {
      setMerchant(SEED_MERCHANTS[merchantId]);
      setScreen("keypad");
      return;
    }

    // Try fetching from API — use pledge endpoint or fall back
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pledge?id=${encodeURIComponent(merchantId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setMerchant({
              id: merchantId,
              businessName: data.businessName || merchantId,
            });
            setScreen("keypad");
          }
          return;
        }
      } catch {
        // ignore
      }
      // Fallback: use merchantId as display name
      if (!cancelled) {
        setMerchant({ id: merchantId, businessName: merchantId });
        setScreen("keypad");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Keypad handler
  // ---------------------------------------------------------------------------
  const handleKey = useCallback(
    (key: string) => {
      if (screen !== "keypad") return;
      setDisplay((prev) => {
        if (key === "clear") return "0";
        if (key === "backspace") {
          const next = prev.slice(0, -1);
          return next === "" || next === "-" ? "0" : next;
        }
        if (key === ".") {
          if (prev.includes(".")) return prev;
          return prev + ".";
        }
        // Digit
        if (prev === "0" && key !== ".") return key;
        // Limit decimal places: 2 for USD, 0 for sats
        const parts = prev.split(".");
        if (currency === "usd" && parts[1] && parts[1].length >= 2) return prev;
        if (currency === "sats" && prev.includes(".")) return prev;
        // Reasonable max length
        if (prev.replace(".", "").length >= 10) return prev;
        return prev + key;
      });
    },
    [screen, currency]
  );

  // ---------------------------------------------------------------------------
  // Currency toggle
  // ---------------------------------------------------------------------------
  const handleCurrencyToggle = useCallback(() => {
    setCurrency((prev) => (prev === "usd" ? "sats" : "usd"));
    setDisplay("0");
  }, []);

  // ---------------------------------------------------------------------------
  // Compute amounts
  // ---------------------------------------------------------------------------
  const numericValue = parseFloat(display) || 0;
  const computedSats =
    currency === "usd" && btcPrice
      ? usdToSats(numericValue, btcPrice)
      : currency === "sats"
        ? Math.round(numericValue)
        : 0;
  const computedUsd =
    currency === "sats" && btcPrice
      ? satsToUsd(Math.round(numericValue), btcPrice)
      : currency === "usd"
        ? numericValue.toFixed(2)
        : "0.00";

  // ---------------------------------------------------------------------------
  // Charge handler — create invoice
  // ---------------------------------------------------------------------------
  const handleCharge = useCallback(async () => {
    if (computedSats <= 0 || !merchant) return;

    setScreen("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchant.id,
          amountSats: computedSats,
          memo: `POS sale — ${merchant.businessName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      setInvoice(data.invoice);
      setSessionId(data.sessionId);
      setAmountSats(computedSats);
      setAmountUsd(parseFloat(
        currency === "usd" ? numericValue.toFixed(2) : (computedUsd as string)
      ));
      setSecondsLeft(INVOICE_TTL_SECONDS);
      setScreen("qr");

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            setScreen("expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling for payment status
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/checkout/status/${data.sessionId}`);
          if (statusRes.ok) {
            const status = await statusRes.json();
            if (status.status === "paid") {
              if (pollRef.current) clearInterval(pollRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              setScreen("paid");
              // Vibrate on payment received
              try {
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              } catch {
                // vibration not available
              }
            } else if (status.status === "expired") {
              if (pollRef.current) clearInterval(pollRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              setScreen("expired");
            }
          }
        } catch {
          // poll failed, continue
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      setScreen("error");
    }
  }, [computedSats, merchant, currency, numericValue, computedUsd]);

  // ---------------------------------------------------------------------------
  // Reset to keypad
  // ---------------------------------------------------------------------------
  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
    setScreen("keypad");
    setInvoice("");
    setSessionId("");
    setDisplay("0");
    setCopied(false);
    setErrorMsg("");
  }, []);

  // ---------------------------------------------------------------------------
  // Copy invoice
  // ---------------------------------------------------------------------------
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [invoice]);

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const containerStyle: React.CSSProperties = {
    background: BG,
    color: TEXT,
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    maxWidth: 430,
    margin: "0 auto",
    fontFamily: FONT_STACK,
    WebkitUserSelect: "none",
    userSelect: "none",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    padding: "16px 20px",
    borderBottom: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  };

  const keyBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    borderRadius: 16,
    fontSize: 24,
    fontWeight: 500,
    background: "#f0f0f0",
    border: "none",
    color: TEXT,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };

  const chargeBtnStyle: React.CSSProperties = {
    width: "100%",
    height: 60,
    borderRadius: 16,
    fontSize: 20,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    background: computedSats > 0 ? ACCENT : "#ccc",
    color: computedSats > 0 ? "#fff" : "#999",
    touchAction: "manipulation",
  };

  const actionBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: "14px 8px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "manipulation",
  };

  // ---------------------------------------------------------------------------
  // PWA head tags injected via useEffect (client-side)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Theme color
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", ACCENT);

    // Apple mobile web app capable
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleMeta) {
      appleMeta = document.createElement("meta");
      appleMeta.setAttribute("name", "apple-mobile-web-app-capable");
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute("content", "yes");

    // Apple status bar style
    let statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusMeta) {
      statusMeta = document.createElement("meta");
      statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      document.head.appendChild(statusMeta);
    }
    statusMeta.setAttribute("content", "black-translucent");

    // Manifest link
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.setAttribute("rel", "manifest");
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute("href", `/pos/${merchantId}/manifest.json`);

    // Viewport (ensure mobile-friendly)
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.setAttribute("name", "viewport");
      document.head.appendChild(viewport);
    }
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    );
  }, [merchantId]);

  // ---------------------------------------------------------------------------
  // Render: Loading state
  // ---------------------------------------------------------------------------
  if (screen === "loading" && !merchant) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `3px solid ${BORDER}`,
              borderTopColor: ACCENT,
              animation: "pos-spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes pos-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Keypad screen
  // ---------------------------------------------------------------------------
  if (screen === "keypad") {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      [".", "0", "backspace"],
    ];

    return (
      <div style={containerStyle} data-theme="merchant">
        {/* Header */}
        <header style={headerStyle}>
          <div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
              ArxMint POS
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
              {merchant?.businessName}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {btcPrice ? (
              <>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>BTC</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ACCENT }}>
                  ${btcPrice.toLocaleString()}
                </div>
              </>
            ) : (
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${BORDER}`,
                  borderTopColor: ACCENT,
                  animation: "pos-spin 0.8s linear infinite",
                }}
              />
            )}
          </div>
        </header>

        {/* Amount display */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px 24px",
            minHeight: 0,
          }}
        >
          {/* Currency toggle */}
          <button
            onClick={handleCurrencyToggle}
            style={{
              padding: "6px 20px",
              borderRadius: 20,
              border: `2px solid ${ACCENT}`,
              background: "transparent",
              color: ACCENT,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
              touchAction: "manipulation",
            }}
          >
            {currency === "usd" ? "USD" : "SATS"} (tap to switch)
          </button>

          {/* Main display */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            {currency === "usd" && (
              <span style={{ fontSize: 32, color: MUTED, marginTop: 8 }}>$</span>
            )}
            <span
              style={{
                fontSize: display.length > 7 ? 48 : 64,
                fontWeight: 300,
                letterSpacing: -2,
                lineHeight: 1,
                minWidth: "1ch",
              }}
            >
              {display}
            </span>
            {currency === "sats" && (
              <span style={{ fontSize: 18, color: MUTED, marginTop: 8, marginLeft: 4 }}>sats</span>
            )}
          </div>

          {/* Conversion */}
          {btcPrice && numericValue > 0 ? (
            <div style={{ fontSize: 18, color: ACCENT, fontWeight: 600 }}>
              {currency === "usd"
                ? `${computedSats.toLocaleString()} sats`
                : `$${computedUsd}`}
            </div>
          ) : btcPrice ? (
            <div style={{ fontSize: 14, color: MUTED }}>Enter amount</div>
          ) : (
            <div style={{ fontSize: 14, color: MUTED }}>Loading price...</div>
          )}
        </div>

        {/* Keypad grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            padding: "0 16px 12px",
          }}
        >
          {keys.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              style={{
                ...keyBtnStyle,
                ...(key === "backspace"
                  ? { fontSize: 20, color: MUTED }
                  : {}),
              }}
            >
              {key === "backspace" ? "\u232B" : key}
            </button>
          ))}
        </div>

        {/* Clear + Charge buttons */}
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {display !== "0" && (
            <button
              onClick={() => handleKey("clear")}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: MUTED,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={handleCharge}
            disabled={computedSats <= 0}
            style={chargeBtnStyle}
          >
            {computedSats > 0
              ? `Charge ${currency === "usd" ? `$${display}` : `${computedSats.toLocaleString()} sats`}`
              : "Enter amount"}
          </button>
        </div>

        <style>{`@keyframes pos-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: QR screen
  // ---------------------------------------------------------------------------
  if (screen === "qr") {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent("lightning:" + invoice)}`;

    return (
      <div style={containerStyle} data-theme="merchant">
        {/* Amount header */}
        <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
          <div style={{ fontSize: 14, color: MUTED }}>Charge</div>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>
            ${amountUsd.toFixed(2)}
          </div>
          <div style={{ fontSize: 16, color: ACCENT, fontWeight: 600, marginTop: 2 }}>
            {amountSats.toLocaleString()} sats
          </div>
        </div>

        {/* QR code */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 20,
              border: `1px solid ${BORDER}`,
              boxShadow: `0 0 0 4px rgba(247, 147, 26, 0.15)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Lightning invoice QR code"
              width={250}
              height={250}
              style={{ display: "block" }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: "0 16px", display: "flex", gap: 10 }}>
          <a
            href={`lightning:${invoice}`}
            style={{
              ...actionBtnStyle,
              background: ACCENT,
              color: "#fff",
            }}
          >
            Open in Wallet
          </a>
          <button
            onClick={handleCopy}
            style={{
              ...actionBtnStyle,
              background: "#f0f0f0",
              color: TEXT,
            }}
          >
            {copied ? "Copied!" : "Copy Invoice"}
          </button>
        </div>

        {/* Timer + waiting */}
        <div
          style={{
            textAlign: "center",
            padding: "16px 16px 12px",
            color: MUTED,
            fontSize: 14,
          }}
        >
          Waiting for payment... {formatTimer(secondsLeft)}
        </div>

        {/* Cancel */}
        <div style={{ padding: "0 16px 24px" }}>
          <button
            onClick={handleReset}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: MUTED,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Paid screen
  // ---------------------------------------------------------------------------
  if (screen === "paid") {
    return (
      <div style={containerStyle} data-theme="merchant">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "32px 24px",
          }}
        >
          {/* Animated checkmark */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.1)",
              border: "3px solid #22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              color: "#22c55e",
              animation: "pos-pop 0.4s ease-out",
            }}
          >
            {"\u2713"}
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>
              Payment received!
            </div>
            <div style={{ fontSize: 20, color: TEXT, marginTop: 8, fontWeight: 600 }}>
              ${amountUsd.toFixed(2)}
            </div>
            <div style={{ fontSize: 15, color: MUTED, marginTop: 4 }}>
              {amountSats.toLocaleString()} sats
            </div>
          </div>

          <button
            onClick={handleReset}
            style={{
              width: "100%",
              maxWidth: 320,
              height: 60,
              borderRadius: 16,
              fontSize: 20,
              fontWeight: 700,
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: "pointer",
              marginTop: 16,
              touchAction: "manipulation",
            }}
          >
            New Payment
          </button>
        </div>

        <style>{`
          @keyframes pos-pop {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Expired screen
  // ---------------------------------------------------------------------------
  if (screen === "expired") {
    return (
      <div style={containerStyle} data-theme="merchant">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "3px solid #ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            {"\u23F1"}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
              Invoice expired
            </div>
            <div style={{ fontSize: 15, color: MUTED, marginTop: 8 }}>
              The QR code timed out. Tap below to try again.
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              width: "100%",
              maxWidth: 320,
              height: 60,
              borderRadius: 16,
              fontSize: 20,
              fontWeight: 700,
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: "pointer",
              marginTop: 8,
              touchAction: "manipulation",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error screen
  // ---------------------------------------------------------------------------
  if (screen === "error") {
    return (
      <div style={containerStyle} data-theme="merchant">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "3px solid #ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            {"\u26A0"}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</div>
            <div style={{ fontSize: 14, color: "#ef4444", marginTop: 8 }}>{errorMsg}</div>
          </div>
          <button
            onClick={handleReset}
            style={{
              width: "100%",
              maxWidth: 320,
              height: 60,
              borderRadius: 16,
              fontSize: 20,
              fontWeight: 700,
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: "pointer",
              marginTop: 8,
              touchAction: "manipulation",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Generic loading (creating invoice)
  // ---------------------------------------------------------------------------
  return (
    <div style={containerStyle} data-theme="merchant">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `3px solid ${BORDER}`,
            borderTopColor: ACCENT,
            animation: "pos-spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontSize: 16, color: MUTED }}>Creating invoice...</div>
        <style>{`@keyframes pos-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
