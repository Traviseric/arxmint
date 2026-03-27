"use client";

// ============================================================
// ArxMint — Merchant Dashboard MVP
// /merchant-dashboard — self-service dashboard for merchants
// Auth-gated via Nostr NIP-07 session (Zustand store)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Copy,
  Check,
  ExternalLink,
  FileDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Key,
  User,
  BarChart2,
  Link2,
  LogOut,
} from "lucide-react";
import { useSovereignStore } from "@/lib/store";
import { connectNostr } from "@/lib/nostr-auth";
import type { TransactionRow } from "@/app/api/merchant-dashboard/transactions/route";

// ---- Types ----

interface Stats {
  todayTotal: number;
  todayCount: number;
  recentPayment: { amount: number; memo: string | null; time: number } | null;
  lnbitsAvailable: boolean;
}

interface TransactionsResponse {
  transactions: TransactionRow[];
  total: number;
  page: number;
  pages: number;
  btcPriceUsd: number;
  lnbitsAvailable: boolean;
}

// ---- Seed merchant data fallback ----

const SEED_MERCHANTS: Record<string, { businessName: string; id: string; website: string | null }> = {
  "seed-black-bear": {
    id: "seed-black-bear",
    businessName: "Black Bear Window Cleaning",
    website: "https://blackbearwindowcleaning.com",
  },
  "seed-glacier": {
    id: "seed-glacier",
    businessName: "The Ice Cream Parlor by Glacier",
    website: "https://www.glacierparlor.com",
  },
  "seed-teneo": {
    id: "seed-teneo",
    businessName: "Teneo",
    website: "https://teneo.io",
  },
};

// ---- Utility helpers ----

function formatSats(sats: number): string {
  return sats.toLocaleString() + " sats";
}

function satsToUsd(sats: number, btcPrice: number): string {
  if (!btcPrice) return "—";
  const usd = (sats / 100_000_000) * btcPrice;
  return "$" + usd.toFixed(2);
}

function formatTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortHash(hash: string): string {
  return hash.slice(0, 8) + "..." + hash.slice(-8);
}

// ---- Sub-components ----

