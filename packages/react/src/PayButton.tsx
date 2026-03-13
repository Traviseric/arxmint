import React, { useState } from "react";
import { ArxMintClient } from "@arxmint/js";
import type { PayButtonProps } from "./types.js";

export function PayButton({
  apiKey,
  amountSats,
  merchantId,
  baseUrl,
  onSuccess,
  onError,
  children = "Pay with Bitcoin",
  disabled = false,
  className = "",
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const client = new ArxMintClient({ apiKey, baseUrl });
      const checkout = await client.createCheckout({
        merchantId,
        amountSats,
      });

      setCheckoutUrl(checkout.checkoutUrl);

      // Poll until paid
      const poll = setInterval(async () => {
        try {
          const result = await client.getPaymentStatus(checkout.id);
          if (result.status === "paid") {
            clearInterval(poll);
            setLoading(false);
            onSuccess?.({ id: checkout.id, paidAt: result.paidAt ?? Date.now() });
          } else if (result.status === "expired" || result.status === "failed") {
            clearInterval(poll);
            setLoading(false);
            onError?.(new Error(`Payment ${result.status}`));
          }
        } catch {
          // ignore transient errors
        }
      }, 2000);
    } catch (err) {
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  if (checkoutUrl && loading) {
    return (
      <a
        href={checkoutUrl}
        className={`arxmint-pay-button ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open payment page
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`arxmint-pay-button ${className}`}
    >
      {loading ? "Processing…" : children}
    </button>
  );
}
