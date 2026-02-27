"use client";

// ============================================================
// ArxMint — Bitcoin Circular Economy (BCE) Metrics
// Community health metrics for dashboard + grant reporting.
//
// Source: Doc 7 — FBCE maturity tiers, KPI frameworks
// Metrics tracked: merchant count, MAU, spend velocity,
// payment success rate, federation uptime, liquidity.
// ============================================================

/** BCE maturity tier (from Doc 7 FBCE framework) */
export type BCEMaturityTier =
  | "nascent"      // 0-10 merchants, <50 users
  | "emerging"     // 10-30 merchants, 50-200 users
  | "growing"      // 30-100 merchants, 200-1000 users
  | "established"  // 100+ merchants, 1000+ users
  | "thriving";    // Self-sustaining circular economy

/** Snapshot of BCE community health metrics */
export interface BCEMetrics {
  /** Unique ID for this snapshot */
  id: string;
  /** Timestamp of this snapshot */
  timestamp: number;

  // --- Core KPIs (Doc 7) ---
  /** Total merchants onboarded */
  merchantCount: number;
  /** Merchants active in the last 30 days */
  merchantsActive: number;
  /** Monthly active spenders (unique users who spent in last 30d) */
  mau: number;
  /** Average spend events per user per month */
  spendVelocity: number;
  /** Payment success rate (0-1) */
  paymentSuccessRate: number;
  /** Federation/mint uptime (0-1) over last 30d */
  uptime: number;

  // --- Liquidity ---
  /** Total ecash in circulation (sats) */
  ecashCirculation: number;
  /** Lightning inbound liquidity (sats) */
  inboundLiquidity: number;
  /** Liquidity coverage ratio (inbound / avg daily spend) */
  liquidityCoverage: number;

  // --- Derived ---
  /** Current maturity tier */
  maturityTier: BCEMaturityTier;
  /** Health score (0-100) */
  healthScore: number;
}

/** Input data for computing metrics */
export interface BCEMetricsInput {
  merchantCount: number;
  merchantsActive: number;
  mau: number;
  totalTransactions30d: number;
  successfulTransactions30d: number;
  uptimeMinutes30d: number;
  ecashCirculation: number;
  inboundLiquidity: number;
  avgDailySpend: number;
}

/**
 * Compute BCE metrics from raw input data.
 */
export function computeBCEMetrics(input: BCEMetricsInput): BCEMetrics {
  const totalMinutes30d = 30 * 24 * 60;
  const uptime = Math.min(input.uptimeMinutes30d / totalMinutes30d, 1);
  const paymentSuccessRate = input.totalTransactions30d > 0
    ? input.successfulTransactions30d / input.totalTransactions30d
    : 1;
  const spendVelocity = input.mau > 0
    ? input.totalTransactions30d / input.mau
    : 0;
  const liquidityCoverage = input.avgDailySpend > 0
    ? input.inboundLiquidity / input.avgDailySpend
    : 0;

  const maturityTier = classifyMaturityTier(
    input.merchantCount,
    input.mau
  );
  const healthScore = computeHealthScore(
    input.merchantsActive,
    input.mau,
    spendVelocity,
    paymentSuccessRate,
    uptime
  );

  return {
    id: `bce_${Date.now().toString(36)}`,
    timestamp: Date.now(),
    merchantCount: input.merchantCount,
    merchantsActive: input.merchantsActive,
    mau: input.mau,
    spendVelocity: Math.round(spendVelocity * 10) / 10,
    paymentSuccessRate: Math.round(paymentSuccessRate * 1000) / 1000,
    uptime: Math.round(uptime * 1000) / 1000,
    ecashCirculation: input.ecashCirculation,
    inboundLiquidity: input.inboundLiquidity,
    liquidityCoverage: Math.round(liquidityCoverage * 10) / 10,
    maturityTier,
    healthScore,
  };
}

/** Classify maturity tier from Doc 7 thresholds */
function classifyMaturityTier(
  merchants: number,
  mau: number
): BCEMaturityTier {
  if (merchants >= 100 && mau >= 1000) return "thriving";
  if (merchants >= 100 || mau >= 1000) return "established";
  if (merchants >= 30 || mau >= 200) return "growing";
  if (merchants >= 10 || mau >= 50) return "emerging";
  return "nascent";
}

