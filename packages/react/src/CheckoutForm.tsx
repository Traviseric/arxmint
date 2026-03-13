import React, { useState } from "react";
import { usePayment } from "./usePayment.js";
import { QRPayment } from "./QRPayment.js";
import type { CheckoutFormProps } from "./types.js";

export function CheckoutForm({
  apiKey,
  merchantId,
  amountSats: initialAmountSats,
  baseUrl,
  metadata,
  redirectUrl,
  onSuccess,
  onError,
  className = "",
}: CheckoutFormProps) {
  const [amountInput, setAmountInput] = useState(
    initialAmountSats ? String(initialAmountSats) : ""
  );

  const { status, invoice, paymentId, expiresAt, error, createPayment, reset } =
    usePayment({ apiKey, merchantId, baseUrl, metadata });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sats = parseInt(amountInput, 10);
    if (!sats || sats <= 0) return;
    try {
      await createPayment(sats);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  if (status === "paid") {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
    onSuccess?.({ id: paymentId ?? "", paidAt: Date.now() });
    return (
      <div className={`arxmint-checkout-success ${className}`}>
        <p>Payment confirmed. Thank you!</p>
      </div>
    );
  }

  if (invoice && paymentId && expiresAt) {
    return (
      <QRPayment
        invoice={invoice}
        paymentId={paymentId}
        apiKey={apiKey}
        baseUrl={baseUrl}
        expiresAt={expiresAt}
        onPaid={(paidAt) => onSuccess?.({ id: paymentId, paidAt })}
        onExpired={reset}
        className={className}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`arxmint-checkout-form ${className}`}
    >
      {!initialAmountSats && (
        <div>
          <label htmlFor="arxmint-amount">Amount (sats)</label>
          <input
            id="arxmint-amount"
            type="number"
            min="1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
          />
        </div>
      )}
      {error && (
        <p style={{ color: "#ef4444" }}>{error.message}</p>
      )}
      <button type="submit" disabled={status === "pending"}>
        {status === "pending" ? "Generating invoice…" : "Pay with Lightning"}
      </button>
    </form>
  );
}
