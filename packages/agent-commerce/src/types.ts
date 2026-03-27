// ─── Shared Types — @arxmint/agent-commerce ──────────────────────────────────

/** Result of a successful payment through AgentCommerceClient */
export interface PaymentResult {
  /** Unique payment session identifier */
  sessionId: string;
  /** Amount paid in satoshis */
  amountSats: number;
  /** Lightning payment preimage (proof of payment) */
  preimage: string;
  /** Merchant identifier */
  merchantId: string;
  /** ISO timestamp of payment */
  paidAt: string;
  /** Optional merchant-provided metadata */
  metadata?: Record<string, unknown>;
}

/** A streaming event emitted while watching a payment session */
export interface PaymentEvent {
  /** Session this event belongs to */
  sessionId: string;
  /** Current payment status */
  status: 'pending' | 'paid' | 'expired' | 'failed';
  /** Optional status message */
  message?: string;
  /** ISO timestamp */
  timestamp: string;
}

/** A parsed L402 challenge from a WWW-Authenticate header */
export interface L402ChallengeInfo {
  /** Base64-encoded macaroon */
  macaroon: string;
  /** BOLT11 Lightning invoice */
  invoice: string;
  /** Amount in sats (decoded from invoice, if parseable) */
  amountSats?: number;
}

/** Configuration for AgentCommerceClient */
export interface AgentCommerceConfig {
  /** Base URL of the ArxMint instance (e.g. https://arxmint.com) */
  baseUrl: string;
  /**
   * Agent wallet for budget-controlled payments.
   * Must have a payInvoice callback configured.
   */
  agentWallet: import('@te-btc/agent-wallet').AgentWallet;
  /**
   * Maximum sats the client will pay for a single L402 challenge.
   * Prevents runaway spend on unexpected invoices.
   * Defaults to 10_000 sats.
   */
  maxL402Sats?: number;
  /**
   * How often to poll for payment status (ms).
   * Defaults to 1_000ms.
   */
  pollIntervalMs?: number;
  /**
   * Maximum time to wait for payment confirmation (ms).
   * Defaults to 60_000ms.
   */
  timeoutMs?: number;
}

/** Checkout session created by the merchant API */
export interface CheckoutSession {
  sessionId: string;
  merchantId: string;
  amountSats: number;
  invoice: string;
  expiresAt: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  metadata?: Record<string, unknown>;
}
