/**
 * L402 challenge parsing and payment flow.
 *
 * Wraps @te-btc/cashu-l402 l402Fetch() with AgentWallet integration.
 */

import type { L402ChallengeInfo } from './types.js';

/** Rough BOLT11 amount decoder — returns sats or null */
function decodeBolt11Sats(invoice: string): number | null {
  const match = invoice.match(/^lnbc(\d+)([munp]?)/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  if (Number.isNaN(n)) return null;
  switch (match[2].toLowerCase()) {
    case 'm': return n * 100_000;
    case 'u': return n * 100;
    case 'n': return Math.round(n * 0.1);
    case 'p': return Math.round(n * 0.0001);
    case '': return n * 100_000_000;
    default: return null;
  }
}

/**
 * Parse an L402 challenge from a WWW-Authenticate header value.
 *
 * Expected format: `L402 macaroon="<base64>", invoice="lnbc..."`
 */
export function parseL402Challenge(wwwAuthenticate: string): L402ChallengeInfo {
  const macaroonMatch = wwwAuthenticate.match(/macaroon="([^"]+)"/);
  const invoiceMatch = wwwAuthenticate.match(/invoice="([^"]+)"/);

  if (!macaroonMatch?.[1] || !invoiceMatch?.[1]) {
    throw new Error(`Invalid L402 WWW-Authenticate header: ${wwwAuthenticate}`);
  }

  const invoice = invoiceMatch[1];
  const amountSats = decodeBolt11Sats(invoice) ?? undefined;

  return {
    macaroon: macaroonMatch[1],
    invoice,
    amountSats,
  };
}

/**
 * Build an Authorization header for an L402 token.
 *
 * Format: `L402 <macaroon>:<preimage>`
 */
export function buildL402AuthHeader(macaroon: string, preimage: string): string {
  return `L402 ${macaroon}:${preimage}`;
}

/**
 * Attempt an L402-protected fetch using an AgentWallet for payment.
 *
 * Flow:
 * 1. Make initial request
 * 2. If 402, parse challenge, check maxSats guard, pay via agentWallet
 * 3. Retry with L402 Authorization header
 */
export async function l402AgentFetch(
  url: string,
  payInvoice: (bolt11: string) => Promise<string>,
  options?: RequestInit,
  maxSats?: number,
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status !== 402) {
    return response;
  }

  const wwwAuth = response.headers.get('WWW-Authenticate');
  if (!wwwAuth) {
    throw new Error('402 response missing WWW-Authenticate header');
  }

  const challenge = parseL402Challenge(wwwAuth);

  // Budget guard
  if (maxSats !== undefined && challenge.amountSats !== undefined) {
    if (challenge.amountSats > maxSats) {
      throw new Error(
        `L402 invoice (${challenge.amountSats} sats) exceeds maxL402Sats (${maxSats} sats)`,
      );
    }
  }

  const preimage = await payInvoice(challenge.invoice);
  const authHeader = buildL402AuthHeader(challenge.macaroon, preimage);

  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : (options?.headers as Record<string, string> | undefined) ?? {}),
      Authorization: authHeader,
    },
  });
}
