// ============================================================
// ArxMint — Mempool Data Client
// Live Bitcoin network data from mempool.space (free public API).
// Provides real mempool stats, fee estimates, and Lightning Network
// metrics for treasury intelligence and agent payment routing.
// ============================================================

const MEMPOOL_API = "https://mempool.space/api/v1";

export interface MempoolStats {
  count: number;
  vsize: number;
  totalFee: number;
  feeHistogram: Array<[number, number]>;
}

export interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface LightningStats {
  nodeCount: number;
  channelCount: number;
  totalCapacity: number;
  avgChannelSize: number;
  avgFeeRate: number;
  updatedAt: number;
}

export interface BlockTip {
  height: number;
  hash: string;
  time: number;
  difficulty: number;
}

/** Fetch current mempool stats (tx count, vsize, fee histogram) */
export async function getMempoolStats(): Promise<MempoolStats> {
  const res = await fetch(`${MEMPOOL_API}/mempool`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch mempool stats");
  return res.json();
}

/** Fetch recommended fee rates in sat/vB */
export async function getFeeEstimates(): Promise<FeeEstimates> {
  const res = await fetch(`${MEMPOOL_API}/fees/recommended`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch fee estimates");
  return res.json();
}

/** Fetch current block tip */
export async function getBlockTip(): Promise<BlockTip> {
  const res = await fetch(`${MEMPOOL_API}/blocks/tip`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch block tip");
  return res.json();
}

/** Fetch Lightning Network stats (node count, channel count, capacity) */
export async function getLightningStats(): Promise<LightningStats> {
  const res = await fetch("https://mempool.space/api/v1/lightning/statistics/latest", {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch Lightning Network stats");
  const data = await res.json();
  return {
    nodeCount: data.node_count ?? 0,
    channelCount: data.channel_count ?? 0,
    totalCapacity: data.total_capacity ?? 0,
    avgChannelSize: data.avg_channel_size ?? 0,
    avgFeeRate: data.avg_fee_rate ?? 0,
    updatedAt: data.added ? Date.parse(data.added) : Date.now(),
  };
}

/** Fetch price from mempool.space (tracks exchange rates) */
export async function getBTCPrice(): Promise<{ usd: number; eur: number; gbp: number }> {
  const res = await fetch(`${MEMPOOL_API}/prices`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch BTC price");
  return res.json();
}

/** Combine mempool + fee data into an actionable routing decision */
export interface RoutingAdvice {
  mempoolCongestion: "low" | "medium" | "high" | "extreme";
  recommendedFee: "economy" | "hour" | "halfHour" | "fastest";
  lightningRecommended: boolean;
  ecashRecommended: boolean;
  currentVSize: number;
  txBacklog: number;
}

export function computeRoutingAdvice(
  stats: MempoolStats,
  fees: FeeEstimates
): RoutingAdvice {
  const vsizeMB = stats.vsize / 1_000_000;
  let mempoolCongestion: RoutingAdvice["mempoolCongestion"];
  if (vsizeMB < 5) mempoolCongestion = "low";
  else if (vsizeMB < 20) mempoolCongestion = "medium";
  else if (vsizeMB < 50) mempoolCongestion = "high";
  else mempoolCongestion = "extreme";

  let recommendedFee: RoutingAdvice["recommendedFee"];
  if (fees.economyFee <= 2) recommendedFee = "economy";
  else if (fees.hourFee <= 10) recommendedFee = "hour";
  else if (fees.halfHourFee <= 25) recommendedFee = "halfHour";
  else recommendedFee = "fastest";

  const lightningRecommended = mempoolCongestion === "high" || mempoolCongestion === "extreme";
  const ecashRecommended = true;

  return {
    mempoolCongestion,
    recommendedFee,
    lightningRecommended,
    ecashRecommended,
    currentVSize: stats.vsize,
    txBacklog: stats.count,
  };
}

/** Get a complete network intelligence snapshot for the agent */
export async function getNetworkIntel() {
  const [stats, fees, tip, lnStats] = await Promise.all([
    getMempoolStats(),
    getFeeEstimates(),
    getBlockTip(),
    getLightningStats(),
  ]);

  const routing = computeRoutingAdvice(stats, fees);

  return {
    mempool: {
      pendingTxCount: stats.count,
      vsize: stats.vsize,
      feeHistogramBands: stats.feeHistogram.slice(0, 10),
    },
    fees: {
      ...fees,
      routingRecommendation: routing.recommendedFee,
    },
    blockTip,
    lightning: lnStats,
    routing,
    fetchedAt: Date.now(),
  };
}