"use client";

// ============================================================
// ArxMint — Embeddable Checkout Page
// Designed to run inside an iframe on any merchant's website.
// Compact UI: amount input → QR code → payment confirmation.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type CheckoutState = "amount" | "invoice" | "paid" | "expired" | "error";

export default function CheckoutEmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const merchantId = params["merchant-id"] as string;

  const presetAmount = searchParams.get("amount");
  const presetMemo = searchParams.get("memo") || "";
  const theme = searchParams.get("theme") || "light";

  const [state, setState] = useState<CheckoutState>(
    presetAmount ? "invoice" : "amount"
  );
  const [amountSats, setAmountSats] = useState(presetAmount || "");
  const [amountUsd, setAmountUsd] = useState("");
  const [currency, setCurrency] = useState<"sats" | "usd">(
    searchParams.get("currency") === "usd" ? "usd" : "sats"
  );
  const [invoice, setInvoice] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch BTC price for USD conversion
  useEffect(() => {
    fetch("https://mempool.space/api/v1/prices")
      .then((r) => r.json())
      .then((d) => setBtcPrice(d.USD))
      .catch(() => {});
  }, []);

  const satsToUsd = useCallback(
    (sats: number) => {
      if (!btcPrice) return "";
      return (sats / 100_000_000 * btcPrice).toFixed(2);
    },
    [btcPrice]
  );

  const usdToSats = useCallback(
    (usd: number) => {
      if (!btcPrice) return 0;
      return Math.round((usd / btcPrice) * 100_000_000);
    },
    [btcPrice]
  );

  // Post message to parent window
  const postToParent = useCallback(
    (data: Record<string, unknown>) => {
      try {
        window.parent.postMessage(
          { event: "arxmint:payment", ...data },
          "*"
        );
      } catch {
        // Parent may block postMessage
      }
    },
    []
  );

  // Create invoice
  const createInvoice = useCallback(
    async (sats: number) => {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId,
            amountSats: sats,
            memo: presetMemo || `Payment to ${merchantId}`,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to create invoice");
          setState("error");
          return;
        }

        const data = await res.json();
        setInvoice(data.invoice);
        setSessionId(data.sessionId);
        setMerchantName(data.merchantName || merchantId);
        setAmountSats(String(sats));
        setState("invoice");

        // Start countdown timer (10 min)
        setSecondsLeft(600);
        timerRef.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setState("expired");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Start polling for payment
        pollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/checkout/status/${data.sessionId}`
            );
            if (statusRes.ok) {
              const status = await statusRes.json();
              if (status.status === "paid") {
                if (pollRef.current) clearInterval(pollRef.current);
                if (timerRef.current) clearInterval(timerRef.current);
                setState("paid");
                postToParent({
                  status: "paid",
                  amount: sats,
                  sessionId: data.sessionId,
                  merchantId,
                });
              }
            }
          } catch {
            // Poll failed, continue
          }
        }, 2000);
      } catch {
        setError("Network error. Please try again.");
        setState("error");
      }
    },
    [merchantId, presetMemo, postToParent]
  );

  // Auto-create invoice if preset amount
  useEffect(() => {
    if (presetAmount && state === "invoice" && !invoice) {
      createInvoice(Number(presetAmount));
    }
  }, [presetAmount, state, invoice, createInvoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePay = () => {
    const sats =
      currency === "usd" ? usdToSats(Number(amountUsd)) : Number(amountSats);
    if (!sats || sats < 1) return;
    createInvoice(sats);
  };

  const handleRetry = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setInvoice("");
    setSessionId("");
    setError("");
    setState(presetAmount ? "invoice" : "amount");
    if (presetAmount) createInvoice(Number(presetAmount));
  };

  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const text = isDark ? "#f5f5f5" : "#171717";
  const muted = isDark ? "#888" : "#666";
  const accent = "#F7931A";

  return (
    <div
      style={{
        background: bg,
        color: text,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── Amount Entry ── */}
      {state === "amount" && (
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            Enter Amount
          </h2>

          {/* Currency toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setCurrency("sats")}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: `2px solid ${currency === "sats" ? accent : isDark ? "#333" : "#ddd"}`,
                background: currency === "sats" ? accent : "transparent",
                color: currency === "sats" ? "#fff" : muted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              sats
            </button>
            <button
              onClick={() => setCurrency("usd")}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: `2px solid ${currency === "usd" ? accent : isDark ? "#333" : "#ddd"}`,
                background: currency === "usd" ? accent : "transparent",
                color: currency === "usd" ? "#fff" : muted,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              USD
            </button>
          </div>

          {/* Amount input */}
          <input
            type="number"
            inputMode="numeric"
            placeholder={currency === "sats" ? "Amount in sats" : "Amount in USD"}
            value={currency === "sats" ? amountSats : amountUsd}
            onChange={(e) => {
              if (currency === "sats") {
                setAmountSats(e.target.value);
                if (btcPrice && e.target.value) {
                  setAmountUsd(satsToUsd(Number(e.target.value)));
                }
              } else {
                setAmountUsd(e.target.value);
                if (btcPrice && e.target.value) {
                  setAmountSats(String(usdToSats(Number(e.target.value))));
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePay();
            }}
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 24,
              fontWeight: 700,
              textAlign: "center",
              border: `2px solid ${isDark ? "#333" : "#e0e0e0"}`,
              borderRadius: 12,
              background: isDark ? "#222" : "#fafafa",
              color: text,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Conversion hint */}
          {btcPrice && (
            <p
              style={{
                fontSize: 13,
                color: muted,
                marginTop: 8,
              }}
            >
              {currency === "sats" && amountSats
                ? `≈ $${satsToUsd(Number(amountSats))} USD`
                : currency === "usd" && amountUsd
                  ? `≈ ${usdToSats(Number(amountUsd)).toLocaleString()} sats`
                  : ""}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={
              currency === "sats"
                ? !amountSats || Number(amountSats) < 1
                : !amountUsd || Number(amountUsd) < 0.01
            }
            style={{
              width: "100%",
              marginTop: 20,
              padding: "14px",
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              opacity:
                (currency === "sats" && (!amountSats || Number(amountSats) < 1)) ||
                (currency === "usd" && (!amountUsd || Number(amountUsd) < 0.01))
                  ? 0.5
                  : 1,
            }}
          >
            ⚡ Pay
          </button>
        </div>
      )}

      {/* ── Invoice / QR Code ── */}
      {state === "invoice" && (
        <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
          {merchantName && (
            <p style={{ fontSize: 14, color: muted, marginBottom: 4 }}>
              {merchantName}
            </p>
          )}
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {Number(amountSats).toLocaleString()} sats
            {btcPrice && (
              <span style={{ fontSize: 14, color: muted, display: "block" }}>
                ≈ ${satsToUsd(Number(amountSats))} USD
              </span>
            )}
          </p>

          {invoice ? (
            <>
              {/* QR Code — using a simple SVG placeholder until we add qrcode lib */}
              <div
                style={{
                  background: "#fff",
                  padding: 16,
                  borderRadius: 12,
                  border: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
                  marginBottom: 16,
                  display: "inline-block",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent("lightning:" + invoice)}`}
                  alt="Lightning invoice QR code"
                  width={250}
                  height={250}
                  style={{ display: "block" }}
                />
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <a
                  href={`lightning:${invoice}`}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: accent,
                    color: "#fff",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  Open in Wallet
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invoice);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: isDark ? "#333" : "#f0f0f0",
                    color: text,
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Copy Invoice
                </button>
              </div>

              {/* Timer + status */}
              <p style={{ fontSize: 13, color: muted }}>
                ⏳ Waiting for payment...{" "}
                {secondsLeft > 0 &&
                  `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, color: muted }}>Creating invoice...</p>
          )}
        </div>
      )}

      {/* ── Payment Confirmed ── */}
      {state === "paid" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 40,
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Payment Received!
          </h2>
          <p style={{ fontSize: 16, color: muted }}>
            {Number(amountSats).toLocaleString()} sats
            {btcPrice && ` ≈ $${satsToUsd(Number(amountSats))}`}
          </p>
          {merchantName && (
            <p style={{ fontSize: 14, color: muted, marginTop: 4 }}>
              Paid to {merchantName}
            </p>
          )}
        </div>
      )}

      {/* ── Expired ── */}
      {state === "expired" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⏰</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Invoice Expired
          </h2>
          <button
            onClick={handleRetry}
            style={{
              padding: "12px 24px",
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {state === "error" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⚠️</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: muted, marginBottom: 16 }}>
            {error}
          </p>
          <button
            onClick={handleRetry}
            style={{
              padding: "12px 24px",
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Powered by */}
      <a
        href="https://www.arxmint.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 12,
          fontSize: 11,
          color: muted,
          textDecoration: "none",
          opacity: 0.7,
        }}
      >
        Powered by ArxMint
      </a>
    </div>
  );
}