function StatusBadge({ status }: { status: "paid" | "pending" | "expired" }) {
  const styles = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    expired: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

// ---- Tab: Transactions ----

function TransactionsTab({ merchantId: _merchantId }: { merchantId: string | null }) {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async (p: number, f: string, t: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "10" });
      if (f) params.set("from", f);
      if (t) params.set("to", t);
      const res = await fetch(`/api/merchant-dashboard/transactions?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, "", "");
  }, [load]);

  const handleFilter = () => {
    setPage(1);
    load(1, from, to);
  };

  const handlePage = (next: number) => {
    setPage(next);
    load(next, from, to);
  };

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Filter
        </button>
        {(from || to) && (
          <button
            onClick={() => { setFrom(""); setTo(""); setPage(1); load(1, "", ""); }}
            className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-sm rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading transactions…
        </div>
      ) : !data?.lnbitsAvailable ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          Payment backend not connected. Set <code className="bg-gray-100 px-1 rounded">LNBITS_URL</code> and <code className="bg-gray-100 px-1 rounded">LNBITS_INVOICE_KEY</code> in your environment.
        </div>
      ) : data.transactions.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          No payments found{from || to ? " for selected date range" : " yet"}.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Amount</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">USD</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Memo</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Hash</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{formatTime(tx.time)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      <span className="text-orange-600">⚡</span> {formatSats(tx.amountSats)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                      {satsToUsd(tx.amountSats, data.btcPriceUsd)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                      {tx.memo || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden lg:table-cell">
                      {shortHash(tx.id)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`/api/invoice/${tx.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download PDF invoice"
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        <FileDown size={15} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{data.total} total payments</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Page {page} of {data.pages}</span>
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= data.pages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Tab: Payment Link ----

function PaymentLinkTab({ merchantId }: { merchantId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://arxmint.com";
  const payUrl = `${origin}/pay/${merchantId}`;

  const widgetSnippet = `<script src="${origin}/widget.js" data-merchant="${merchantId}" async></script>`;

  return (
    <div className="space-y-6">
      {/* Payment link */}
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Your Payment Link</h3>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-700 font-mono text-sm break-all flex items-center gap-1.5"
          >
            {payUrl}
            <ExternalLink size={14} className="flex-shrink-0" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={payUrl} label="Copy Link" />
        </div>
        <p className="text-xs text-gray-500">
          Share this link with customers. They can pay with any Lightning wallet.
        </p>
      </div>

      {/* Embed snippet */}
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Embeddable Widget</h3>
        <p className="text-sm text-gray-600">
          Add a one-click checkout button to any website with a single script tag.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto">
          {widgetSnippet}
        </div>
        <CopyButton text={widgetSnippet} label="Copy Snippet" />
      </div>

      {/* POS link */}
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Point of Sale</h3>
        <p className="text-sm text-gray-600">
          Open the POS view on any tablet or phone at your counter.
        </p>
        <a
          href={`/pos/${merchantId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Open POS <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

// ---- Tab: API Key ----

function ApiKeyTab() {
  // revealed/invoiceKey reserved for per-merchant key UI (Phase 4.7 M3)

  // We don't expose the raw key client-side from env — show a masked placeholder
  // with explanation. Real key management will come with per-merchant wallets.
  const maskedKey = "••••••••••••••••••••••••••••••••";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Invoice / Read Key</h3>
        <p className="text-sm text-gray-600">
          Use this key to integrate the ArxMint checkout with your own website or POS system.
          This key can create invoices and check payment status — it cannot withdraw funds.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-700 overflow-hidden">
            {maskedKey}
          </code>
        </div>
        <p className="text-xs text-gray-500">
          Full per-merchant API keys will be available once your wallet is provisioned.
          Contact <a href="mailto:travis@arxmint.com" className="text-orange-600 hover:underline">travis@arxmint.com</a> to get your key.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">API Documentation</h3>
        <p className="text-sm text-gray-600">
          Use our REST API to create invoices, check payment status, and integrate Lightning payments into your workflow.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-2">
          <div className="text-gray-500"># Create invoice</div>
          <div className="text-gray-800">POST /api/checkout</div>
          <div className="text-gray-500 mt-3"># Check payment status</div>
          <div className="text-gray-800">GET /api/checkout/status/[id]</div>
        </div>
      </div>
    </div>
  );
}

// ---- Tab: Account ----

function AccountTab({ merchantId }: { merchantId: string }) {
  const merchant = SEED_MERCHANTS[merchantId] ?? { businessName: "Your Business", website: null, id: merchantId };
  const nostrUser = useSovereignStore((s) => s.nostrUser);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Business Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Business Name</label>
            <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
              {merchant.businessName}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Merchant ID</label>
            <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 font-mono">
              {merchantId}
            </div>
          </div>
          {merchant.website && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Website</label>
              <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline flex items-center gap-1">
                  {merchant.website} <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          To update your business info, contact <a href="mailto:travis@arxmint.com" className="text-orange-600 hover:underline">travis@arxmint.com</a> or edit your listing at <a href="/merchants" className="text-orange-600 hover:underline">arxmint.com/merchants</a>.
        </p>
      </div>

      {nostrUser && (
        <div className="rounded-xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Nostr Identity</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <div className="text-sm text-gray-700">{nostrUser.displayName}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Public Key (npub)</label>
            <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 rounded-lg px-3 py-2">
              {nostrUser.npub}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

type Tab = "transactions" | "paymentLink" | "apiKey" | "account";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "transactions", label: "Transactions", icon: <BarChart2 size={16} /> },
  { id: "paymentLink", label: "Payment Link", icon: <Link2 size={16} /> },
  { id: "apiKey", label: "API Key", icon: <Key size={16} /> },
  { id: "account", label: "Account", icon: <User size={16} /> },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { nostrUser, setNostrUser, setAuthenticated, clearNostrUser } = useSovereignStore();
  const [tab, setTab] = useState<Tab>("transactions");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Derive merchantId from nostrUser — for now map pubkey → seed merchant (demo mode)
  // In production this would look up the merchant by pubkey from Supabase
  const merchantId = "seed-black-bear";

  // Hydrate nostr session from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("arxmint:nostr-user");
      if (stored && !nostrUser) {
        const user = JSON.parse(stored);
        setNostrUser(user);
        setAuthenticated(true);
      }
    } catch {
      // ignore
    }
  }, [nostrUser, setNostrUser, setAuthenticated]);

  // Load today's stats
  useEffect(() => {
    if (!nostrUser) return;
    setStatsLoading(true);
    fetch("/api/merchant-dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [nostrUser]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setAuthError(null);
    try {
      const user = await connectNostr();
      setNostrUser(user);
      setAuthenticated(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to connect Nostr");
    } finally {
      setConnecting(false);
    }
  }, [setNostrUser, setAuthenticated]);

  const handleLogout = useCallback(() => {
    clearNostrUser();
    router.push("/");
  }, [clearNostrUser, router]);

  // ---- Auth Gate ----
  if (!nostrUser) {
    return (
      <div
        data-theme="merchant"
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "#fafafa", color: "#171717" }}
      >
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center">
              <Zap size={28} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-500 mt-2">Sign in with your Nostr identity to access your dashboard.</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {connecting ? (
              <><RefreshCw size={18} className="animate-spin" /> Connecting…</>
            ) : (
              <><Zap size={18} /> Connect with Nostr</>
            )}
          </button>

          <p className="text-xs text-gray-400">
            Requires a NIP-07 browser extension such as{" "}
            <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Alby</a>
            {" "}or{" "}
            <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">nos2x</a>.
          </p>

          <div className="pt-4 border-t border-gray-200">
            <a href="/merchants" className="text-sm text-orange-600 hover:underline">
              ← Back to merchant directory
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div
      data-theme="merchant"
      className="min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">Merchant Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{nostrUser.displayName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Today&apos;s Revenue</div>
            {statsLoading ? (
              <div className="h-7 bg-gray-100 rounded animate-pulse w-24" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                <span className="text-orange-500">⚡</span>{" "}
                {stats ? formatSats(stats.todayTotal) : "—"}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Payments Today</div>
            {statsLoading ? (
              <div className="h-7 bg-gray-100 rounded animate-pulse w-12" />
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {stats ? stats.todayCount : "—"}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-xs text-gray-500 mb-1">Most Recent</div>
            {statsLoading ? (
              <div className="h-7 bg-gray-100 rounded animate-pulse w-32" />
            ) : stats?.recentPayment ? (
              <div>
                <div className="text-lg font-bold text-gray-900">
                  <span className="text-orange-500">⚡</span> {formatSats(stats.recentPayment.amount)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatTime(stats.recentPayment.time)}</div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No payments yet</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5 sm:p-6">
            {tab === "transactions" && <TransactionsTab merchantId={merchantId} />}
            {tab === "paymentLink" && <PaymentLinkTab merchantId={merchantId} />}
            {tab === "apiKey" && <ApiKeyTab />}
            {tab === "account" && <AccountTab merchantId={merchantId} />}
          </div>
        </div>
      </main>
    </div>
  );
}
