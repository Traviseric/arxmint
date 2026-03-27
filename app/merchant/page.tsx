"use client";

// ============================================================
// ArxMint — Merchant Dashboard
// Tabs: Overview | Payments | Webhooks | API Keys | Analytics | Settings
// Auth: Nostr NIP-98 session cookie required → redirect /login if absent
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Webhook,
  Key,
  BarChart2,
  Settings,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  ExternalLink,
  Loader2,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowDownToLine,
  Send,
} from "lucide-react";

// ---- Types ----

type Tab = "overview" | "payments" | "webhooks" | "apikeys" | "analytics" | "payouts" | "settings";
type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

interface Payment {
  id: string;
  merchantId: string;
  status: PaymentStatus;
  amountSats: number;
  memo?: string;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  demoMode?: boolean;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: number;
}

interface ApiKeyPreview {
  keyPreview: string;
  scope: "live" | "pub" | "test";
  merchantId: string;
  createdAt: number;
  expiresAt?: number;
}

// ---- Helpers ----

function satsFmt(n: number): string {
  return n.toLocaleString() + " sats";
}

function dateFmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg: Record<PaymentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    paid: { label: "Paid", cls: "text-green-400 bg-green-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    pending: { label: "Pending", cls: "text-yellow-400 bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
    expired: { label: "Expired", cls: "text-sovereign-muted bg-sovereign-muted/10", icon: <XCircle className="w-3 h-3" /> },
    failed: { label: "Failed", cls: "text-red-400 bg-red-400/10", icon: <XCircle className="w-3 h-3" /> },
    refunded: { label: "Refunded", cls: "text-blue-400 bg-blue-400/10", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const cfg: Record<string, string> = {
    live: "text-btc-orange bg-btc-orange/10",
    pub: "text-blue-400 bg-blue-400/10",
    test: "text-purple-400 bg-purple-400/10",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${cfg[scope] ?? ""}`}>
      {scope}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="text-sovereign-muted hover:text-sovereign-text transition-colors" title="Copy">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ---- Overview Tab ----

interface OverviewStats {
  totalVolume7d: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

function OverviewTab({ merchantId }: { merchantId: string }) {
  const [stats, setStats] = useState<OverviewStats>({
    totalVolume7d: 0,
    completedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [nodeStatus, setNodeStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [cashuStatus, setCashuStatus] = useState<"reachable" | "unreachable" | "checking">("checking");

  useEffect(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/v1/payments?merchant_id=${encodeURIComponent(merchantId)}&limit=100`)
      .then((r) => r.ok ? r.json() : { payments: [] })
      .then((paymentsData) => {
        const payments: Payment[] = paymentsData.payments ?? [];
        const recent = payments.filter((p) => p.createdAt >= cutoff);
        setStats({
          totalVolume7d: recent.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountSats, 0),
          completedCount: payments.filter((p) => p.status === "paid").length,
          pendingCount: payments.filter((p) => p.status === "pending").length,
          failedCount: payments.filter((p) => p.status === "failed" || p.status === "expired").length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [merchantId]);

  useEffect(() => {
    const checkNodeStatus = async () => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) { setNodeStatus("disconnected"); setCashuStatus("unreachable"); return; }
        // /api/health returns { status, services: { lnd: { ok }, mint: { ok } } }
        const data = await res.json();
        const lndOk = data.services?.lnd?.ok === true;
        const cashuOk = data.services?.mint?.ok === true;
        setNodeStatus(lndOk ? "connected" : "disconnected");
        setCashuStatus(cashuOk ? "reachable" : "unreachable");
      } catch {
        setNodeStatus("disconnected");
        setCashuStatus("unreachable");
      }
    };
    checkNodeStatus();
    const interval = setInterval(checkNodeStatus, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-sovereign-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sovereign-card p-4">
          <div className="text-xs text-sovereign-muted mb-1">7d Volume</div>
          <div className="text-xl font-bold text-btc-orange">{satsFmt(stats.totalVolume7d)}</div>
        </div>
        <div className="sovereign-card p-4">
          <div className="text-xs text-sovereign-muted mb-1">Completed</div>
          <div className="text-xl font-bold text-green-400">{stats.completedCount}</div>
        </div>
        <div className="sovereign-card p-4">
          <div className="text-xs text-sovereign-muted mb-1">Pending</div>
          <div className="text-xl font-bold text-yellow-400">{stats.pendingCount}</div>
        </div>
        <div className="sovereign-card p-4">
          <div className="text-xs text-sovereign-muted mb-1">Failed / Expired</div>
          <div className="text-xl font-bold text-red-400">{stats.failedCount}</div>
        </div>
      </div>

      {/* Node status */}
      <div className="sovereign-card p-5">
        <h3 className="text-sm font-semibold text-sovereign-muted mb-4 uppercase tracking-wide">Node Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-sovereign-dark rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-btc-orange" />
              <span className="text-sm text-sovereign-text">Lightning (LND)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${nodeStatus === "connected" ? "bg-green-400" : nodeStatus === "checking" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
              {nodeStatus === "checking" && <span className="text-xs text-sovereign-muted">Checking...</span>}
              {nodeStatus === "connected" && <span className="text-xs text-green-400">Connected</span>}
              {nodeStatus === "disconnected" && <span className="text-xs text-red-400">Disconnected</span>}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-sovereign-dark rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-btc-orange" />
              <span className="text-sm text-sovereign-text">Cashu Mint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${cashuStatus === "reachable" ? "bg-green-400" : cashuStatus === "checking" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
              {cashuStatus === "checking" && <span className="text-xs text-sovereign-muted">Checking...</span>}
              {cashuStatus === "reachable" && <span className="text-xs text-green-400">Reachable</span>}
              {cashuStatus === "unreachable" && <span className="text-xs text-red-400">Unreachable</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="sovereign-card p-5">
        <h3 className="text-sm font-semibold text-sovereign-muted mb-3 uppercase tracking-wide">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <a href={`/pay/${merchantId}`} target="_blank" rel="noreferrer" className="sovereign-btn-outline text-sm flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Checkout Page
          </a>
          <a href="/merchants" className="sovereign-btn-outline text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Merchant Directory
          </a>
        </div>
      </div>

      {/* Disaster Recovery */}
      <DisasterRecoveryCard />
    </div>
  );
}

function DisasterRecoveryCard() {
  const [status, setStatus] = useState<{ ready: boolean; missingFiles: string[]; warnings: string[]; lastModified: string | null } | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/restore-status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore — server may not expose this endpoint in all envs
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="sovereign-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-btc-orange" />
        <h3 className="text-sm font-semibold text-sovereign-muted uppercase tracking-wide">Disaster Recovery</h3>
      </div>
      {status ? (
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 font-medium ${status.ready ? "text-green-400" : "text-yellow-400"}`}>
            {status.ready ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.ready ? "Backup files ready for recovery" : "Missing backup files"}
          </div>
          {status.missingFiles.length > 0 && (
            <ul className="text-xs text-red-400 space-y-0.5 ml-6 list-disc">
              {status.missingFiles.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
          {status.warnings.map((w) => (
            <div key={w} className="text-xs text-yellow-400 ml-6">{w}</div>
          ))}
          {status.lastModified && (
            <div className="text-xs text-sovereign-muted ml-6">
              Last backup: {new Date(status.lastModified).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-sovereign-muted mb-3">
          Verify your backup files are present before you need them.
        </p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={runCheck}
          disabled={checking}
          className="sovereign-btn-outline text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
          Run restore check
        </button>
        <a href="/docs/deployment/restore.md" target="_blank" rel="noreferrer" className="text-xs text-btc-orange hover:underline">
          Recovery guide
        </a>
      </div>
    </div>
  );
}

// ---- Payments Tab ----

function PaymentsTab({ merchantId }: { merchantId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);

  // CSV export state
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [csvFrom, setCsvFrom] = useState(thirtyDaysAgo);
  const [csvTo, setCsvTo] = useState(today);
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ from: csvFrom, to: csvTo });
      const res = await fetch(`/api/merchant/export/csv?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arxmint-payments-${csvFrom}-${csvTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user will see nothing downloaded
    } finally {
      setExporting(false);
    }
  };

  const fetchPayments = useCallback(
    (cursorParam: string | null) => {
      setLoading(true);
      const params = new URLSearchParams({ merchant_id: merchantId, limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cursorParam) params.set("cursor", cursorParam);
      fetch(`/api/v1/payments?${params}`)
        .then((r) => (r.ok ? r.json() : { payments: [], nextCursor: null }))
        .then((data) => {
          setPayments(data.payments ?? []);
          setNextCursor(data.nextCursor ?? null);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [merchantId, statusFilter]
  );

  useEffect(() => {
    setCursor(null);
    setPrevCursors([]);
    fetchPayments(null);
  }, [merchantId, statusFilter, fetchPayments]);

  const goNext = () => {
    if (!nextCursor) return;
    setPrevCursors((p) => [...p, cursor ?? ""]);
    setCursor(nextCursor);
    fetchPayments(nextCursor);
  };

  const goPrev = () => {
    const prev = prevCursors[prevCursors.length - 1] ?? null;
    setPrevCursors((p) => p.slice(0, -1));
    setCursor(prev);
    fetchPayments(prev || null);
  };

  const statuses: Array<PaymentStatus | "all"> = ["all", "paid", "pending", "expired", "failed"];

  return (
    <div className="space-y-4">
      {/* Export CSV */}
      <div className="sovereign-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-center gap-2 mr-2">
            <ArrowDownToLine className="w-4 h-4 text-btc-orange flex-shrink-0" />
            <span className="text-sm font-medium text-sovereign-text">Export for QuickBooks</span>
          </div>
          <div className="flex flex-wrap items-end gap-2 flex-1">
            <div className="flex flex-col gap-1">
              <label htmlFor="csv-from" className="text-xs text-sovereign-muted">From</label>
              <input
                id="csv-from"
                type="date"
                value={csvFrom}
                onChange={(e) => setCsvFrom(e.target.value)}
                className="bg-sovereign-dark border border-sovereign-border rounded-lg px-3 py-1.5 text-xs text-sovereign-text focus:outline-none focus:border-btc-orange"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="csv-to" className="text-xs text-sovereign-muted">To</label>
              <input
                id="csv-to"
                type="date"
                value={csvTo}
                onChange={(e) => setCsvTo(e.target.value)}
                className="bg-sovereign-dark border border-sovereign-border rounded-lg px-3 py-1.5 text-xs text-sovereign-text focus:outline-none focus:border-btc-orange"
              />
            </div>
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="sovereign-btn-outline !px-3 !py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="w-3.5 h-3.5" />
              )}
              {exporting ? "Exporting…" : "Download CSV"}
            </button>
          </div>
        </div>
        <p className="text-xs text-sovereign-muted mt-2">
          Historical BTC/USD rates used — accurate for bookkeeping and tax records
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-btc-orange text-black"
                : "bg-sovereign-panel text-sovereign-muted hover:text-sovereign-text"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="sovereign-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-sovereign-muted text-sm">
            No payments found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-sovereign-muted">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Memo</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/2 transition-colors ${i === payments.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-sovereign-muted">
                      <span className="flex items-center gap-1">
                        {p.id.slice(0, 8)}…
                        <CopyButton text={p.id} />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-sovereign-text">
                      {satsFmt(p.amountSats)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-sovereign-muted hidden sm:table-cell max-w-xs truncate">
                      {p.memo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sovereign-muted hidden md:table-cell whitespace-nowrap">
                      {dateFmt(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(prevCursors.length > 0 || nextCursor) && (
        <div className="flex items-center justify-between text-xs text-sovereign-muted">
          <button
            onClick={goPrev}
            disabled={prevCursors.length === 0}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-sovereign-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={goNext}
            disabled={!nextCursor}
            className="flex items-center gap-1 disabled:opacity-30 hover:text-sovereign-text transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Webhooks Tab ----

function WebhooksTab({ merchantId }: { merchantId: string }) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(() => {
    setLoading(true);
    fetch(`/api/v1/webhooks?merchantId=${encodeURIComponent(merchantId)}`)
      .then((r) => (r.ok ? r.json() : { endpoints: [] }))
      .then((data) => setEndpoints(data.endpoints ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [merchantId]);

  useEffect(() => { fetchEndpoints(); }, [fetchEndpoints]);

  const handleAdd = async () => {
    if (!newUrl) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, url: newUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setNewSecret(data.secret ?? null);
      setNewUrl("");
      setAdding(false);
      fetchEndpoints();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/webhooks?id=${id}&merchantId=${encodeURIComponent(merchantId)}`, {
      method: "DELETE",
    });
    fetchEndpoints();
  };

  return (
    <div className="space-y-4">
      {newSecret && (
        <div className="sovereign-card p-4 border border-btc-orange/30">
          <div className="text-xs text-btc-orange font-bold mb-2">Webhook Secret — save now, not shown again</div>
          <div className="flex items-center gap-2 font-mono text-xs bg-sovereign-dark p-2 rounded">
            <span className="truncate flex-1 text-sovereign-text">{newSecret}</span>
            <CopyButton text={newSecret} />
          </div>
          <button onClick={() => setNewSecret(null)} className="mt-2 text-xs text-sovereign-muted hover:text-sovereign-text">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-sovereign-muted">{endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}</div>
        <button onClick={() => setAdding((a) => !a)} className="sovereign-btn text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Endpoint
        </button>
      </div>

      {adding && (
        <div className="sovereign-card p-4 space-y-3">
          <div className="text-sm font-medium text-sovereign-text">New webhook endpoint</div>
          <input
            className="sovereign-input w-full text-sm"
            placeholder="https://yourapp.com/webhooks/arxmint"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newUrl || submitting} className="sovereign-btn text-sm disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register"}
            </button>
            <button onClick={() => { setAdding(false); setError(null); }} className="sovereign-btn-outline text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" />
        </div>
      ) : endpoints.length === 0 ? (
        <div className="sovereign-card py-12 text-center text-sovereign-muted text-sm">
          No webhook endpoints registered. Add one to receive payment notifications.
        </div>
      ) : (
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <div key={ep.id} className="sovereign-card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-sovereign-text truncate">{ep.url}</div>
                <div className="text-xs text-sovereign-muted mt-1">
                  {ep.events.join(" · ")}
                  {" · "}
                  <span className={ep.active ? "text-green-400" : "text-red-400"}>
                    {ep.active ? "active" : "inactive"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(ep.id)}
                className="text-sovereign-muted hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove endpoint"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- API Keys Tab ----

function ApiKeysTab({ merchantId }: { merchantId: string }) {
  const [keys, setKeys] = useState<ApiKeyPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newScope, setNewScope] = useState<"live" | "pub" | "test">("live");
  const [newKeyVal, setNewKeyVal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);

  const fetchKeys = useCallback(() => {
    setLoading(true);
    fetch(`/api/merchant-keys?merchantId=${encodeURIComponent(merchantId)}`)
      .then((r) => (r.ok ? r.json() : { keys: [] }))
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [merchantId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/merchant-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, scope: newScope }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setNewKeyVal(data.key ?? null);
      fetchKeys();
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const confirmRevoke = async (keyPreview: string) => {
    try {
      const res = await fetch(
        `/api/merchant-keys?key=${encodeURIComponent(keyPreview)}&merchantId=${encodeURIComponent(merchantId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to revoke key");
      } else {
        setKeys((prev) => prev.filter((k) => k.keyPreview !== keyPreview));
      }
    } catch {
      setError("Network error");
    } finally {
      setRevokingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {newKeyVal && (
        <div className="sovereign-card p-4 border border-btc-orange/30">
          <div className="text-xs text-btc-orange font-bold mb-2">New API Key — save now, not shown again</div>
          <div className="flex items-center gap-2 font-mono text-xs bg-sovereign-dark p-2 rounded">
            <span className="truncate flex-1 text-sovereign-text">{newKeyVal}</span>
            <CopyButton text={newKeyVal} />
          </div>
          <button onClick={() => setNewKeyVal(null)} className="mt-2 text-xs text-sovereign-muted hover:text-sovereign-text">
            Dismiss
          </button>
        </div>
      )}

      {/* Generate new key */}
      <div className="sovereign-card p-4 space-y-3">
        <div className="text-sm font-medium text-sovereign-text">Generate API Key</div>
        <div className="flex flex-wrap gap-2">
          {(["live", "pub", "test"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setNewScope(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                newScope === s ? "bg-btc-orange text-black" : "bg-sovereign-panel text-sovereign-muted hover:text-sovereign-text"
              }`}
            >
              arx_{s}_*
            </button>
          ))}
        </div>
        <div className="text-xs text-sovereign-muted">
          {newScope === "live" && "Full payment authority. Never expose client-side."}
          {newScope === "pub" && "Read-only. Safe to embed in frontend JavaScript."}
          {newScope === "test" && "Testnet only. Rejected in production payment paths."}
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button onClick={handleGenerate} disabled={generating} className="sovereign-btn text-sm flex items-center gap-1.5 disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Generate</>}
        </button>
      </div>

      {/* Key list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" />
        </div>
      ) : keys.length === 0 ? (
        <div className="sovereign-card py-10 text-center text-sovereign-muted text-sm">
          No API keys yet. Generate one above.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k, i) => (
            <div key={i} className="sovereign-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ScopeBadge scope={k.scope} />
                  <span className="font-mono text-xs text-sovereign-muted">{k.keyPreview}</span>
                </div>
                <div className="text-xs text-sovereign-muted mt-1">
                  Created {new Date(k.createdAt).toLocaleDateString()}
                  {k.expiresAt && ` · Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                </div>
              </div>
              {revokingKey === k.keyPreview ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-red-400">Confirm revoke?</span>
                  <button
                    onClick={() => confirmRevoke(k.keyPreview)}
                    className="text-xs text-red-500 hover:text-red-300 transition-colors"
                  >
                    Yes, revoke
                  </button>
                  <button
                    onClick={() => setRevokingKey(null)}
                    className="text-xs text-sovereign-muted hover:text-sovereign-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRevokingKey(k.keyPreview)}
                  className="text-sovereign-muted hover:text-red-400 transition-colors flex-shrink-0"
                  title="Revoke key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Analytics Tab ----

interface DailyVolume {
  label: string; // "Mon", "Tue", etc.
  sats: number;
}

function AnalyticsTab({ merchantId }: { merchantId: string }) {
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build 7-day buckets (today = index 6, 6 days ago = index 0)
    const now = new Date();
    const buckets: { date: string; label: string; sats: number }[] = Array.from(
      { length: 7 },
      (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toISOString().slice(0, 10), // "YYYY-MM-DD"
          label: d.toLocaleDateString(undefined, { weekday: "short" }),
          sats: 0,
        };
      }
    );

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);

    fetch(
      `/api/v1/payments?merchant_id=${encodeURIComponent(merchantId)}&status=paid&limit=100`
    )
      .then((r) => (r.ok ? r.json() : { payments: [] }))
      .then((data) => {
        const payments: Payment[] = data.payments ?? [];
        for (const p of payments) {
          if (!p.paidAt) continue;
          const day = new Date(p.paidAt).toISOString().slice(0, 10);
          const bucket = buckets.find((b) => b.date === day);
          if (bucket) bucket.sats += p.amountSats;
        }
        setDailyVolume(buckets.map(({ label, sats }) => ({ label, sats })));
      })
      .catch(() => {
        setDailyVolume(
          buckets.map(({ label }) => ({ label, sats: 0 }))
        );
      })
      .finally(() => setLoading(false));
  }, [merchantId]);

  const maxSats = Math.max(...dailyVolume.map((d) => d.sats), 1);

  return (
    <div className="space-y-6">
      {/* 7-Day Volume — real data from /api/v1/payments */}
      <div className="sovereign-card p-5">
        <h3 className="text-sm font-semibold text-sovereign-muted mb-4 uppercase tracking-wide">
          7-Day Volume (paid)
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 h-32">
              {dailyVolume.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${satsFmt(d.sats)}`}>
                  <div
                    className="w-full bg-btc-orange/60 rounded-t transition-all"
                    style={{ height: `${(d.sats / maxSats) * 100}%`, minHeight: d.sats > 0 ? "4px" : "0" }}
                  />
                  <span className="text-xs text-sovereign-muted">{d.label}</span>
                </div>
              ))}
            </div>
            {dailyVolume.every((d) => d.sats === 0) && (
              <p className="text-xs text-sovereign-muted text-center mt-2">No paid transactions in the last 7 days.</p>
            )}
          </>
        )}
      </div>

      {/* Payment Methods — deferred until payment type tracking is added */}
      <div className="sovereign-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4 text-sovereign-muted" />
          <h3 className="text-sm font-semibold text-sovereign-muted uppercase tracking-wide">
            Payment Methods
          </h3>
          <span className="ml-auto text-xs bg-sovereign-dark text-sovereign-muted px-2 py-0.5 rounded-full border border-white/10">
            Coming Soon
          </span>
        </div>
        <p className="text-sm text-sovereign-muted">
          Lightning vs. Cashu breakdown will be available once per-session payment method tracking is wired to the checkout flow.
        </p>
      </div>
    </div>
  );
}

// ---- Payouts Tab ----

type PayoutStatus = "pending" | "processing" | "completed" | "failed";
type PayoutSchedule = "daily" | "weekly" | "on_threshold";
type PayoutRail = "lightning" | "ecash" | "onchain";

interface PayoutRecord {
  id: string;
  merchantId: string;
  amountSats: string;
  rail: PayoutRail;
  destination: string;
  status: PayoutStatus;
  txRef: string | null;
  createdAt: string;
}

interface PayoutConfig {
  merchantId: string;
  schedule: PayoutSchedule;
  thresholdSats: string | null;
  rail: PayoutRail;
  destination: string;
  enabled: boolean;
}

function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const cfg: Record<PayoutStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    completed: { label: "Completed", cls: "text-green-400 bg-green-400/10", icon: <CheckCircle className="w-3 h-3" /> },
    processing: { label: "Processing", cls: "text-yellow-400 bg-yellow-400/10", icon: <Clock className="w-3 h-3" /> },
    pending: { label: "Pending", cls: "text-sovereign-muted bg-sovereign-muted/10", icon: <Clock className="w-3 h-3" /> },
    failed: { label: "Failed", cls: "text-red-400 bg-red-400/10", icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

function PayoutsTab({ merchantId }: { merchantId: string }) {
  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  // Form state
  const [schedule, setSchedule] = useState<PayoutSchedule>("daily");
  const [rail, setRail] = useState<PayoutRail>("lightning");
  const [destination, setDestination] = useState("");
  const [thresholdSats, setThresholdSats] = useState("");
  const [enabled, setEnabled] = useState(true);

  const fetchConfig = useCallback(() => {
    setLoadingConfig(true);
    fetch(`/api/payouts/config?merchantId=${encodeURIComponent(merchantId)}`)
      .then((r) => (r.ok ? r.json() : { config: null }))
      .then((data) => {
        if (data.config) {
          const c: PayoutConfig = data.config;
          setConfig(c);
          setSchedule(c.schedule);
          setRail(c.rail);
          setDestination(c.destination);
          setThresholdSats(c.thresholdSats ?? "");
          setEnabled(c.enabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [merchantId]);

  const fetchPayouts = useCallback(
    (cursorParam: string | null) => {
      setLoadingPayouts(true);
      const params = new URLSearchParams({ merchantId, limit: "15" });
      if (cursorParam) params.set("cursor", cursorParam);
      fetch(`/api/payouts?${params}`)
        .then((r) => (r.ok ? r.json() : { payouts: [], nextCursor: null }))
        .then((data) => {
          setPayouts(data.payouts ?? []);
          setNextCursor(data.nextCursor ?? null);
        })
        .catch(() => {})
        .finally(() => setLoadingPayouts(false));
    },
    [merchantId]
  );

  useEffect(() => {
    fetchConfig();
    fetchPayouts(null);
  }, [fetchConfig, fetchPayouts]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigError(null);
    try {
      const res = await fetch("/api/payouts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          schedule,
          rail,
          destination,
          thresholdSats: thresholdSats ? parseInt(thresholdSats, 10) : null,
          enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setConfigError(data.error ?? "Failed to save"); return; }
      setConfig(data.config);
    } catch {
      setConfigError("Network error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch("/api/payouts/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTriggerMsg(`Failed: ${data.error ?? "Unknown error"}`);
      } else {
        setTriggerMsg(`Payout triggered — ${data.payout?.amountSats ?? "?"} sats`);
        fetchPayouts(null);
      }
    } catch {
      setTriggerMsg("Network error");
    } finally {
      setTriggering(false);
    }
  };

  const goNext = () => {
    if (!nextCursor) return;
    setPrevCursors((p) => [...p, cursor ?? ""]);
    setCursor(nextCursor);
    fetchPayouts(nextCursor);
  };

  const goPrev = () => {
    const prev = prevCursors[prevCursors.length - 1] ?? null;
    setPrevCursors((p) => p.slice(0, -1));
    setCursor(prev);
    fetchPayouts(prev || null);
  };

  return (
    <div className="space-y-6">
      {/* Config form */}
      <div className="sovereign-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ArrowDownToLine className="w-4 h-4 text-btc-orange" />
          <h3 className="text-sm font-semibold text-sovereign-muted uppercase tracking-wide">
            Payout Configuration
          </h3>
        </div>

        {loadingConfig ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" /></div>
        ) : (
          <div className="space-y-4">
            {/* Schedule */}
            <div>
              <label className="text-xs text-sovereign-muted block mb-2">Schedule</label>
              <div className="flex flex-wrap gap-2">
                {(["daily", "weekly", "on_threshold"] as PayoutSchedule[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSchedule(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      schedule === s
                        ? "bg-btc-orange text-black"
                        : "bg-sovereign-panel text-sovereign-muted hover:text-sovereign-text"
                    }`}
                  >
                    {s === "on_threshold" ? "On Threshold" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {schedule === "on_threshold" && (
              <div>
                <label className="text-xs text-sovereign-muted block mb-1">Threshold (sats)</label>
                <input
                  className="sovereign-input w-full text-sm"
                  type="number"
                  placeholder="e.g. 50000"
                  value={thresholdSats}
                  onChange={(e) => setThresholdSats(e.target.value)}
                />
              </div>
            )}

            {/* Rail */}
            <div>
              <label className="text-xs text-sovereign-muted block mb-2">Payment Rail</label>
              <div className="flex flex-wrap gap-2">
                {(["lightning", "ecash", "onchain"] as PayoutRail[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRail(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      rail === r
                        ? "bg-btc-orange text-black"
                        : "bg-sovereign-panel text-sovereign-muted hover:text-sovereign-text"
                    }`}
                  >
                    {r === "lightning" ? "Lightning" : r === "ecash" ? "Ecash" : "On-chain"}
                    {(r === "ecash" || r === "onchain") && (
                      <span className="ml-1 text-[10px] opacity-60">(soon)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="text-xs text-sovereign-muted block mb-1">
                Destination{" "}
                <span className="text-sovereign-muted/60">
                  {rail === "lightning" ? "(Lightning Address, e.g. you@getalby.com)" : rail === "ecash" ? "(ecash pubkey)" : "(Bitcoin address)"}
                </span>
              </label>
              <input
                className="sovereign-input w-full text-sm font-mono"
                placeholder={rail === "lightning" ? "you@getalby.com" : rail === "ecash" ? "ecash pubkey" : "bc1q..."}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEnabled((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-btc-orange" : "bg-sovereign-panel"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-sovereign-text">{enabled ? "Payouts enabled" : "Payouts paused"}</span>
            </div>

            {configError && <div className="text-xs text-red-400">{configError}</div>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig || !destination}
                className="sovereign-btn text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Config"}
              </button>
              {config && (
                <button
                  onClick={handleTrigger}
                  disabled={triggering}
                  className="sovereign-btn-outline text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Trigger Now</>}
                </button>
              )}
            </div>

            {triggerMsg && (
              <div className={`text-xs ${triggerMsg.startsWith("Failed") ? "text-red-400" : "text-green-400"}`}>
                {triggerMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payout history */}
      <div className="sovereign-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-sovereign-muted uppercase tracking-wide">
            Payout History
          </h3>
          <button
            onClick={() => { setCursor(null); setPrevCursors([]); fetchPayouts(null); }}
            className="text-sovereign-muted hover:text-sovereign-text transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingPayouts ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-sovereign-muted" /></div>
        ) : payouts.length === 0 ? (
          <div className="py-12 text-center text-sovereign-muted text-sm">
            No payouts yet. Configure a schedule above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-sovereign-muted">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Rail</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/2 transition-colors ${i === payouts.length - 1 ? "border-b-0" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-sovereign-muted">
                      <span className="flex items-center gap-1">
                        {p.id.slice(0, 8)}…
                        <CopyButton text={p.id} />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-sovereign-text">
                      {parseInt(p.amountSats, 10).toLocaleString()} sats
                    </td>
                    <td className="px-4 py-3 text-sovereign-muted text-xs capitalize">{p.rail}</td>
                    <td className="px-4 py-3">
                      <PayoutStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-sovereign-muted hidden md:table-cell whitespace-nowrap">
                      {dateFmt(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(prevCursors.length > 0 || nextCursor) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-sovereign-muted">
            <button
              onClick={goPrev}
              disabled={prevCursors.length === 0}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-sovereign-text transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={goNext}
              disabled={!nextCursor}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-sovereign-text transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Settings Tab (stub) ----

function SettingsTab({ merchantId }: { merchantId: string }) {
  return (
    <div className="space-y-4">
      <div className="sovereign-card p-5">
        <h3 className="text-sm font-semibold text-sovereign-muted mb-4 uppercase tracking-wide">
          Merchant Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-sovereign-muted block mb-1">Merchant ID</label>
            <div className="flex items-center gap-2">
              <span className="sovereign-input text-sm flex-1 text-sovereign-muted">{merchantId}</span>
              <CopyButton text={merchantId} />
            </div>
          </div>
          <div>
            <label className="text-xs text-sovereign-muted block mb-1">Checkout URL</label>
            <div className="flex items-center gap-2">
              <span className="sovereign-input text-sm flex-1 text-sovereign-muted truncate">
                {typeof window !== "undefined" ? `${window.location.origin}/pay/${merchantId}` : `/pay/${merchantId}`}
              </span>
              <CopyButton text={typeof window !== "undefined" ? `${window.location.origin}/pay/${merchantId}` : ""} />
            </div>
          </div>
        </div>
      </div>
      <div className="sovereign-card p-5">
        <h3 className="text-sm font-semibold text-sovereign-muted mb-3 uppercase tracking-wide">
          Notifications
        </h3>
        <p className="text-sm text-sovereign-muted">
          Configure payment notifications via the Webhooks tab.
        </p>
      </div>
    </div>
  );
}

// ---- Main Dashboard ----

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "payments", label: "Payments", icon: <CreditCard className="w-4 h-4" /> },
  { id: "payouts", label: "Payouts", icon: <ArrowDownToLine className="w-4 h-4" /> },
  { id: "webhooks", label: "Webhooks", icon: <Webhook className="w-4 h-4" /> },
  { id: "apikeys", label: "API Keys", icon: <Key className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [merchantId, setMerchantId] = useState<string>("");
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  // Auth check on mount
  useEffect(() => {
    fetch("/api/v1/payments?limit=1")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setAuthState("unauthenticated");
          router.replace("/login");
        } else {
          setAuthState("authenticated");
          // Derive merchantId from URL param or use default
          const params = new URLSearchParams(window.location.search);
          const mid = params.get("merchantId") ?? params.get("id") ?? "default";
          setMerchantId(mid);
        }
      })
      .catch(() => {
        // Network error — allow access, payments tab will show error
        setAuthState("authenticated");
        setMerchantId("default");
      });
  }, [router]);

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-sovereign-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-btc-orange" />
      </div>
    );
  }

  if (authState === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-sovereign-dark">
      {/* Header */}
      <header className="border-b border-white/5 bg-sovereign-panel">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-sovereign-text">Merchant Dashboard</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-sovereign-muted">Merchant ID:</span>
              <span className="text-xs font-mono text-btc-orange">{merchantId}</span>
              <CopyButton text={merchantId} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="text-sovereign-muted hover:text-sovereign-text transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/merchants" className="sovereign-btn-outline text-xs">
              Directory
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab nav */}
        <nav className="flex gap-1 overflow-x-auto pb-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-btc-orange text-black"
                  : "text-sovereign-muted hover:text-sovereign-text hover:bg-white/5"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab merchantId={merchantId} />}
        {activeTab === "payments" && <PaymentsTab merchantId={merchantId} />}
        {activeTab === "payouts" && <PayoutsTab merchantId={merchantId} />}
        {activeTab === "webhooks" && <WebhooksTab merchantId={merchantId} />}
        {activeTab === "apikeys" && <ApiKeysTab merchantId={merchantId} />}
        {activeTab === "analytics" && <AnalyticsTab merchantId={merchantId} />}
        {activeTab === "settings" && <SettingsTab merchantId={merchantId} />}
      </div>
    </div>
  );
}
