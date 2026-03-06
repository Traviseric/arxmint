export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export interface ArxMintConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateCheckoutOptions {
  amount: number;
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
  webhookUrl?: string;
}

export interface CheckoutResult {
  id: string;
  invoice: string;
  expiresAt: number;
  checkoutUrl: string;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  paidAt?: number;
}

export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: number;
  paidAt?: number;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsOptions {
  status?: PaymentStatus;
  limit?: number;
}
