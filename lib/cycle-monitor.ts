// ============================================================
// ArxMint — Cycle Monitor
// BTC cycle signals from public APIs (no trading, just signals)
// "Hoard the good money (BTC), spend the bad (USD)"
// ============================================================

import type { CycleMetrics, CycleSignal } from "./types";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

/** Fetch current BTC price in USD from CoinGecko (free, no key) */
export async function fetchBTCPrice(): Promise<number> {
  const res = await fetch(
    `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd`,
    { next: { revalidate: 300 } } // cache 5 minutes
  );
  if (!res.ok) throw new Error("Failed to fetch BTC price");
  const data = await res.json();
  return data.bitcoin.usd;
}

/** Fetch BTC market data from CoinGecko */
export async function fetchMarketData(): Promise<{
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  ath: number;
  athDate: string;
}> {
  const res = await fetch(
    `${COINGECKO_API}/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Failed to fetch market data");
  const data = await res.json();
  return {
    price: data.market_data.current_price.usd,
    marketCap: data.market_data.market_cap.usd,
    volume24h: data.market_data.total_volume.usd,
    priceChange24h: data.market_data.price_change_percentage_24h,
    priceChange7d: data.market_data.price_change_percentage_7d,
    ath: data.market_data.ath.usd,
    athDate: data.market_data.ath_date.usd,
  };
}

/** Fetch historical BTC prices (daily, last N days) */
export async function fetchPriceHistory(
  days: number = 365
): Promise<Array<{ date: number; price: number }>> {
  const res = await fetch(
    `${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    { next: { revalidate: 3600 } } // cache 1 hour
  );
  if (!res.ok) throw new Error("Failed to fetch price history");
  const data = await res.json();
  return data.prices.map(([timestamp, price]: [number, number]) => ({
    date: timestamp,
    price,
  }));
}

/**
 * Compute a simple MVRV-like ratio from price data.
 * Uses 200-day realized price as a proxy for realized value.
 * This is a simplified version — real MVRV needs on-chain data (Glassnode).
 */
export function computeSimpleMVRV(
  prices: Array<{ price: number }>
): number {
  if (prices.length < 200) return 1;
  const recent = prices.slice(-200);
  const realizedPrice =
    recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
  const currentPrice = prices[prices.length - 1].price;
  return currentPrice / realizedPrice;
}

/**
 * Compute NUPL-like metric (Net Unrealized Profit/Loss).
 * Simplified: compares current price to 1-year average.
 */
export function computeSimpleNUPL(
  prices: Array<{ price: number }>
): number {
  if (prices.length < 30) return 0;
  const avgPrice =
    prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
  const currentPrice = prices[prices.length - 1].price;
  return (currentPrice - avgPrice) / currentPrice;
}

/**
 * Compute supply in profit estimate.
 * Simplified: % of last 365 daily prices below current price.
 */
export function computeSupplyInProfit(
  prices: Array<{ price: number }>
): number {
  if (prices.length === 0) return 0;
  const currentPrice = prices[prices.length - 1].price;
  const belowCount = prices.filter((p) => p.price < currentPrice).length;
  return belowCount / prices.length;
}

/** Determine cycle signal from metrics */
export function determineCycleSignal(
  mvrv: number,
  nupl: number,
  supplyInProfit: number
): CycleSignal {
  // Strong buy: MVRV < 1 (below realized), NUPL negative, <50% supply in profit
  if (mvrv < 1 && nupl < 0 && supplyInProfit < 0.5) return "strong-buy";

  // Buy: MVRV < 1.5, low NUPL
  if (mvrv < 1.5 && nupl < 0.25) return "buy";

  // Strong sell: MVRV > 3.5, NUPL > 0.75, >95% supply in profit
  if (mvrv > 3.5 && nupl > 0.75 && supplyInProfit > 0.95) return "strong-sell";

  // Sell: MVRV > 2.5, high NUPL
  if (mvrv > 2.5 && nupl > 0.5) return "sell";

  return "neutral";
}

/** Get full cycle metrics snapshot */
export async function getCycleMetrics(): Promise<CycleMetrics> {
  const priceHistory = await fetchPriceHistory(365);
  const prices = priceHistory.map((p) => ({ price: p.price }));

  const mvrv = computeSimpleMVRV(prices);
  const nupl = computeSimpleNUPL(prices);
  const supplyInProfit = computeSupplyInProfit(prices);
  const currentPrice = prices[prices.length - 1]?.price || 0;
  const signal = determineCycleSignal(mvrv, nupl, supplyInProfit);

  return {
    mvrv,
    nupl,
    supplyInProfit,
    price: currentPrice,
    signal,
    timestamp: Date.now(),
  };
}

/** Human-readable signal descriptions */
export const SIGNAL_DESCRIPTIONS: Record<
  CycleSignal,
  { label: string; action: string; color: string }
> = {
  "strong-buy": {
    label: "Strong Accumulate",
    action: "Convert USD to BTC aggressively. Generational opportunity.",
    color: "#00C853",
  },
  buy: {
    label: "Accumulate",
    action: "Dollar-cost average into BTC. Spend USD where possible.",
    color: "#69F0AE",
  },
  neutral: {
    label: "Hold",
    action: "Maintain positions. Stack normally. Spend USD for daily needs.",
    color: "#FFD54F",
  },
  sell: {
    label: "Take Profit",
    action: "Consider spending BTC on real goods. Reduce exposure to USD.",
    color: "#FF8A65",
  },
  "strong-sell": {
    label: "Distribute",
    action: "Spend BTC on real assets/goods. Cycle top signals firing.",
    color: "#FF5252",
  },
};
