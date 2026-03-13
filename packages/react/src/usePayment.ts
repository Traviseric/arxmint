import { useCallback, useRef, useState } from "react";
import { ArxMintClient } from "@arxmint/js";
import type { PaymentStatus } from "@arxmint/js";
import type { UsePaymentOptions, UsePaymentResult } from "./types.js";

export function usePayment(options: UsePaymentOptions): UsePaymentResult {
  const { apiKey, merchantId, baseUrl, metadata, pollInterval = 2000 } = options;

  const [status, setStatus] = useState<PaymentStatus | "idle">("idle");
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const createPayment = useCallback(
    async (amountSats?: number) => {
      const sats = amountSats ?? options.amountSats;
      if (!sats || sats <= 0) {
        setError(new Error("amountSats must be a positive integer (sats)"));
        return;
      }

      setError(null);
      setStatus("pending");
      stopPolling();

      try {
        const client = new ArxMintClient({ apiKey, baseUrl });
        const checkout = await client.createCheckout({ merchantId, amountSats: sats, metadata });

        setInvoice(checkout.invoice);
        setPaymentId(checkout.id);
        setExpiresAt(checkout.expiresAt);

        pollRef.current = setInterval(async () => {
          try {
            const result = await client.getPaymentStatus(checkout.id);
            if (result.status === "paid") {
              setStatus("paid");
              stopPolling();
            } else if (result.status === "expired" || result.status === "failed") {
              setStatus(result.status);
              stopPolling();
            }
          } catch {
            // ignore transient poll errors
          }
        }, pollInterval);
      } catch (err) {
        setStatus("idle");
        setError(err instanceof Error ? err : new Error(String(err)));
        stopPolling();
      }
    },
    [apiKey, merchantId, baseUrl, options.amountSats, metadata, pollInterval, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setInvoice(null);
    setPaymentId(null);
    setExpiresAt(null);
    setError(null);
  }, [stopPolling]);

  return { status, invoice, paymentId, expiresAt, error, createPayment, reset };
}
