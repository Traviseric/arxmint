// ============================================================
// ArxMint — Stripe Fiat On-Ramp
// Accepts credit card payments via Stripe, converts USD→sats
// at market rate, and mints Cashu ecash into the ArxMint economy.
//
// Philosophy: fiat is the on-ramp, not the rail. USD enters at
// the gate and converts to sats. From that point forward,
// everything is Bitcoin-native.
// ============================================================

import Stripe from "stripe";
import { fetchBTCPrice } from "./cycle-monitor";
import { logger } from "./logger";

// ---- Stripe Client Singleton ----

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "[ArxMint] STRIPE_SECRET_KEY is not set. " +
        "Add it to .env to enable fiat on-ramp."
    );
  }
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  return _stripe;
}

// ---- USD → Sats Conversion ----

/** Cached BTC price to avoid hammering CoinGecko on burst traffic */
let _cachedPrice: { usd: number; fetchedAt: number } | null = null;
const PRICE_CACHE_MS = 60_000; // 1 minute

/**
 * Get the current BTC/USD price, cached for 1 minute.
 * Falls back to a stale cache if CoinGecko is unreachable.
 */
export async function getBTCPriceUSD(): Promise<number> {
  const now = Date.now();
  if (_cachedPrice && now - _cachedPrice.fetchedAt < PRICE_CACHE_MS) {
    return _cachedPrice.usd;
  }
  try {
    const price = await fetchBTCPrice();
    _cachedPrice = { usd: price, fetchedAt: now };
    return price;
  } catch (err) {
    logger.warn("stripe_btc_price_fetch_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Use stale cache if available, otherwise throw
    if (_cachedPrice) return _cachedPrice.usd;
    throw new Error("Cannot fetch BTC price and no cached value available");
  }
}

/**
 * Convert a USD amount (in cents) to satoshis at the current market rate.
 *
 * Example: $5.00 = 500 cents. If BTC = $60,000:
 *   500 cents → $5.00 → 5 / 60000 BTC → 8,333 sats
 */
export async function usdCentsToSats(amountCents: number): Promise<{
  sats: number;
  btcPriceUsd: number;
  rateLockedAt: number;
}> {
  const btcPriceUsd = await getBTCPriceUSD();
  const usdAmount = amountCents / 100;
  const btcAmount = usdAmount / btcPriceUsd;
  const sats = Math.floor(btcAmount * 100_000_000);

  return {
    sats,
    btcPriceUsd,
    rateLockedAt: Date.now(),
  };
}

/**
 * Convert satoshis to USD cents at the current market rate.
 * Used for display purposes and accounting.
 */
export async function satsToUsdCents(sats: number): Promise<{
  cents: number;
  btcPriceUsd: number;
}> {
  const btcPriceUsd = await getBTCPriceUSD();
  const btcAmount = sats / 100_000_000;
  const usdAmount = btcAmount * btcPriceUsd;
  const cents = Math.round(usdAmount * 100);
  return { cents, btcPriceUsd };
}

// ---- Stripe Webhook Verification ----

/**
 * Verify a Stripe webhook signature.
 * Returns the parsed event or null if verification fails.
 */
export function verifyStripeWebhook(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("stripe_webhook_secret_missing", {
      action: "stripe_webhook_verify",
      message: "STRIPE_WEBHOOK_SECRET not set — cannot verify webhook",
    });
    return null;
  }
  try {
    const stripe = getStripeClient();
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    logger.warn("stripe_webhook_verification_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
