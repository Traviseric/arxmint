/**
 * Merchant discovery and checkout creation.
 *
 * Communicates with ArxMint's checkout API to create and poll payment sessions.
 */

import type { CheckoutSession } from './types.js';

/** Create a new checkout session for a merchant */
export async function createCheckoutSession(
  baseUrl: string,
  merchantId: string,
  amountSats: number,
  metadata?: Record<string, unknown>,
): Promise<CheckoutSession> {
  if (!merchantId) throw new Error('merchantId is required');
  if (!Number.isInteger(amountSats) || amountSats <= 0) {
    throw new Error('amountSats must be a positive integer');
  }

  const url = `${baseUrl}/api/checkout`;
  const body = JSON.stringify({ merchantId, amountSats, metadata });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Checkout creation failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<CheckoutSession>;
}

/** Poll a checkout session's status once */
export async function pollCheckoutStatus(
  baseUrl: string,
  sessionId: string,
): Promise<CheckoutSession> {
  const url = `${baseUrl}/api/checkout/${sessionId}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Status poll failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<CheckoutSession>;
}

/** Pay an existing checkout session's invoice via a payInvoice callback */
export async function payCheckoutInvoice(
  invoice: string,
  payInvoice: (bolt11: string) => Promise<string>,
): Promise<string> {
  return payInvoice(invoice);
}
