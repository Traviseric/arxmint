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

// ============================================================
// Grant Reporting (Phase 4.3)
//
// Built-in grant progress reporting that matches OpenSats cadence:
// monthly for first 3 months, then quarterly.
//
// Source: Doc 7 — OpenSats reporting requirements
// ============================================================

/** Reporting cadence type */
export type ReportCadence = "monthly" | "quarterly";

/** Grant progress report */
export interface GrantProgressReport {
  /** Report ID */
  id: string;
  /** Report period (e.g., "Month 1", "Q2 2026") */
  period: string;
  /** Report number (sequential) */
  reportNumber: number;
  /** Generated timestamp */
  generatedAt: number;
  /** Cadence this report follows */
  cadence: ReportCadence;
  /** Current BCE metrics snapshot */
  metrics: BCEMetrics;
  /** KPI progress (target vs actual) */
  kpiProgress: KPIProgressItem[];
  /** Milestone progress */
  milestoneProgress: MilestoneProgressItem[];
  /** Narrative progress notes */
  progressNotes: string[];
  /** Challenges and blockers */
  challenges: string[];
  /** Next period goals */
  nextPeriodGoals: string[];
  /** Budget spent to date (USD) */
  budgetSpentUSD: number;
  /** Total budget (USD) */
  totalBudgetUSD: number;
}

/** KPI progress tracking */
export interface KPIProgressItem {
  kpi: string;
  target: number;
  current: number;
  unit: string;
  percentComplete: number;
  onTrack: boolean;
}

/** Milestone progress tracking */
export interface MilestoneProgressItem {
  milestoneId: number;
  title: string;
  status: "not-started" | "in-progress" | "completed" | "delayed";
  percentComplete: number;
  notes: string;
}

/**
 * Determine reporting cadence based on month number.
 * OpenSats: monthly for first 3 months, then quarterly.
 */
export function getReportCadence(monthNumber: number): ReportCadence {
  return monthNumber <= 3 ? "monthly" : "quarterly";
}

/**
 * Generate reporting schedule for a grant period.
 * Returns array of { month, period label, cadence }.
 */
export function generateReportSchedule(
  totalMonths: number,
  startDate: string
): Array<{ month: number; label: string; cadence: ReportCadence; dueDate: string }> {
  const schedule: Array<{ month: number; label: string; cadence: ReportCadence; dueDate: string }> = [];
  const start = new Date(startDate);

  // Monthly reports for months 1-3
  for (let m = 1; m <= Math.min(3, totalMonths); m++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + m);
    schedule.push({
      month: m,
      label: `Month ${m}`,
      cadence: "monthly",
      dueDate: due.toISOString().split("T")[0],
    });
  }

  // Quarterly reports after month 3
  if (totalMonths > 3) {
    let quarter = 1;
    for (let m = 6; m <= totalMonths; m += 3) {
      quarter++;
      const due = new Date(start);
      due.setMonth(due.getMonth() + m);
      schedule.push({
        month: m,
        label: `Q${quarter} (Month ${m})`,
        cadence: "quarterly",
        dueDate: due.toISOString().split("T")[0],
      });
    }
  }

  // Final report
  if (totalMonths > 3) {
    const finalDue = new Date(start);
    finalDue.setMonth(finalDue.getMonth() + totalMonths);
    const lastEntry = schedule[schedule.length - 1];
    if (!lastEntry || lastEntry.month !== totalMonths) {
      schedule.push({
        month: totalMonths,
        label: `Final Report (Month ${totalMonths})`,
        cadence: "quarterly",
        dueDate: finalDue.toISOString().split("T")[0],
      });
    }
  }

  return schedule;
}

/**
 * Generate a grant progress report from current metrics.
 */
