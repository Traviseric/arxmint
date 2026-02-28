"use client";

// ============================================================
// ArxMint — Community View
// Members, agent marketplace, circular economy directory
// ============================================================

import { useState, useEffect } from "react";
import {
  Users,
  Cpu,
  ShoppingBag,
  MessageSquare,
  Zap,
  Shield,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSovereignStore } from "@/lib/store";
import { l402Fetch, getLightningClient } from "@/lib/lightning-agent";
import type { AgentService } from "@/lib/types";
import {
  MerchantOnboard,
  MerchantCard,
  type MerchantListing,
} from "@/components/merchant-onboard";

// Demo agent services (will be real when agents are live)
const DEMO_AGENTS: AgentService[] = [
  {
    id: "agent-1",
    name: "Privacy Audit Agent",
    description:
      "Analyzes your on-chain transaction history and recommends privacy improvements. Uses CoinJoin and Silent Payment analysis.",
    priceSats: 200,
    endpoint: "/api/agent?service=privacy-audit",
    agentId: "sf-privacy-agent",
    category: "privacy",
  },
  {
    id: "agent-2",
    name: "Cycle Signal Agent",
    description:
      "Real-time MVRV, NUPL, and supply analysis with actionable buy/sell/hold signals. Updated every 5 minutes.",
    priceSats: 50,
    endpoint: "/api/agent?service=cycle-signals",
    agentId: "sf-cycle-agent",
    category: "analytics",
  },
  {
    id: "agent-3",
    name: "Data Marketplace Agent",
    description:
      "Buy and sell structured data feeds inside the community. Agents list datasets, humans consume via L402.",
    priceSats: 100,
    endpoint: "/api/agent?service=data",
    agentId: "sf-data-agent",
    category: "data",
  },
  {
    id: "agent-4",
    name: "Compute Agent",
    description:
      "Run compute tasks (analysis, ML inference, data processing) and pay per job in sats. No accounts needed.",
    priceSats: 500,
    endpoint: "/api/agent?service=compute",
    agentId: "sf-compute-agent",
    category: "compute",
  },
];

