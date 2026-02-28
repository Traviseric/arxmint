"use client";

// ============================================================
// ArxMint — Cycle Alerts Component
// BTC cycle signals: MVRV, NUPL, supply in profit
// "Hoard the good money, spend the bad"
// ============================================================

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import type { CycleMetrics } from "@/lib/types";
import { SIGNAL_DESCRIPTIONS, getCycleMetrics } from "@/lib/cycle-monitor";
import { formatSats } from "@/lib/utils";

export function CycleAlerts() {
  const [metrics, setMetrics] = useState<CycleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await getCycleMetrics();
      setMetrics(m);
    } catch (e: any) {
      setError(e.message || "Failed to fetch cycle data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="sovereign-card animate-pulse">
        <div className="h-6 w-32 bg-sovereign-dark rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-sovereign-dark rounded" />
          <div className="h-16 bg-sovereign-dark rounded" />
          <div className="h-16 bg-sovereign-dark rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sovereign-card border-red-500/30">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-3 text-xs text-sovereign-muted hover:text-btc-orange transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const signal = SIGNAL_DESCRIPTIONS[metrics.signal];

  const SignalIcon =
    metrics.signal.includes("buy")
      ? TrendingUp
      : metrics.signal.includes("sell")
        ? TrendingDown
        : Minus;

  return (
    <div className="space-y-4">
      {/* Signal Banner */}
      <div
        className="rounded-xl border px-6 py-5"
        style={{
          borderColor: `${signal.color}33`,
          backgroundColor: `${signal.color}08`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <SignalIcon className="w-6 h-6" style={{ color: signal.color }} aria-hidden="true" />
            <div>
              <h3
                className="text-lg font-bold"
                style={{ color: signal.color }}
              >
                {signal.label}
              </h3>
              <p className="text-xs text-sovereign-muted">
                BTC ${metrics.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <button
            onClick={fetchMetrics}
            className="p-2 rounded-lg hover:bg-sovereign-dark/50 transition-colors"
            title="Refresh"
            aria-label="Refresh cycle metrics"
          >
            <RefreshCw className="w-4 h-4 text-sovereign-muted" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm text-sovereign-muted">{signal.action}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="MVRV (approx.)"
          value={metrics.mvrv.toFixed(2)}
          description="Price / 200-day SMA (price-based approx.)"
          tooltip="Approximation using 200-day price SMA. Real MVRV uses on-chain realized cap (Glassnode)."
          highlight={metrics.mvrv < 1 || metrics.mvrv > 3}
          color={metrics.mvrv < 1 ? "#00C853" : metrics.mvrv > 3 ? "#FF5252" : "#FFD54F"}
          zone={metrics.mvrv > 3.5 ? "High" : metrics.mvrv > 1 ? "Mid" : "Low"}
        />
        <MetricCard
          label="NUPL (approx.)"
          value={(metrics.nupl * 100).toFixed(1) + "%"}
          description="Price deviation from 1-yr avg (price-based approx.)"
          tooltip="Approximation using 1-year price average. Real NUPL uses on-chain UTXO profit data (Glassnode)."
          highlight={metrics.nupl < 0 || metrics.nupl > 0.75}
          color={metrics.nupl < 0 ? "#00C853" : metrics.nupl > 0.75 ? "#FF5252" : "#FFD54F"}
          zone={metrics.nupl > 0.75 ? "High" : metrics.nupl > 0 ? "Mid" : "Low"}
        />
        <MetricCard
          label="Supply in Profit"
          value={(metrics.supplyInProfit * 100).toFixed(0) + "%"}
          description="% of supply purchased below current price"
          highlight={metrics.supplyInProfit < 0.5 || metrics.supplyInProfit > 0.95}
          color={
            metrics.supplyInProfit < 0.5
              ? "#00C853"
              : metrics.supplyInProfit > 0.95
                ? "#FF5252"
                : "#FFD54F"
          }
          zone={metrics.supplyInProfit > 0.95 ? "High" : metrics.supplyInProfit > 0.5 ? "Mid" : "Low"}
        />
      </div>
      <p className="text-xs text-sovereign-muted mt-1">
        * MVRV and NUPL are price-based approximations (SMA ratios). On-chain UTXO data requires Glassnode API.
      </p>

      {/* Gresham's Law Reminder */}
      <div className="rounded-lg bg-sovereign-dark px-4 py-3 text-xs text-sovereign-muted">
        <span className="text-btc-orange font-medium">Gresham&apos;s Law: </span>
        Hoard the good money (BTC), spend the bad (USD). These signals help
        optimize timing — not financial advice.
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  tooltip,
  highlight,
  color,
  zone,
}: {
  label: string;
  value: string;
  description: string;
  tooltip?: string;
  highlight: boolean;
  color: string;
  zone: string;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-3"
      aria-label={`${label}: ${value} — ${zone}`}
      style={{
        borderColor: highlight ? `${color}33` : undefined,
        backgroundColor: highlight ? `${color}08` : undefined,
      }}
    >
      <div className="text-xs text-sovereign-muted mb-1" aria-hidden="true">
        {tooltip ? (
          <span
            title={tooltip}
            className="cursor-help underline decoration-dotted decoration-sovereign-muted"
          >
            {label}
          </span>
        ) : (
          label
        )}
      </div>
      <div className="text-xl font-bold" style={{ color }} aria-hidden="true">
        {value}
      </div>
      <div className="text-xs font-medium text-sovereign-muted mt-0.5" aria-hidden="true">
        {zone}
      </div>
      <div className="text-xs text-sovereign-muted mt-1 leading-tight" aria-hidden="true">
        {description}
      </div>
    </div>
  );
}
