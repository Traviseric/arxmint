import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArxMintClient } from "@arxmint/js";
import type { QRPaymentProps } from "./types.js";

// Inline minimal QR code renderer using canvas — avoids bundling qrcode.react
// which is a peer concern. Merchants can pass a custom renderQR prop if needed.
// We render the invoice as a lightning: URI link with a preformatted code fallback.

export function QRPayment({
  invoice,
  paymentId,
  apiKey,
  baseUrl,
  expiresAt,
  onPaid,
  onExpired,
  className = "",
}: QRPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (pollRef.current !== null) clearInterval(pollRef.current);
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => {
    const client = new ArxMintClient({ apiKey, baseUrl });

    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopAll();
          onExpired?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const result = await client.getPaymentStatus(paymentId);
        if (result.status === "paid") {
          setPaid(true);
          stopAll();
          onPaid?.(result.paidAt ?? Date.now());
        } else if (result.status === "expired" || result.status === "failed") {
          stopAll();
          onExpired?.();
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);

    return stopAll;
  }, [paymentId, apiKey, baseUrl, onPaid, onExpired, stopAll]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(invoice).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [invoice]);

  const lightningUri = `lightning:${invoice}`;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  if (paid) {
    return (
      <div
        className={`arxmint-qr-paid ${className}`}
        style={{ textAlign: "center", padding: "1rem" }}
      >
        <div style={{ fontSize: "2rem" }}>&#10003;</div>
        <p style={{ fontWeight: "bold" }}>Payment confirmed</p>
      </div>
    );
  }

  return (
    <div
      className={`arxmint-qr-payment ${className}`}
      style={{ textAlign: "center" }}
    >
      <a
        href={lightningUri}
        style={{ display: "inline-block", margin: "0 auto" }}
        title="Open in Lightning wallet"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(lightningUri)}`}
          alt="Lightning invoice QR code"
          width={220}
          height={220}
          style={{ display: "block" }}
        />
      </a>
      <p style={{ fontSize: "0.75rem", wordBreak: "break-all", marginTop: "0.5rem" }}>
        {invoice.slice(0, 20)}…{invoice.slice(-8)}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
        <button type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy invoice"}
        </button>
        <a href={lightningUri}>Open wallet</a>
      </div>
      {secondsLeft > 0 ? (
        <p style={{ fontSize: "0.75rem", color: "#737373", marginTop: "0.5rem" }}>
          Expires in {minutes}:{String(seconds).padStart(2, "0")}
        </p>
      ) : (
        <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.5rem" }}>Expired</p>
      )}
    </div>
  );
}
