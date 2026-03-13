import type { PaymentStatus } from "@arxmint/js";

export type { PaymentStatus };

export interface PayButtonProps {
  apiKey: string;
  /** Payment amount in satoshis. */
  amountSats: number;
  merchantId: string;
  baseUrl?: string;
  onSuccess?: (payment: { id: string; paidAt: number }) => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface CheckoutFormProps {
  apiKey: string;
  merchantId: string;
  /** Pre-set amount in satoshis. If omitted, an input field is shown. */
  amountSats?: number;
  baseUrl?: string;
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
  onSuccess?: (payment: { id: string; paidAt: number }) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface QRPaymentProps {
  invoice: string;
  paymentId: string;
  apiKey: string;
  baseUrl?: string;
  expiresAt: number;
  onPaid?: (paidAt: number) => void;
  onExpired?: () => void;
  className?: string;
}

export interface UsePaymentOptions {
  apiKey: string;
  merchantId: string;
  /** Default amount in satoshis (can be overridden per call). */
  amountSats?: number;
  baseUrl?: string;
  metadata?: Record<string, unknown>;
  pollInterval?: number;
}

export interface UsePaymentResult {
  status: PaymentStatus | "idle";
  invoice: string | null;
  paymentId: string | null;
  expiresAt: number | null;
  error: Error | null;
  createPayment: (amountSats?: number) => Promise<void>;
  reset: () => void;
}
