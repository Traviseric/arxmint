import { createCheckout, listPayments, pollStatus } from "./checkout.js";
import type {
  ArxMintConfig,
  CheckoutResult,
  CreateCheckoutOptions,
  ListPaymentsOptions,
  Payment,
  PaymentStatusResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://arxmint.com";

export class ArxMintClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ArxMintConfig) {
    if (!config.apiKey) {
      throw new Error("ArxMintClient: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Create a Lightning payment checkout session.
   * Returns an invoice and checkout URL for the payer.
   */
  async createCheckout(options: CreateCheckoutOptions): Promise<CheckoutResult> {
    if (!options.amountSats || options.amountSats <= 0) {
      throw new Error("createCheckout: amountSats must be a positive integer (sats)");
    }
    if (!options.merchantId) {
      throw new Error("createCheckout: merchantId is required");
    }
    return createCheckout(this.baseUrl, this.apiKey, options);
  }

  /**
   * Poll the status of a payment by its ID.
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    if (!paymentId) {
      throw new Error("getPaymentStatus: paymentId is required");
    }
    return pollStatus(this.baseUrl, this.apiKey, paymentId);
  }

  /**
   * List payments. Requires a live API key (arx_live_*).
   */
  async listPayments(options?: ListPaymentsOptions): Promise<Payment[]> {
    if (!this.apiKey.startsWith("arx_live_")) {
      throw new Error(
        "listPayments requires a live API key (arx_live_*). Public keys cannot list payments."
      );
    }
    return listPayments(this.baseUrl, this.apiKey, options);
  }
}
