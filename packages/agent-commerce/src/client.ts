/**
 * AgentCommerceClient — agent-to-agent Bitcoin commerce client.
 *
 * Orchestrates L402 auto-pay, merchant checkout, and payment streaming
 * using @te-btc/agent-wallet for budget-controlled payments.
 */

import type { AgentWallet } from '@te-btc/agent-wallet';
import type {
  AgentCommerceConfig,
  CheckoutSession,
  PaymentEvent,
  PaymentResult,
} from './types.js';
import { l402AgentFetch } from './l402.js';
import {
  createCheckoutSession,
  payCheckoutInvoice,
  pollCheckoutStatus,
} from './merchant.js';

const DEFAULT_MAX_L402_SATS = 10_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 60_000;

export class AgentCommerceClient {
  private readonly agentWallet: AgentWallet;
  private readonly baseUrl: string;
  private readonly maxL402Sats: number;
  private readonly pollIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(config: AgentCommerceConfig) {
    if (!config.baseUrl) throw new Error('baseUrl is required');
    if (!config.agentWallet) throw new Error('agentWallet is required');

    this.agentWallet = config.agentWallet;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.maxL402Sats = config.maxL402Sats ?? DEFAULT_MAX_L402_SATS;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Fetch a URL, automatically paying any L402 challenge encountered.
   *
   * Uses the agent wallet's payL402() for budget-enforced payment.
   * On a 402 response the client parses the challenge, verifies the amount
   * is within maxL402Sats, pays via the wallet, and retries with the token.
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const payFn = this._getPayInvoiceFn();
    return l402AgentFetch(url, payFn, init, this.maxL402Sats);
  }

  /**
   * Create a checkout session for a merchant and pay it autonomously.
   *
   * Flow:
   * 1. POST /api/checkout to create session + get invoice
   * 2. Pay the Lightning invoice via agent wallet
   * 3. Poll until paid or timeout
   */
  async pay(
    merchantId: string,
    amountSats: number,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentResult> {
    const session = await createCheckoutSession(
      this.baseUrl,
      merchantId,
      amountSats,
      metadata,
    );

    const payFn = this._getPayInvoiceFn();
    const preimage = await payCheckoutInvoice(session.invoice, payFn);

    // Poll until confirmed or timeout
    const confirmed = await this._pollUntilPaid(session.sessionId);

    return {
      sessionId: confirmed.sessionId,
      amountSats: confirmed.amountSats,
      preimage,
      merchantId: confirmed.merchantId,
      paidAt: new Date().toISOString(),
      metadata: confirmed.metadata,
    };
  }

  /**
   * Watch a payment session via polling, yielding status events.
   *
   * Yields a PaymentEvent for each status change until terminal state
   * (paid | expired | failed) or timeout.
   */
  async *watchPayment(sessionId: string): AsyncIterable<PaymentEvent> {
    const deadline = Date.now() + this.timeoutMs;
    let lastStatus: string | null = null;

    while (Date.now() < deadline) {
      const session = await pollCheckoutStatus(this.baseUrl, sessionId);

      if (session.status !== lastStatus) {
        lastStatus = session.status;
        yield {
          sessionId,
          status: session.status,
          timestamp: new Date().toISOString(),
        };
      }

      if (
        session.status === 'paid' ||
        session.status === 'expired' ||
        session.status === 'failed'
      ) {
        return;
      }

      await sleep(this.pollIntervalMs);
    }

    yield {
      sessionId,
      status: 'expired',
      message: 'Payment watch timed out',
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private _getPayInvoiceFn(): (bolt11: string) => Promise<string> {
    // AgentWallet.melt(bolt11) pays a Lightning invoice and returns MeltResult
    // which includes the payment preimage.
    const wallet = this.agentWallet as AgentWallet & {
      melt?: (invoice: string) => Promise<{ preimage: string | null }>;
    };

    if (typeof wallet.melt === 'function') {
      return async (bolt11: string) => {
        const result = await wallet.melt!(bolt11);
        if (!result.preimage) throw new Error('Payment failed: no preimage returned');
        return result.preimage;
      };
    }
    throw new Error(
      'agentWallet must implement melt(bolt11) to pay Lightning invoices',
    );
  }

  private async _pollUntilPaid(sessionId: string): Promise<CheckoutSession> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const session = await pollCheckoutStatus(this.baseUrl, sessionId);

      if (session.status === 'paid') return session;
      if (session.status === 'expired' || session.status === 'failed') {
        throw new Error(`Payment session ${sessionId} ended with status: ${session.status}`);
      }

      await sleep(this.pollIntervalMs);
    }

    throw new Error(`Payment session ${sessionId} timed out after ${this.timeoutMs}ms`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