export function generateProgressReport(
  metrics: BCEMetrics,
  reportNumber: number,
  periodLabel: string,
  targets: {
    merchantsTarget: number;
    mauTarget: number;
    successRateTarget: number;
    uptimeTarget: number;
    spendVelocityTarget: number;
  },
  milestones: Array<{ id: number; title: string; status: MilestoneProgressItem["status"]; percentComplete: number; notes: string }>,
  notes: string[],
  challenges: string[],
  nextGoals: string[],
  budgetSpentUSD: number,
  totalBudgetUSD: number
): GrantProgressReport {
  const cadence = getReportCadence(reportNumber);
  const milestoneProgress: MilestoneProgressItem[] = milestones.map((m) => ({
    milestoneId: m.id,
    title: m.title,
    status: m.status,
    percentComplete: m.percentComplete,
    notes: m.notes,
  }));

  const kpiProgress: KPIProgressItem[] = [
    {
      kpi: "Merchants Onboarded",
      target: targets.merchantsTarget,
      current: metrics.merchantCount,
      unit: "merchants",
      percentComplete: Math.round((metrics.merchantCount / targets.merchantsTarget) * 100),
      onTrack: metrics.merchantCount >= (targets.merchantsTarget * reportNumber) / 6,
    },
    {
      kpi: "Monthly Active Spenders",
      target: targets.mauTarget,
      current: metrics.mau,
      unit: "users",
      percentComplete: Math.round((metrics.mau / targets.mauTarget) * 100),
      onTrack: metrics.mau >= (targets.mauTarget * reportNumber) / 6,
    },
    {
      kpi: "Payment Success Rate",
      target: targets.successRateTarget * 100,
      current: Math.round(metrics.paymentSuccessRate * 100 * 10) / 10,
      unit: "%",
      percentComplete: Math.round((metrics.paymentSuccessRate / targets.successRateTarget) * 100),
      onTrack: metrics.paymentSuccessRate >= targets.successRateTarget * 0.95,
    },
    {
      kpi: "Uptime",
      target: targets.uptimeTarget * 100,
      current: Math.round(metrics.uptime * 100 * 10) / 10,
      unit: "%",
      percentComplete: Math.round((metrics.uptime / targets.uptimeTarget) * 100),
      onTrack: metrics.uptime >= targets.uptimeTarget * 0.95,
    },
    {
      kpi: "Spend Velocity",
      target: targets.spendVelocityTarget,
      current: metrics.spendVelocity,
      unit: "tx/user/month",
      percentComplete: Math.round((metrics.spendVelocity / targets.spendVelocityTarget) * 100),
      onTrack: metrics.spendVelocity >= targets.spendVelocityTarget * 0.7,
    },
  ];

  return {
    id: `report_${reportNumber}_${Date.now().toString(36)}`,
    period: periodLabel,
    reportNumber,
    generatedAt: Date.now(),
    cadence,
    metrics,
    kpiProgress,
    milestoneProgress,
    progressNotes: notes,
    challenges,
    nextPeriodGoals: nextGoals,
    budgetSpentUSD,
    totalBudgetUSD,
  };
}

/** Export a progress report as Markdown */
export function exportReportMarkdown(report: GrantProgressReport): string {
  const lines: string[] = [
    `# Grant Progress Report — ${report.period}`,
    "",
    `**Report #${report.reportNumber}** | ${report.cadence} cadence`,
    `**Generated:** ${new Date(report.generatedAt).toISOString().split("T")[0]}`,
    `**BCE Tier:** ${report.metrics.maturityTier} | Health Score: ${report.metrics.healthScore}/100`,
    "",
    "## KPI Progress",
    "",
    "| KPI | Target | Current | Progress | On Track |",
    "|-----|--------|---------|----------|----------|",
  ];

  report.kpiProgress.forEach((k) => {
    const bar = `${k.percentComplete}%`;
    const status = k.onTrack ? "Yes" : "**No**";
    lines.push(`| ${k.kpi} | ${k.target}${k.unit === "%" ? "%" : ` ${k.unit}`} | ${k.current}${k.unit === "%" ? "%" : ` ${k.unit}`} | ${bar} | ${status} |`);
  });

  lines.push("");
  lines.push("## Milestone Progress");
  lines.push("");

  report.milestoneProgress.forEach((m) => {
    const statusIcon = m.status === "completed" ? "[x]" : m.status === "in-progress" ? "[-]" : m.status === "delayed" ? "[!]" : "[ ]";
    lines.push(`- ${statusIcon} **Milestone ${m.milestoneId}: ${m.title}** — ${m.percentComplete}% (${m.status})`);
    if (m.notes) lines.push(`  - ${m.notes}`);
  });

  lines.push("");
  lines.push("## Progress Notes");
  lines.push("");
  report.progressNotes.forEach((n) => lines.push(`- ${n}`));

  if (report.challenges.length > 0) {
    lines.push("");
    lines.push("## Challenges & Blockers");
    lines.push("");
    report.challenges.forEach((c) => lines.push(`- ${c}`));
  }

  lines.push("");
  lines.push("## Next Period Goals");
  lines.push("");
  report.nextPeriodGoals.forEach((g) => lines.push(`- ${g}`));

  lines.push("");
  lines.push("## Budget");
  lines.push("");
  const budgetPercent = Math.round((report.budgetSpentUSD / report.totalBudgetUSD) * 100);
  lines.push(`- Spent to date: $${report.budgetSpentUSD.toLocaleString()} / $${report.totalBudgetUSD.toLocaleString()} (${budgetPercent}%)`);

  lines.push("");
  lines.push("---");
  lines.push(`*Generated by ArxMint Grant Reporting — ${new Date(report.generatedAt).toISOString()}*`);

  return lines.join("\n");
}