/**
 * Compute overall health score (0-100).
 * Weighted composite of key indicators.
 */
function computeHealthScore(
  merchantsActive: number,
  mau: number,
  spendVelocity: number,
  successRate: number,
  uptime: number
): number {
  // Weight: uptime 25%, success rate 25%, velocity 20%, MAU 20%, merchants 10%
  const uptimeScore = Math.min(uptime / 0.995, 1) * 25;        // 99.5% = full marks
  const successScore = Math.min(successRate / 0.98, 1) * 25;    // 98% = full marks
  const velocityScore = Math.min(spendVelocity / 5, 1) * 20;    // 5 tx/user/mo = full
  const mauScore = Math.min(mau / 300, 1) * 20;                 // 300 MAU = full
  const merchantScore = Math.min(merchantsActive / 30, 1) * 10; // 30 active = full

  return Math.round(uptimeScore + successScore + velocityScore + mauScore + merchantScore);
}

/** Tier label and color for UI */
export const TIER_INFO: Record<BCEMaturityTier, {
  label: string;
  color: string;
  description: string;
}> = {
  nascent: {
    label: "Nascent",
    color: "text-sovereign-muted",
    description: "Early stage — focus on onboarding first merchants and users",
  },
  emerging: {
    label: "Emerging",
    color: "text-blue-400",
    description: "Growing adoption — building merchant network and user habits",
  },
  growing: {
    label: "Growing",
    color: "text-green-400",
    description: "Strong momentum — circular spend patterns forming",
  },
  established: {
    label: "Established",
    color: "text-btc-orange",
    description: "Mature economy — reliable merchant network and regular users",
  },
  thriving: {
    label: "Thriving",
    color: "text-yellow-400",
    description: "Self-sustaining circular economy — minimal external support needed",
  },
};

/** Get demo/placeholder metrics for development */
export function getDemoBCEMetrics(): BCEMetrics {
  return computeBCEMetrics({
    merchantCount: 8,
    merchantsActive: 5,
    mau: 42,
    totalTransactions30d: 156,
    successfulTransactions30d: 149,
    uptimeMinutes30d: 42_300, // ~98%
    ecashCirculation: 2_450_000,
    inboundLiquidity: 5_000_000,
    avgDailySpend: 82_000,
  });
}

/**
 * Export metrics as JSON for grant reporting.
 * Format matches OpenSats/FBCE reporting requirements.
 */
export function exportMetricsJSON(metrics: BCEMetrics): string {
  return JSON.stringify({
    report_type: "bce_health_snapshot",
    generated_at: new Date(metrics.timestamp).toISOString(),
    generator: "ArxMint BCE Metrics v1.0",
    metrics: {
      maturity_tier: metrics.maturityTier,
      health_score: metrics.healthScore,
      merchants: {
        total: metrics.merchantCount,
        active_30d: metrics.merchantsActive,
      },
      users: {
        monthly_active: metrics.mau,
        spend_velocity: metrics.spendVelocity,
      },
      reliability: {
        payment_success_rate: metrics.paymentSuccessRate,
        uptime_30d: metrics.uptime,
      },
      liquidity: {
        ecash_circulation_sats: metrics.ecashCirculation,
        inbound_liquidity_sats: metrics.inboundLiquidity,
        coverage_ratio: metrics.liquidityCoverage,
      },
    },
  }, null, 2);
}

/**
 * Export metrics as CSV row for spreadsheet reporting.
 */
export function exportMetricsCSV(metrics: BCEMetrics): string {
  const header = "timestamp,tier,health_score,merchants,merchants_active,mau,velocity,success_rate,uptime,ecash_circ,inbound_liq,liq_coverage";
  const row = [
    new Date(metrics.timestamp).toISOString(),
    metrics.maturityTier,
    metrics.healthScore,
    metrics.merchantCount,
    metrics.merchantsActive,
    metrics.mau,
    metrics.spendVelocity,
    metrics.paymentSuccessRate,
    metrics.uptime,
    metrics.ecashCirculation,
    metrics.inboundLiquidity,
    metrics.liquidityCoverage,
  ].join(",");
  return `${header}\n${row}`;
}
