"use client";

// ============================================================
// ArxMint — Merchant Dashboard Home
// /merchant-dashboard?merchant=[id] — self-service dashboard
// Temporary query-param auth until Nostr/email auth is wired.
// ============================================================

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Copy,
  Check,
  ExternalLink,
  FileDown,
  Mail,
  Send,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wallet,
  ArrowUpRight,
  QrCode,
  TrendingUp,
  Clock,
  Hash,
  DollarSign,
  Monitor,
} from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
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

const SEED_MERCHANTS: Record<
  string,
  { businessName: string; id: string; website: string | null }
> = {
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
  if (!btcPrice) return "--";
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
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
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

// ---- Send Invoice Modal ----

function SendInvoiceModal({
  sessionId,
  amountSats,
  onClose,
}: {
  sessionId: string;
  amountSats: number;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoice/${sessionId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(d.error ?? "Failed to send email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }, [sessionId, email]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Send Invoice by Email</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="font-medium text-gray-900">Invoice sent!</p>
            <p className="text-sm text-gray-500">
              Payment request delivered to {email}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Send a payment request for{" "}
              <span className="font-medium text-orange-600">
                {amountSats.toLocaleString()} sats
              </span>{" "}
              to your customer.
            </p>
            <label className="block text-xs text-gray-500 mb-1">
              Customer email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="customer@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3"
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <button
              onClick={send}
              disabled={sending || !email}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Mail size={14} /> Send Invoice
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Payment Link Card ----

function PaymentLinkCard({ merchantId }: { merchantId: string }) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://arxmint.com";
  const payUrl = `${origin}/pay/${merchantId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payUrl)}`;

  return (
    <ScrollReveal delay={0.1}>
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <QrCode size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Payment Link</h2>
            <p className="text-xs text-gray-500">
              Share with customers or display at your counter
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          {/* QR Code */}
          <div className="flex-shrink-0 flex justify-center">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Payment QR code"
                width={180}
                height={180}
                className="rounded"
              />
            </div>
          </div>

          {/* Link and actions */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Your payment URL
              </label>
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-mono text-sm break-all flex items-center gap-1"
              >
                {payUrl}
                <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={payUrl} label="Copy Link" />
              <Link
                href={`/pos/${merchantId}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                <Monitor size={14} />
                Open POS
              </Link>
            </div>

            <p className="text-xs text-gray-500">
              Customers can pay with any Lightning wallet by scanning the QR code
              or visiting the link.
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ---- Today's Activity Card ----

function TodayActivityCard({
  stats,
  loading,
  btcPriceUsd,
}: {
  stats: Stats | null;
  loading: boolean;
  btcPriceUsd: number;
}) {
  return (
    <ScrollReveal delay={0.2}>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Today&apos;s Activity</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total received */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Zap size={12} />
              Total Received
            </div>
            {loading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-gray-900">
                  {stats ? formatSats(stats.todayTotal) : "0 sats"}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {stats
                    ? satsToUsd(stats.todayTotal, btcPriceUsd)
                    : "$0.00"}
                </div>
              </>
            )}
          </div>

          {/* Payment count */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Hash size={12} />
              Payments
            </div>
            {loading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-12" />
            ) : (
              <div className="text-xl font-bold text-gray-900">
                {stats ? stats.todayCount : 0}
              </div>
            )}
          </div>

          {/* Most recent */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Clock size={12} />
              Most Recent
            </div>
            {loading ? (
              <div className="h-7 bg-gray-200 rounded animate-pulse w-32" />
            ) : stats?.recentPayment ? (
              <>
                <div className="text-xl font-bold text-gray-900">
                  {formatSats(stats.recentPayment.amount)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatTime(stats.recentPayment.time)}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400">No payments yet</div>
            )}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ---- Balance Card ----

function BalanceCard({
  stats,
  loading,
  btcPriceUsd,
}: {
  stats: Stats | null;
  loading: boolean;
  btcPriceUsd: number;
}) {
  // For now, display balance as today's total (LNbits wallet balance API
  // will be wired once per-merchant wallets are provisioned).
  const balanceSats = stats?.todayTotal ?? 0;

  return (
    <ScrollReveal delay={0.3}>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Wallet size={20} className="text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Balance</h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-gray-900">
              {formatSats(balanceSats)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {satsToUsd(balanceSats, btcPriceUsd)}
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ArrowUpRight size={12} />
            <span>
              {stats?.lnbitsAvailable
                ? "Auto-forward to payout address is active"
                : "Payout address not configured yet"}
            </span>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

// ---- Transaction List ----

function TransactionList({
  merchantId: _merchantId,
  btcPriceUsd,
}: {
  merchantId: string;
  btcPriceUsd: number;
}) {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [emailModal, setEmailModal] = useState<{
    sessionId: string;
    amountSats: number;
  } | null>(null);

  const load = useCallback(
    async (p: number, f: string, t: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "10" });
        if (f) params.set("from", f);
        if (t) params.set("to", t);
        const res = await fetch(
          `/api/merchant-dashboard/transactions?${params}`
        );
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    },
    []
  );

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

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("format", "csv");
    window.open(
      `/api/merchant-dashboard/export?${params.toString()}`,
      "_blank"
    );
  };

  return (
    <ScrollReveal delay={0.4}>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Transactions</h2>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
          >
            <FileDown size={14} />
            Export CSV
          </button>
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap gap-3 items-end mb-4">
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
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
                load(1, "", "");
              }}
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
            Loading transactions...
          </div>
        ) : !data?.lnbitsAvailable ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Payment backend not connected. Set{" "}
            <code className="bg-gray-100 px-1 rounded">LNBITS_URL</code> and{" "}
            <code className="bg-gray-100 px-1 rounded">LNBITS_INVOICE_KEY</code>{" "}
            in your environment.
          </div>
        ) : data.transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No payments found
            {from || to ? " for selected date range" : " yet"}.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">
                      Amount
                    </th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">
                      USD
                    </th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">
                      Memo
                    </th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">
                      Hash
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700">
                        {formatTime(tx.time)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        <span className="text-orange-600">
                          <Zap size={12} className="inline" />
                        </span>{" "}
                        {formatSats(tx.amountSats)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                        {satsToUsd(tx.amountSats, btcPriceUsd)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                        {tx.memo || "--"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden lg:table-cell">
                        {shortHash(tx.id)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`/api/invoice/${tx.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF invoice"
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"
                          >
                            <FileDown size={15} />
                          </a>
                          <button
                            onClick={() =>
                              setEmailModal({
                                sessionId: tx.id,
                                amountSats: tx.amountSats,
                              })
                            }
                            title="Email invoice to customer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"
                          >
                            <Mail size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
                <span>{data.total} total payments</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {page} of {data.pages}
                  </span>
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

      {/* Send invoice email modal */}
      {emailModal && (
        <SendInvoiceModal
          sessionId={emailModal.sessionId}
          amountSats={emailModal.amountSats}
          onClose={() => setEmailModal(null)}
        />
      )}
    </ScrollReveal>
  );
}

// ---- Main Page ----

function MerchantDashboardContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchant") || "seed-black-bear";

  const merchant = SEED_MERCHANTS[merchantId] ?? {
    businessName: merchantId,
    id: merchantId,
    website: null,
  };

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [btcPriceUsd, setBtcPriceUsd] = useState(0);

  // Apply merchant light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  // Load stats
  useEffect(() => {
    setStatsLoading(true);
    fetch("/api/merchant-dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Load BTC price for USD conversion
  useEffect(() => {
    fetch("/api/merchant-dashboard/transactions?page=1&limit=1")
      .then((r) => r.json())
      .then((d: { btcPriceUsd?: number }) => {
        if (d.btcPriceUsd) setBtcPriceUsd(d.btcPriceUsd);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      data-theme="merchant"
      className="relative overflow-x-hidden min-h-screen"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      {/* Full-bleed light background */}
      <div className="fixed inset-0 z-0" style={{ background: "#fafafa" }} />

      {/* Background ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full bg-[#F7931A]/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[#F7931A]/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 text-sm sm:text-base">
                  {merchant.businessName}
                </span>
                <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
                  Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/merchant-dashboard/settings?merchant=${merchantId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                <Settings size={15} />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <Link
                href="/merchants"
                className="text-sm text-orange-600 hover:text-orange-700 transition-colors"
              >
                Directory
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Welcome banner (first visit) */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">
                    Welcome, {merchant.businessName}
                  </h1>
                  <p className="text-orange-100 text-sm mt-1">
                    Your Lightning payment dashboard. Accept Bitcoin instantly.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                  <span className="text-sm text-orange-100 font-medium">
                    {stats?.lnbitsAvailable ? "Payments active" : "Setting up"}
                  </span>
                </div>
              </div>
            </motion.div>
          </ScrollReveal>

          {/* Two-column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Payment Link + Balance */}
            <div className="lg:col-span-1 space-y-6">
              <PaymentLinkCard merchantId={merchantId} />

              {/* Send Invoice CTA */}
              <ScrollReveal delay={0.15}>
                <Link
                  href={`/merchant-dashboard/send-invoice?merchant=${merchantId}`}
                  className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-orange-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                      <Send size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                        Send Invoice
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Email a payment request to a customer
                      </p>
                    </div>
                    <Mail size={18} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                </Link>
              </ScrollReveal>

              <BalanceCard
                stats={stats}
                loading={statsLoading}
                btcPriceUsd={btcPriceUsd}
              />
            </div>

            {/* Right column: Activity + Transactions */}
            <div className="lg:col-span-2 space-y-6">
              <TodayActivityCard
                stats={stats}
                loading={statsLoading}
                btcPriceUsd={btcPriceUsd}
              />
              <TransactionList
                merchantId={merchantId}
                btcPriceUsd={btcPriceUsd}
              />
            </div>
          </div>

          {/* Quick links footer */}
          <ScrollReveal delay={0.5}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <Link
                href={`/merchant-dashboard/setup?merchant=${merchantId}`}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-orange-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign
                      size={16}
                      className="text-blue-600"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                      Payment Setup
                    </div>
                    <div className="text-xs text-gray-500">
                      Configure payout address
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href={`/merchant-dashboard/settings?merchant=${merchantId}`}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-orange-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Settings size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                      Settings
                    </div>
                    <div className="text-xs text-gray-500">
                      Notifications, API keys
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                href={`/pay/${merchantId}`}
                target="_blank"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-orange-200 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <Zap size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                      Test Payment
                    </div>
                    <div className="text-xs text-gray-500">
                      Open your checkout page
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </ScrollReveal>
        </main>
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa]" />}>
      <MerchantDashboardContent />
    </Suspense>
  );
}
