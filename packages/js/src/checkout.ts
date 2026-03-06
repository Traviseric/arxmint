import type {
  CheckoutResult,
  CreateCheckoutOptions,
  ListPaymentsOptions,
  Payment,
  PaymentStatusResult,
} from "./types.js";

export async function createCheckout(
  baseUrl: string,
  apiKey: string,
  options: CreateCheckoutOptions
): Promise<CheckoutResult> {
  const res = await fetch(`${baseUrl}/api/v1/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ArxMint API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<CheckoutResult>;
}

export async function pollStatus(
  baseUrl: string,
  apiKey: string,
  paymentId: string
): Promise<PaymentStatusResult> {
  const res = await fetch(`${baseUrl}/api/v1/payments/${paymentId}/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ArxMint API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<PaymentStatusResult>;
}

export async function listPayments(
  baseUrl: string,
  apiKey: string,
  options: ListPaymentsOptions = {}
): Promise<Payment[]> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${baseUrl}/api/v1/payments${query}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ArxMint API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<Payment[]>;
}
