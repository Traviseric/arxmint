"use client";

// ============================================================
// ArxMint — Dashboard
// Privacy score + Cycle alerts + Wallet overview
// ============================================================

import { useState } from "react";
import {
  Shield,
  TrendingUp,
  Wallet,
  Cpu,
  Zap,
} from "lucide-react";
import { PrivacyDashboard } from "@/components/privacy-dashboard";
import { CycleAlerts } from "@/components/cycle-alerts";
import { WalletPanel } from "@/components/wallet-panel";
import { useSovereignStore } from "@/lib/store";
import { PRIVACY_PRESETS } from "@/lib/privacy-defaults";
import { formatSats } from "@/lib/utils";

type Tab = "overview" | "privacy" | "cycle" | "wallet";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { balance, currentCommunity } = useSovereignStore();

  // Use community privacy config or default to high
  const privacyConfig = currentCommunity?.privacy || PRIVACY_PRESETS.high;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Zap },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "cycle" as const, label: "Cycle Signals", icon: TrendingUp },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
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

        {activeTab === "wallet" && (
          <div className="max-w-2xl">
            <WalletPanel />
          </div>
        )}

        {activeTab === "overview" && !currentCommunity && (
          <div className="mt-6 rounded-xl border border-btc-orange/20 bg-btc-orange/5 px-6 py-4 text-center">
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

