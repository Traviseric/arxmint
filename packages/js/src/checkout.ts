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
  const res = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      merchantId: options.merchantId,
      amountSats: options.amountSats,
      ...(options.memo && { memo: options.memo }),
      ...(options.metadata && { metadata: options.metadata }),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ArxMint API error ${res.status}: ${text}`);
  }

  // Server returns: { sessionId, invoice, expiresAt: ISO string, demoMode, merchantName, amountSats }
  const data = await res.json() as {
    sessionId: string;
    invoice: string;
    expiresAt: string;
    demoMode?: boolean;
    merchantName?: string;
    amountSats: number;
  };

  return {
    id: data.sessionId,
    invoice: data.invoice,
    expiresAt: new Date(data.expiresAt).getTime(),
    checkoutUrl: `${baseUrl}/pay/${options.merchantId}`,
    merchantName: data.merchantName,
    amountSats: data.amountSats,
    demoMode: data.demoMode,
  };
}

export async function pollStatus(
  baseUrl: string,
  apiKey: string,
  paymentId: string
): Promise<PaymentStatusResult> {
  const res = await fetch(`${baseUrl}/api/checkout/status/${paymentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ArxMint API error ${res.status}: ${text}`);
  }

  // Server returns: { id, status, amountSats, createdAt: ISO, expiresAt: ISO, paidAt?: ISO, demoMode? }
  const data = await res.json() as {
    id: string;
    status: string;
    amountSats: number;
    createdAt: string;
    expiresAt: string;
    paidAt?: string;
    demoMode?: boolean;
  };

  return {
    status: data.status as PaymentStatusResult["status"],
    ...(data.paidAt && { paidAt: new Date(data.paidAt).getTime() }),
    amountSats: data.amountSats,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

// NOTE: The ArxMint server does not currently expose a list-payments endpoint.
// This function is reserved for a future server-side payments API.
export async function listPayments(
  _baseUrl: string,
  _apiKey: string,
  _options: ListPaymentsOptions = {}
): Promise<Payment[]> {
  throw new Error(
    "listPayments is not yet available. The server-side payments list endpoint has not been implemented."
  );
}