type Tab = "members" | "agents" | "merchants" | "chat";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("agents");
  const [copied, setCopied] = useState(false);
  const { currentCommunity } = useSovereignStore();
  const params = useParams();
  const communityId = typeof params?.id === "string" ? params.id : (currentCommunity?.id ?? "demo");

  const community = currentCommunity || {
    id: "demo",
    name: "ArxMint Demo",
    description: "Demo community — create your own at /create",
    memberCount: 20,
    mintBackend: "cashu" as const,
    network: "testnet" as const,
    features: [
      "chat" as const,
      "agent-marketplace" as const,
      "privacy-dashboard" as const,
      "cycle-alerts" as const,
    ],
    agents: { enabled: true, l402PriceSats: 100, macaroonScope: "pay-only" as const, mcpEnabled: true },
    privacy: { silentPayments: true, coinJoin: true, payJoin: true, arkSpends: false },
    guardianCount: 1,
    mintFeePercent: 0.2,
  };

  const tabs = [
    { id: "agents" as const, label: "Agent Marketplace", icon: Cpu },
    { id: "merchants" as const, label: "Merchants", icon: ShoppingBag },
    { id: "members" as const, label: "Members", icon: Users },
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
  ];

  const copyInvite = async () => {
    await navigator.clipboard.writeText(
      `arxmint://join/${community.id}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Community Header */}
        <div className="sovereign-card !border-btc-orange/20 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sovereign-white">
                {community.name}
              </h1>
              <p className="text-sm text-sovereign-muted mt-1">
                {community.mintBackend.toUpperCase()} &middot;{" "}
                {community.network.toUpperCase()} &middot;{" "}
                {community.memberCount} members
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={copyInvite} className="sovereign-btn-outline !px-4 !py-2 text-sm">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Invite Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {community.features.map((f) => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full bg-btc-orange/10 text-btc-orange text-xs"
              >
                {f}
              </span>
            ))}
          </div>
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

        {/* Agent Marketplace */}
        {activeTab === "agents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-sovereign-muted">
                AI agents selling services for sats — pay via L402, no accounts
                needed
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {DEMO_AGENTS.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}

        {/* Merchants */}
        {activeTab === "merchants" && (
          <MerchantDirectory communityId={communityId} />
        )}

        {/* Members */}
        {activeTab === "members" && (
          <div className="sovereign-card text-center py-12">
            <Users className="w-12 h-12 text-sovereign-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-sovereign-white mb-2">
              Community Members
            </h3>
            <p className="text-sovereign-muted text-sm max-w-md mx-auto">
              {community.memberCount} members in this community. Members join
              via federation invite code — no KYC, no accounts.
            </p>
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div className="sovereign-card text-center py-12">
            <MessageSquare className="w-12 h-12 text-sovereign-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-sovereign-white mb-2">
              Sovereign Chat
            </h3>
            <p className="text-sovereign-muted text-sm max-w-md mx-auto">
              End-to-end encrypted community chat. Messages stay inside the
              federation — no corporate servers, no surveillance.
            </p>
            <p className="text-xs text-sovereign-muted mt-4">
              Coming soon — Fedi-style chat integration
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Agent Card with L402 Payment Flow ----

// ---- Merchant Directory with Onboarding ----

function MerchantDirectory({ communityId }: { communityId: string }) {
  const [showOnboard, setShowOnboard] = useState(false);
  const [merchants, setMerchants] = useState<MerchantListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Load merchants from DB on mount
  useEffect(() => {
    fetch(`/api/merchants?communityId=${encodeURIComponent(communityId)}`)
      .then((r) => r.json())
      .then((data: { merchants?: Array<Record<string, unknown>> }) => {
        if (Array.isArray(data.merchants)) {
          const mapped: MerchantListing[] = data.merchants.map((m) => {
            const meta = (m.metadata as Record<string, unknown>) ?? {};
            return {
              id: m.id as string,
              name: m.name as string,
              category: (m.category as MerchantListing["category"]) ?? "other",
              description: (m.description as string) ?? "",
              location: (meta.location as string) ?? "",
              paymentMethods: (meta.paymentMethods as MerchantListing["paymentMethods"]) ?? [],
              contactInfo: (meta.contactInfo as string | undefined) ?? undefined,
              createdAt: new Date(m.createdAt as string).getTime(),
              active: true,
            };
          });
          setMerchants(mapped);
        }
      })
      .catch(() => {
        // DB unavailable — show empty state
      })
      .finally(() => setLoading(false));
  }, [communityId]);

  const handleComplete = (merchant: MerchantListing) => {
    setMerchants((prev) => [merchant, ...prev]);
  };

  if (showOnboard) {
    return (
      <MerchantOnboard
        onComplete={(m) => { handleComplete(m); setShowOnboard(false); }}
        onCancel={() => setShowOnboard(false)}
        communityId={communityId}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-sovereign-muted">
          {merchants.length} business{merchants.length !== 1 ? "es" : ""} accepting sats in this community
        </p>
        <button
          onClick={() => setShowOnboard(true)}
          className="sovereign-btn !px-4 !py-2 text-sm"
        >
          <ShoppingBag className="w-4 h-4" />
          + List Your Business
        </button>
      </div>
      {loading ? (
        <div className="sovereign-card text-center py-12">
          <div className="w-6 h-6 border-2 border-btc-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-sovereign-muted">Loading merchant directory…</p>
        </div>
      ) : merchants.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {merchants.map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
      ) : (
        <div className="sovereign-card text-center py-12">
          <ShoppingBag className="w-12 h-12 text-sovereign-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-sovereign-white mb-2">
            No merchants yet
          </h3>
          <p className="text-sovereign-muted text-sm max-w-md mx-auto">
            Be the first to list your business in the circular economy.
          </p>
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentService }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { lightningConnected } = useSovereignStore();

  const handlePayAndUse = async () => {
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      if (lightningConnected) {
        // Full L402 flow: request → 402 → pay invoice → retry with token
        const lnClient = getLightningClient();
        const response = await l402Fetch(
          `${window.location.origin}${agent.endpoint}`,
          lnClient,
          {},
          agent.priceSats * 2 // safety margin
        );
        const data = await response.json();
        setResult(data);
        setStatus("success");
      } else {
        // Demo mode: call the endpoint directly (will get 402 response)
        const response = await fetch(`${window.location.origin}${agent.endpoint}`);
        const data = await response.json();
        if (response.status === 402) {
          setResult({
            demo: true,
            ...data,
            note: "Connect Lightning node to pay and access premium data",
          });
        } else {
          setResult(data);
        }
        setStatus("success");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
      setStatus("error");
    }
  };

  return (
    <div className="sovereign-card group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-sovereign-white group-hover:text-btc-orange transition-colors">
            {agent.name}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sovereign-dark text-sovereign-muted mt-1 inline-block">
            {agent.category}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-btc-orange">
            {agent.priceSats}
          </div>
          <div className="text-xs text-sovereign-muted">sats/request</div>
        </div>
      </div>
      <p className="text-sm text-sovereign-muted mb-4 leading-relaxed">
        {agent.description}
      </p>
      <div className="flex items-center justify-between mb-2">
        <code className="text-xs text-sovereign-muted font-mono">
          {agent.endpoint}
        </code>
        <button
          onClick={handlePayAndUse}
          disabled={status === "loading"}
          className="sovereign-btn !px-4 !py-2 text-xs"
        >
          {status === "loading" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          {lightningConnected ? "Pay & Use" : "Try (Demo)"}
        </button>
      </div>

      {/* Result */}
      {status === "success" && result && (
        <div className="mt-3 bg-sovereign-dark rounded-lg p-3 text-xs">
          {result.demo && (
            <div className="text-btc-orange mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Demo mode — connect Lightning to pay {agent.priceSats} sats for real data
            </div>
          )}
          <pre className="text-sovereign-text font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 bg-red-500/10 rounded-lg px-3 py-2 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
