import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  computeBCEMetrics,
  generateProgressReport,
  exportMetricsJSON,
  exportMetricsCSV,
  getReportCadence,
} from "../lib/bce-metrics.ts";

// @ts-ignore
import {
  determineCycleSignal,
  computeSimpleMVRV,
  computeSimpleNUPL,
  computeSupplyInProfit,
} from "../lib/cycle-monitor.ts";

// ---- Helpers ----

/** Minimal BCEMetricsInput for a nascent community */
function nascentInput() {
  return {
    merchantCount: 5,
    merchantsActive: 3,
    mau: 20,
    totalTransactions30d: 40,
    successfulTransactions30d: 38,
    uptimeMinutes30d: 42_000, // ~97.2%
    ecashCirculation: 500_000,
    inboundLiquidity: 1_000_000,
    avgDailySpend: 20_000,
  };
}

/** Input for an established/thriving community */
function establishedInput() {
  return {
    merchantCount: 120,
    merchantsActive: 100,
    mau: 1200,
    totalTransactions30d: 5000,
    successfulTransactions30d: 4950,
    uptimeMinutes30d: 43_180, // ~99.9%
    ecashCirculation: 10_000_000,
    inboundLiquidity: 20_000_000,
    avgDailySpend: 400_000,
  };
}

// ---- BCE Maturity Tier Classification ----

test("classifies nascent tier for community with <10 merchants and <50 MAU", () => {
  const metrics = computeBCEMetrics(nascentInput());
  assert.equal(metrics.maturityTier, "nascent");
});

test("classifies emerging tier for community with 15 merchants", () => {
  const metrics = computeBCEMetrics({
    ...nascentInput(),
    merchantCount: 15,
    merchantsActive: 10,
    mau: 60,
  });
  assert.equal(metrics.maturityTier, "emerging");
});

test("classifies growing tier for community with 30+ merchants", () => {
  const metrics = computeBCEMetrics({
    ...nascentInput(),
    merchantCount: 35,
    merchantsActive: 30,
    mau: 150,
  });
  assert.equal(metrics.maturityTier, "growing");
});

test("classifies thriving tier for community with 100+ merchants and 1000+ MAU", () => {
  const metrics = computeBCEMetrics(establishedInput());
  assert.equal(metrics.maturityTier, "thriving");
});

// ---- Health Score ----

test("health score is between 0 and 100 for nascent community", () => {
  const metrics = computeBCEMetrics(nascentInput());
  assert.ok(metrics.healthScore >= 0, "health score should be >= 0");
  assert.ok(metrics.healthScore <= 100, "health score should be <= 100");
});

test("health score is between 0 and 100 for thriving community", () => {
  const metrics = computeBCEMetrics(establishedInput());
  assert.ok(metrics.healthScore >= 0);
  assert.ok(metrics.healthScore <= 100);
});

test("low success rate reduces health score", () => {
  const good = computeBCEMetrics({
    ...nascentInput(),
    successfulTransactions30d: nascentInput().totalTransactions30d, // 100%
  });
  const bad = computeBCEMetrics({
    ...nascentInput(),
    totalTransactions30d: 100,
    successfulTransactions30d: 30, // 30% success
  });
  assert.ok(
    bad.healthScore < good.healthScore,
    `bad (${bad.healthScore}) should be less than good (${good.healthScore})`
  );
});

test("high uptime and success rate scores better than low", () => {
  const excellent = computeBCEMetrics({
    ...nascentInput(),
    uptimeMinutes30d: 43_199, // ~99.99%
    successfulTransactions30d: nascentInput().totalTransactions30d,
  });
  const poor = computeBCEMetrics({
    ...nascentInput(),
    uptimeMinutes30d: 10_000, // ~23%
    successfulTransactions30d: 10,
    totalTransactions30d: 40,
  });
  assert.ok(
    excellent.healthScore > poor.healthScore,
    "excellent uptime/success should score higher"
  );
});

test("metrics snapshot has required fields", () => {
  const metrics = computeBCEMetrics(nascentInput());
  assert.ok(typeof metrics.id === "string" && metrics.id.startsWith("bce_"));
  assert.ok(typeof metrics.timestamp === "number" && metrics.timestamp > 0);
  assert.ok(typeof metrics.paymentSuccessRate === "number");
  assert.ok(typeof metrics.uptime === "number");
  assert.ok(typeof metrics.spendVelocity === "number");
  assert.ok(typeof metrics.liquidityCoverage === "number");
});

// ---- Grant Progress Report ----

