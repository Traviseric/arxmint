export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export interface ArxMintConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateCheckoutOptions {
  /** Which merchant to pay (e.g. "seed-glacier", "arxmint-store", or a DB merchant ID). */
  merchantId: string;
  /** Payment amount in satoshis. */
  amountSats: number;
  /** Optional payment description (max 200 chars). */
  memo?: string;
  /** Optional metadata sent with the checkout request. Reserved for future merchant webhook forwarding. */
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  /** Checkout session ID (mapped from server `sessionId`). */
  id: string;
  invoice: string;
  /** Expiry as Unix milliseconds (converted from server ISO string). */
  expiresAt: number;
  /** Constructed checkout URL: `${baseUrl}/pay/${merchantId}`. */
  checkoutUrl: string;
  merchantName?: string;
  amountSats: number;
  demoMode?: boolean;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  /** Paid timestamp as Unix milliseconds (converted from server ISO string), if paid. */
  paidAt?: number;
  amountSats?: number;
  /** ISO string — session creation timestamp. */
  createdAt?: string;
  /** ISO string — session expiry timestamp. */
  expiresAt?: string;
}

export interface Payment {
  id: string;
  amountSats: number;
  status: PaymentStatus;
  createdAt: number;
  paidAt?: number;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsOptions {
  status?: PaymentStatus;
  limit?: number;
}
