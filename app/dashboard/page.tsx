"use client";

// ============================================================
// ArxMint — Dashboard
// Privacy score + Cycle alerts + Wallet overview
// ============================================================

import { useState, useEffect } from "react";
import {
  Shield,
  TrendingUp,
  Wallet,
  Cpu,
  Zap,
  Activity,
  Download,
  FileText,
} from "lucide-react";
import { PrivacyDashboard } from "@/components/privacy-dashboard";
import { CycleAlerts } from "@/components/cycle-alerts";
import { WalletPanel } from "@/components/wallet-panel";
import { useSovereignStore } from "@/lib/store";
import type { CommunityConfig } from "@/lib/types";
import { PRIVACY_PRESETS } from "@/lib/privacy-defaults";
import { formatSats } from "@/lib/utils";
import {
  getDemoBCEMetrics,
  TIER_INFO,
  exportMetricsJSON,
  exportMetricsCSV,
  generateReportSchedule,
  generateProgressReport,
  exportReportMarkdown,
  type BCEMetrics,
} from "@/lib/bce-metrics";

type Tab = "overview" | "privacy" | "cycle" | "wallet" | "health" | "grants";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { balance, currentCommunity, communities, setCommunities, setCurrentCommunity } =
    useSovereignStore();

  // Load saved communities from DB on mount
  useEffect(() => {
    fetch("/api/community")
      .then((r) => r.json())
      .then((data: { communities?: Array<{ id: string; name: string; config: unknown }> }) => {
        if (Array.isArray(data.communities) && data.communities.length > 0) {
          const configs = data.communities
            .map((c) => c.config as CommunityConfig)
            .filter(Boolean);
          setCommunities(configs);
          // Auto-select the most recent community if none currently selected
          if (!currentCommunity && configs.length > 0) {
            setCurrentCommunity(configs[0]);
          }
        }
      })
      .catch(() => {
        // DB not available — silently ignore
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use community privacy config or default to high
  const privacyConfig = currentCommunity?.privacy || PRIVACY_PRESETS.high;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Zap },
    { id: "health" as const, label: "Community Health", icon: Activity },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "cycle" as const, label: "Cycle Signals", icon: TrendingUp },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
    { id: "grants" as const, label: "Grant Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sovereign-white">
            Dashboard
          </h1>
          <p className="text-sovereign-muted mt-2">
            {currentCommunity
              ? `${currentCommunity.name} — ${currentCommunity.mintBackend} on ${currentCommunity.network}`
              : "Connect to a community or create one to see live data"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-sovereign-dark rounded-xl mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-sovereign-panel text-btc-orange shadow-sm"
                  : "text-sovereign-muted hover:text-sovereign-text"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="sovereign-card">
              <h3 className="text-lg font-bold text-sovereign-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-btc-orange" />
                Balance
              </h3>
              <div className="space-y-3">
                <BalanceRow
                  label="Fedimint Ecash"
                  value={formatSats(Math.floor(balance.fedimintMsats / 1000))}
                  connected={useSovereignStore.getState().fedimintConnected}
                />
                <BalanceRow
                  label="Cashu Ecash"
                  value={formatSats(balance.cashuSats)}
                  connected={useSovereignStore.getState().cashuConnected}
                />
                <BalanceRow
                  label="Lightning Channels"
                  value={formatSats(balance.lightningSats)}
                  connected={useSovereignStore.getState().lightningConnected}
                />
                <BalanceRow
                  label="On-chain"
                  value={formatSats(balance.onchainSats)}
                  connected={useSovereignStore.getState().lightningConnected}
                />
                <div className="border-t border-sovereign-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-sovereign-white">
                      Total
                    </span>
                    <span className="text-lg font-bold text-btc-orange">
                      {formatSats(balance.totalSats)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Summary */}
            <div className="sovereign-card">
              <h3 className="text-lg font-bold text-sovereign-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-btc-orange" />
                Privacy
              </h3>
              <PrivacyDashboard config={privacyConfig} backend={currentCommunity?.mintBackend || "cashu"} />
            </div>

            {/* Cycle Signals */}
            <div className="sovereign-card md:col-span-2">
              <h3 className="text-lg font-bold text-sovereign-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-btc-orange" />
                Cycle Signals
              </h3>
              <CycleAlerts />
            </div>

            {/* Agent Status */}
            <div className="sovereign-card md:col-span-2">
              <h3 className="text-lg font-bold text-sovereign-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-btc-orange" />
                AI Agent Rails
              </h3>
              {currentCommunity?.agents.enabled ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  <StatusCard
                    label="MCP Server"
                    status={currentCommunity.agents.mcpEnabled ? "configured" : "off"}
                    detail="@lightninglabs/lightning-mcp-server"
                  />
                  <StatusCard
                    label="L402 Proxy"
                    status="ready"
                    detail={`${currentCommunity.agents.l402PriceSats} sats/request`}
                  />
                  <StatusCard
                    label="Macaroon Scope"
                    status="active"
                    detail={currentCommunity.agents.macaroonScope}
                  />
                </div>
              ) : (
                <p className="text-sovereign-muted text-sm">
                  Create a community with agent features to see agent status.{" "}
                  <a href="/create" className="text-btc-orange hover:underline">
                    Create one now
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="max-w-2xl">
            <PrivacyDashboard config={privacyConfig} backend={currentCommunity?.mintBackend || "cashu"} />
          </div>
        )}

        {activeTab === "cycle" && (
          <div className="max-w-3xl">
            <CycleAlerts />
          </div>
        )}

        {activeTab === "health" && (
          <CommunityHealthTab />
        )}

        {activeTab === "wallet" && (
          <div className="max-w-2xl">
            <WalletPanel />
          </div>
        )}

        {activeTab === "grants" && (
          <GrantReportingTab />
        )}

        {activeTab === "overview" && !currentCommunity && (
          <div className="mt-6 space-y-4">
            {communities.length > 0 ? (
              <div className="rounded-xl border border-sovereign-border bg-sovereign-panel p-6">
                <h3 className="text-sm font-bold text-sovereign-white mb-3">
                  Your saved communities
                </h3>
                <div className="space-y-2">
                  {communities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCurrentCommunity(c)}
                      className="w-full flex items-center justify-between rounded-lg border border-sovereign-border bg-sovereign-dark px-4 py-3 text-left hover:border-btc-orange/40 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-sovereign-white">{c.name}</div>
                        <div className="text-xs text-sovereign-muted mt-0.5">
                          {c.mintBackend} · {c.network} · {c.memberCount} members
                        </div>
                      </div>
                      <span className="text-xs text-btc-orange">Select →</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-btc-orange/20 bg-btc-orange/5 px-6 py-4 text-center">
                <p className="text-sm text-sovereign-muted">
                  No community connected yet.{" "}
                  <a href="/create" className="text-btc-orange hover:underline font-medium">
                    Create one
                  </a>{" "}
                  or connect your wallet below to get started.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceRow({
  label,
  value,
  connected,
}: {
  label: string;
  value: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-400" : "bg-sovereign-muted"
          }`}
        />
        <span className="text-sm text-sovereign-muted">{label}</span>
      </div>
      <span className="text-sm text-sovereign-text font-mono">{value}</span>
    </div>
  );
}

function StatusCard({
  label,
  status,
  detail,
}: {
  label: string;
  status: string;
  detail: string;
}) {
  const colors =
    status === "active" || status === "configured" || status === "ready"
      ? "border-green-500/30 bg-green-500/5"
      : "border-sovereign-border bg-sovereign-dark";

  return (
    <div className={`rounded-lg border px-4 py-3 ${colors}`}>
      <div className="text-xs text-sovereign-muted">{label}</div>
      <div className="text-sm font-medium text-sovereign-white mt-1">
        {status}
      </div>
      <div className="text-xs text-sovereign-muted mt-1 font-mono truncate">
        {detail}
      </div>
    </div>
  );
}

// ---- Community Health Tab (BCE Metrics) ----

function CommunityHealthTab() {
  const metrics = getDemoBCEMetrics();
  const tier = TIER_INFO[metrics.maturityTier];

  const handleExport = (format: "json" | "csv") => {
    const content = format === "json"
      ? exportMetricsJSON(metrics)
      : exportMetricsCSV(metrics);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arxmint-bce-metrics.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Maturity Tier + Health Score */}
      <div className="sovereign-card !border-btc-orange/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-btc-orange" />
              Community Health
            </h3>
            <p className="text-sm text-sovereign-muted mt-1">
              BCE maturity metrics — track community growth for grants and operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport("json")}
              className="sovereign-btn-outline !px-3 !py-1.5 text-xs"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="sovereign-btn-outline !px-3 !py-1.5 text-xs"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg border border-sovereign-border bg-sovereign-dark px-4 py-3">
            <div className="text-xs text-sovereign-muted">Maturity Tier</div>
            <div className={`text-xl font-bold mt-1 ${tier.color}`}>
              {tier.label}
            </div>
            <div className="text-xs text-sovereign-muted mt-1">
              {tier.description}
            </div>
          </div>
          <div className="rounded-lg border border-sovereign-border bg-sovereign-dark px-4 py-3">
            <div className="text-xs text-sovereign-muted">Health Score</div>
            <div className="flex items-end gap-2 mt-1">
              <span className={`text-3xl font-bold ${
                metrics.healthScore >= 75 ? "text-green-400" :
                metrics.healthScore >= 50 ? "text-yellow-400" :
                "text-red-400"
              }`}>
                {metrics.healthScore}
              </span>
              <span className="text-sovereign-muted text-sm mb-1">/ 100</span>
            </div>
            <div className="w-full bg-sovereign-panel rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  metrics.healthScore >= 75 ? "bg-green-400" :
                  metrics.healthScore >= 50 ? "bg-yellow-400" :
                  "bg-red-400"
                }`}
                style={{ width: `${metrics.healthScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Core KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard
          label="Merchants"
          value={metrics.merchantCount.toString()}
          detail={`${metrics.merchantsActive} active (30d)`}
          trend={metrics.merchantsActive / Math.max(metrics.merchantCount, 1)}
        />
        <MetricCard
          label="Monthly Active Users"
          value={metrics.mau.toString()}
          detail="Unique spenders (30d)"
        />
        <MetricCard
          label="Spend Velocity"
          value={`${metrics.spendVelocity}`}
          detail="tx/user/month"
        />
      </div>

      {/* Reliability */}
      <div className="grid sm:grid-cols-2 gap-4">
        <MetricCard
          label="Payment Success Rate"
          value={`${(metrics.paymentSuccessRate * 100).toFixed(1)}%`}
          detail="Last 30 days"
          trend={metrics.paymentSuccessRate}
        />
        <MetricCard
          label="Uptime"
          value={`${(metrics.uptime * 100).toFixed(1)}%`}
          detail="Federation/mint (30d)"
          trend={metrics.uptime}
        />
      </div>

      {/* Liquidity */}
      <div className="sovereign-card">
        <h4 className="text-sm font-bold text-sovereign-white mb-4">Liquidity</h4>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-sovereign-muted">Ecash Circulation</div>
            <div className="text-sm font-bold text-sovereign-white mt-1">
              {formatSats(metrics.ecashCirculation)}
            </div>
          </div>
          <div>
            <div className="text-xs text-sovereign-muted">Inbound Liquidity</div>
            <div className="text-sm font-bold text-sovereign-white mt-1">
              {formatSats(metrics.inboundLiquidity)}
            </div>
          </div>
          <div>
            <div className="text-xs text-sovereign-muted">Coverage Ratio</div>
            <div className={`text-sm font-bold mt-1 ${
              metrics.liquidityCoverage >= 7 ? "text-green-400" :
              metrics.liquidityCoverage >= 3 ? "text-yellow-400" :
              "text-red-400"
            }`}>
              {metrics.liquidityCoverage}x daily spend
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number;
}) {
  return (
    <div className="sovereign-card">
      <div className="text-xs text-sovereign-muted">{label}</div>
      <div className="text-2xl font-bold text-sovereign-white mt-1">{value}</div>
      <div className="text-xs text-sovereign-muted mt-1">{detail}</div>
      {trend !== undefined && (
        <div className="w-full bg-sovereign-dark rounded-full h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full ${
              trend >= 0.9 ? "bg-green-400" :
              trend >= 0.7 ? "bg-blue-400" :
              trend >= 0.5 ? "bg-yellow-400" :
              "bg-red-400"
            }`}
            style={{ width: `${Math.min(trend * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ---- Grant Reporting Tab ----

function GrantReportingTab() {
  const metrics = getDemoBCEMetrics();
  const schedule = generateReportSchedule(6, new Date().toISOString().split("T")[0]);

  const demoReport = generateProgressReport(
    metrics,
    1,
    "Month 1",
    {
      merchantsTarget: 30,
      mauTarget: 300,
      successRateTarget: 0.98,
      uptimeTarget: 0.995,
      spendVelocityTarget: 2,
    },
    [
      { id: 1, title: "Infrastructure Deployment", status: "in-progress" as const, percentComplete: 75, notes: "Docker stack deployed, channels being funded" },
      { id: 2, title: "Merchant Onboarding", status: "in-progress" as const, percentComplete: 30, notes: "5 founding merchants recruited" },
      { id: 3, title: "Growth & Circular Spend", status: "not-started" as const, percentComplete: 0, notes: "" },
      { id: 4, title: "Evaluation & Replication", status: "not-started" as const, percentComplete: 0, notes: "" },
    ],
    [
      "Docker stack deployed to production server",
      "5 founding merchants recruited and onboarded",
      "Monitoring dashboards configured (Prometheus + Grafana)",
    ],
    ["Lightning channel liquidity still below target"],
    [
      "Fund remaining Lightning channels to 1M+ sats",
      "Onboard 10 more merchants",
      "Host first community demo event",
    ],
    2500,
    15000
  );

  const handleExportReport = () => {
    const md = exportReportMarkdown(demoReport);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arxmint-grant-report-${demoReport.period.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="sovereign-card !border-btc-orange/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-btc-orange" />
              Grant Reporting
            </h3>
            <p className="text-sm text-sovereign-muted mt-1">
              Progress reports matching OpenSats cadence — monthly (months 1-3), then quarterly
            </p>
          </div>
          <button
            onClick={handleExportReport}
            className="sovereign-btn-outline !px-3 !py-1.5 text-xs"
          >
            <Download className="w-3 h-3" /> Export Report
          </button>
        </div>
      </div>

      {/* Reporting Schedule */}
      <div className="sovereign-card">
        <h4 className="text-sm font-bold text-sovereign-white mb-4">Reporting Schedule</h4>
        <div className="space-y-2">
          {schedule.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                i === 0
                  ? "border-btc-orange/30 bg-btc-orange/5"
                  : "border-sovereign-border bg-sovereign-dark"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.cadence === "monthly"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-purple-500/20 text-purple-400"
                }`}>
                  {s.cadence}
                </span>
                <span className="text-sm text-sovereign-white">{s.label}</span>
              </div>
              <span className="text-xs text-sovereign-muted font-mono">Due: {s.dueDate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Report Preview */}
      <div className="sovereign-card">
        <h4 className="text-sm font-bold text-sovereign-white mb-4">
          Current Report: {demoReport.period}
        </h4>

        {/* KPI Progress */}
        <div className="space-y-3 mb-6">
          {demoReport.kpiProgress.map((kpi, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-sovereign-muted">{kpi.kpi}</span>
                <span className={kpi.onTrack ? "text-green-400" : "text-yellow-400"}>
                  {kpi.current}{kpi.unit === "%" ? "%" : ""} / {kpi.target}{kpi.unit === "%" ? "%" : ` ${kpi.unit}`}
                  {kpi.onTrack ? " — on track" : " — behind"}
                </span>
              </div>
              <div className="w-full bg-sovereign-dark rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    kpi.percentComplete >= 100 ? "bg-green-400" :
                    kpi.onTrack ? "bg-blue-400" :
                    "bg-yellow-400"
                  }`}
                  style={{ width: `${Math.min(kpi.percentComplete, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <h5 className="text-xs font-bold text-sovereign-white mb-2">Milestones</h5>
        <div className="space-y-2 mb-6">
          {demoReport.milestoneProgress.map((m) => (
            <div key={m.milestoneId} className="flex items-center gap-3 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                m.status === "completed" ? "bg-green-400" :
                m.status === "in-progress" ? "bg-blue-400" :
                m.status === "delayed" ? "bg-red-400" :
                "bg-sovereign-muted"
              }`} />
              <span className="text-sovereign-white flex-1">{m.title}</span>
              <span className="text-sovereign-muted">{m.percentComplete}%</span>
            </div>
          ))}
        </div>

        {/* Budget */}
        <div className="flex items-center justify-between text-xs border-t border-sovereign-border pt-3">
          <span className="text-sovereign-muted">Budget spent</span>
          <span className="text-sovereign-white font-mono">
            ${demoReport.budgetSpentUSD.toLocaleString()} / ${demoReport.totalBudgetUSD.toLocaleString()}
            {" "}({Math.round((demoReport.budgetSpentUSD / demoReport.totalBudgetUSD) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