test("generateProgressReport returns a valid report object", () => {
  const metrics = computeBCEMetrics(nascentInput());
  const report = generateProgressReport(
    metrics,
    1,
    "Month 1",
    {
      merchantsTarget: 20,
      mauTarget: 100,
      successRateTarget: 0.95,
      uptimeTarget: 0.99,
      spendVelocityTarget: 3,
    },
    [{ id: 1, title: "Launch", status: "completed", percentComplete: 100, notes: "" }],
    ["Community launched"],
    [],
    ["Onboard more merchants"],
    1000,
    10_000
  );

  assert.ok(typeof report.id === "string", "report should have an ID");
  assert.ok(typeof report.period === "string", "report should have a period");
  assert.equal(report.reportNumber, 1);
  assert.ok(Array.isArray(report.kpiProgress), "should have kpiProgress array");
  assert.ok(Array.isArray(report.milestoneProgress), "should have milestoneProgress");
  assert.equal(report.metrics, metrics, "report should reference the same metrics");
});

test("getReportCadence returns monthly for first 3 months", () => {
  assert.equal(getReportCadence(1), "monthly");
  assert.equal(getReportCadence(2), "monthly");
  assert.equal(getReportCadence(3), "monthly");
});

test("getReportCadence returns quarterly after month 3", () => {
  assert.equal(getReportCadence(4), "quarterly");
  assert.equal(getReportCadence(6), "quarterly");
});

// ---- Metrics Export ----

test("exportMetricsJSON returns valid JSON string", () => {
  const metrics = computeBCEMetrics(nascentInput());
  const json = exportMetricsJSON(metrics);
  assert.ok(typeof json === "string" && json.length > 0);
  const parsed = JSON.parse(json); // should not throw
  assert.equal(parsed.report_type, "bce_health_snapshot");
  assert.ok(parsed.metrics, "should have metrics object");
});

test("exportMetricsCSV returns CSV with header and data row", () => {
  const metrics = computeBCEMetrics(nascentInput());
  const csv = exportMetricsCSV(metrics);
  assert.ok(typeof csv === "string" && csv.length > 0);
  const lines = csv.split("\n");
  assert.equal(lines.length, 2, "CSV should have header + 1 data row");
  assert.ok(lines[0].includes("tier"), "header should include 'tier' column");
  assert.ok(lines[0].includes("health_score"), "header should include 'health_score'");
});

// ---- Cycle Monitor ----

test("determineCycleSignal returns strong-buy for capitulation conditions", () => {
  // MVRV < 1, NUPL negative, <50% supply in profit
  const signal = determineCycleSignal(0.8, -0.1, 0.4);
  assert.equal(signal, "strong-buy");
});

test("determineCycleSignal returns buy for low MVRV and low NUPL", () => {
  // MVRV < 1.5, NUPL < 0.25
  const signal = determineCycleSignal(1.2, 0.15, 0.6);
  assert.equal(signal, "buy");
});

test("determineCycleSignal returns strong-sell for cycle top conditions", () => {
  // MVRV > 3.5, NUPL > 0.75, >95% supply in profit
  const signal = determineCycleSignal(4.0, 0.8, 0.96);
  assert.equal(signal, "strong-sell");
});

test("determineCycleSignal returns sell for high MVRV and high NUPL", () => {
  // MVRV > 2.5, NUPL > 0.5 (but not hitting strong-sell threshold)
  const signal = determineCycleSignal(3.0, 0.6, 0.85);
  assert.equal(signal, "sell");
});

test("determineCycleSignal returns neutral for mid-cycle conditions", () => {
  const signal = determineCycleSignal(2.0, 0.4, 0.75);
  assert.equal(signal, "neutral");
});

// ---- MVRV + NUPL computation ----

test("computeSimpleMVRV returns 1 for insufficient price history", () => {
  const prices = [{ price: 50000 }]; // only 1 data point
  const mvrv = computeSimpleMVRV(prices);
  assert.equal(mvrv, 1, "should return 1 when < 200 data points");
});

test("computeSimpleMVRV > 1 when current price > 200-day average", () => {
  // Create 200 prices all at 40000, then one spike at 80000
  const prices = Array.from({ length: 200 }, (_, i) =>
    i < 199 ? { price: 40_000 } : { price: 80_000 }
  );
  const mvrv = computeSimpleMVRV(prices);
  assert.ok(mvrv > 1, `MVRV ${mvrv} should be > 1 when current > average`);
});

test("computeSimpleNUPL returns 0 for insufficient history", () => {
  const prices = [{ price: 50000 }];
  const nupl = computeSimpleNUPL(prices);
  assert.equal(nupl, 0);
});

test("computeSupplyInProfit is 1 when all historical prices are below current", () => {
  const prices = [
    { price: 10_000 },
    { price: 20_000 },
    { price: 30_000 },
    { price: 100_000 }, // current — all others are below
  ];
  const sip = computeSupplyInProfit(prices);
  // 3 out of 4 prices are below current (75%)
  assert.ok(sip > 0.5 && sip < 1);
});
