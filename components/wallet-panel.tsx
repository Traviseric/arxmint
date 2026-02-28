"use client";

// ============================================================
// ArxMint — Wallet Panel
// Live connections to Fedimint, Cashu, and Lightning
// Send/receive ecash, create/pay invoices
// ============================================================

import { useState, useCallback, useEffect } from "react";
import {
  Wallet,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Link,
  Unlink,
  History,
  Info,
} from "lucide-react";
import { getFedimintClient } from "@/lib/fedimint-sdk";
import {
  createCashuClient,
  SovereignCashuClient,
  createPaymentRequest,
  generateCashuURI,
  generateQRDataUrl,
} from "@/lib/cashu-sdk";
import { getLightningClient, validateRemoteSignerConfig } from "@/lib/lightning-agent";
import { useSovereignStore } from "@/lib/store";
import type { StoredTransaction } from "@/lib/types";
import { formatSats } from "@/lib/utils";
import { getTierEscalationConfirmation, type SecurityTier } from "@/lib/types";
import {
  selectSpendPath,
  privacyColor,
  type SpendRoute,
  type PrivacyPreference,
} from "@/lib/spend-router";

type ActiveView = "overview" | "send" | "receive" | "invoice";

// ---- Transaction recording helper ----

async function recordTransaction(params: {
  type: "send" | "receive" | "swap";
  amount: number;
  backend: "cashu" | "lightning" | "fedimint";
  status: "pending" | "completed" | "failed";
  counterparty?: string;
}): Promise<StoredTransaction | null> {
  const communityId =
    useSovereignStore.getState().currentCommunity?.id ?? "unknown";
  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, ...params }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tx: StoredTransaction = data.transaction;
    useSovereignStore.getState().addTransaction(tx);
    return tx;
  } catch {
    // Never block the UI on ledger write failure
    return null;
  }
}

export function WalletPanel() {
  const [view, setView] = useState<ActiveView>("overview");
  const {
    balance,
    setBalance,
    fedimintConnected,
    cashuConnected,
    lightningConnected,
    setConnected,
  } = useSovereignStore();

  return (
    <div className="space-y-6">
      {/* Balance Summary */}
      <div className="sovereign-card !border-btc-orange/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-sovereign-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-btc-orange" />
            Wallet
          </h3>
          <div className="text-2xl font-bold text-btc-orange">
            {formatSats(balance.totalSats)}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <BalanceRow
            label="Fedimint Ecash"
            value={formatSats(Math.floor(balance.fedimintMsats / 1000))}
            connected={fedimintConnected}
          />
          <BalanceRow
            label="Cashu Ecash"
            value={formatSats(balance.cashuSats)}
            connected={cashuConnected}
          />
          <BalanceRow
            label="Lightning"
            value={formatSats(balance.lightningSats)}
            connected={lightningConnected}
          />
          <BalanceRow
            label="On-chain"
            value={formatSats(balance.onchainSats)}
            connected={lightningConnected}
          />
        </div>

        {/* Action Buttons */}
        <div
          role="tablist"
          aria-label="Wallet actions"
          className="grid grid-cols-3 gap-2"
        >
          <button
            role="tab"
            id="wallet-tab-receive"
            aria-selected={view === "receive"}
            aria-controls="wallet-panel-receive"
            tabIndex={view === "receive" || view === "overview" ? 0 : -1}
            onClick={() => setView(view === "receive" ? "overview" : "receive")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              view === "receive"
                ? "bg-green-500/20 text-green-400 border-b-2 border-green-400"
                : "bg-sovereign-dark text-sovereign-muted border-b-2 border-transparent hover:text-sovereign-text"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Receive
          </button>
          <button
            role="tab"
            id="wallet-tab-send"
            aria-selected={view === "send"}
            aria-controls="wallet-panel-send"
            tabIndex={view === "send" ? 0 : -1}
            onClick={() => setView(view === "send" ? "overview" : "send")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              view === "send"
                ? "bg-btc-orange/20 text-btc-orange border-b-2 border-btc-orange"
                : "bg-sovereign-dark text-sovereign-muted border-b-2 border-transparent hover:text-sovereign-text"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Send
          </button>
          <button
            role="tab"
            id="wallet-tab-invoice"
            aria-selected={view === "invoice"}
            aria-controls="wallet-panel-invoice"
            tabIndex={view === "invoice" ? 0 : -1}
            onClick={() => setView(view === "invoice" ? "overview" : "invoice")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              view === "invoice"
                ? "bg-blue-500/20 text-blue-400 border-b-2 border-blue-400"
                : "bg-sovereign-dark text-sovereign-muted border-b-2 border-transparent hover:text-sovereign-text"
            }`}
          >
            <Zap className="w-4 h-4" />
            Invoice
          </button>
        </div>
      </div>

      {/* Dynamic View */}
      {view === "receive" && (
        <div
          role="tabpanel"
          id="wallet-panel-receive"
          aria-labelledby="wallet-tab-receive"
          tabIndex={-1}
        >
          <ReceivePanel />
        </div>
      )}
      {view === "send" && (
        <div
          role="tabpanel"
          id="wallet-panel-send"
          aria-labelledby="wallet-tab-send"
          tabIndex={-1}
        >
          <SendPanel />
        </div>
      )}
      {view === "invoice" && (
        <div
          role="tabpanel"
          id="wallet-panel-invoice"
          aria-labelledby="wallet-tab-invoice"
          tabIndex={-1}
        >
          <InvoicePanel />
        </div>
      )}

      {/* Transaction History */}
      <TransactionHistory />

      {/* Connection Panels */}
      <FedimintConnect />
      <CashuConnect />
      <LightningConnect />
    </div>
  );
}

// ---- Receive Panel ----

function ReceivePanel() {
  const [tab, setTab] = useState<"token" | "qr">("token");
  const [method, setMethod] = useState<"cashu" | "fedimint">("cashu");
  const [token, setToken] = useState("");
  const [qrAmount, setQrAmount] = useState("");
  const [qrMemo, setQrMemo] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { cashuConnected, fedimintConnected, setBalance } = useSovereignStore();

  const handleReceive = async () => {
    if (!token.trim()) return;
    setStatus("loading");

    try {
      if (method === "cashu" && cashuConnected) {
        const client = createCashuClient();
        client.restoreProofs();
        const proofs = await client.receiveEcash(token);
        const received = proofs.reduce((s, p) => s + p.amount, 0);
        setBalance({ cashuSats: client.balance });
        setMessage(`Received ${formatSats(received)}`);
        setStatus("success");
        recordTransaction({ type: "receive", amount: received, backend: "cashu", status: "completed" });
      } else if (method === "fedimint" && fedimintConnected) {
        const client = getFedimintClient();
        const parsed = await client.parseNotes(token);
        await client.receiveEcash(token);
        const bal = await client.getBalance();
        setBalance({ fedimintMsats: bal });
        const receivedSats = Math.floor(parsed.total_amount / 1000);
        setMessage(`Received ${formatSats(receivedSats)}`);
        setStatus("success");
        recordTransaction({ type: "receive", amount: receivedSats, backend: "fedimint", status: "completed" });
      } else {
        setMessage(`Connect to ${method} first`);
        setStatus("error");
      }
    } catch (e: any) {
      setMessage(e.message || "Failed to receive");
      setStatus("error");
    }

    setToken("");
    setTimeout(() => setStatus("idle"), 3000);
  };

  const handleGenerateQR = () => {
    const sats = parseInt(qrAmount);
    if (!sats || sats <= 0) return;
    const request = createPaymentRequest(sats, "http://localhost:3338", {
      description: qrMemo || undefined,
      ttlSeconds: 600,
    });
    const uri = generateCashuURI(request);
    setQrUri(uri);
    setQrDataUrl(generateQRDataUrl(uri, 200));
  };

  const copyUri = async () => {
    if (!qrUri) return;
    await navigator.clipboard.writeText(qrUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sovereign-card">
      <h4 className="text-sm font-bold text-sovereign-white mb-3 flex items-center gap-2">
        <ArrowDownLeft className="w-4 h-4 text-green-400" />
        Receive Ecash
      </h4>

      {/* Tab toggle: Token paste vs QR request */}
      <div role="tablist" aria-label="Receive method" className="flex gap-2 mb-3">
        <button
          role="tab"
          id="receive-tab-token"
          aria-selected={tab === "token"}
          aria-controls="receive-panel-token"
          tabIndex={tab === "token" ? 0 : -1}
          onClick={() => setTab("token")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "token"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "border border-sovereign-border text-sovereign-muted"
          }`}
        >
          Paste Token
        </button>
        <button
          role="tab"
          id="receive-tab-qr"
          aria-selected={tab === "qr"}
          aria-controls="receive-panel-qr"
          tabIndex={tab === "qr" ? 0 : -1}
          onClick={() => setTab("qr")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tab === "qr"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "border border-sovereign-border text-sovereign-muted"
          }`}
        >
          QR Request
        </button>
      </div>

      {tab === "token" && (
        <div
          role="tabpanel"
          id="receive-panel-token"
          aria-labelledby="receive-tab-token"
          tabIndex={-1}
        >
          <div className="flex gap-2 mb-3">
            {(["cashu", "fedimint"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  method === m
                    ? "bg-btc-orange text-sovereign-black"
                    : "border border-sovereign-border text-sovereign-muted"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={method === "cashu" ? "Paste cashuB... token" : "Paste Fedimint ecash notes..."}
            className="sovereign-input text-sm font-mono min-h-[80px] mb-3"
          />

          <button
            onClick={handleReceive}
            disabled={!token.trim() || status === "loading"}
            className="sovereign-btn w-full"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDownLeft className="w-4 h-4" />
            )}
            Receive
          </button>
        </div>
      )}

      {tab === "qr" && (
        <div
          role="tabpanel"
          id="receive-panel-qr"
          aria-labelledby="receive-tab-qr"
          tabIndex={-1}
        >
          <div className="space-y-3 mb-3">
            <div>
              <label className="sovereign-label">Amount (sats)</label>
              <input
                type="number"
                value={qrAmount}
                onChange={(e) => { setQrAmount(e.target.value); setQrDataUrl(null); }}
                placeholder="1000"
                min="1"
                className="sovereign-input text-sm"
              />
            </div>
            <div>
              <label className="sovereign-label">Memo (optional)</label>
              <input
                type="text"
                value={qrMemo}
                onChange={(e) => { setQrMemo(e.target.value); setQrDataUrl(null); }}
                placeholder="Coffee payment"
                className="sovereign-input text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateQR}
            disabled={!qrAmount || parseInt(qrAmount) <= 0}
            className="sovereign-btn w-full mb-3"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Generate Payment QR
          </button>

          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-sovereign-dark rounded-lg p-3 border border-sovereign-border">
                <img src={qrDataUrl} alt="Cashu payment QR" className="w-[200px] h-[200px]" />
              </div>
              {qrUri && (
                <div className="w-full">
                  <div className="relative">
                    <pre className="bg-sovereign-dark rounded-lg p-2 text-[10px] text-sovereign-muted font-mono break-all max-h-[60px] overflow-y-auto">
                      {qrUri}
                    </pre>
                    <button
                      onClick={copyUri}
                      className="absolute top-1 right-1 p-1 rounded bg-sovereign-panel hover:bg-sovereign-border transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-sovereign-muted" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-sovereign-muted mt-1 text-center">
                    NUT-26 cashu: URI — scannable by Cashu wallets
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <StatusMessage status={status} message={message} />
    </div>
  );
}

// ---- Send Panel ----

function SendPanel() {
  const [method, setMethod] = useState<"cashu" | "fedimint">("cashu");
  const [amount, setAmount] = useState("");
  const [privacyPref, setPrivacyPref] = useState<PrivacyPreference>("auto");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const { cashuConnected, fedimintConnected, lightningConnected, balance, setBalance } = useSovereignStore();

  // Compute route suggestion when amount changes
  const routeSuggestion: SpendRoute | null = (() => {
    const sats = parseInt(amount);
    if (!sats || sats <= 0) return null;
    return selectSpendPath(sats, balance, {
      cashu: cashuConnected,
      fedimint: fedimintConnected,
      lightning: lightningConnected,
      ark: false,
      onchain: lightningConnected,
      silentPayments: false,
    }, "cashu", privacyPref);
  })();

  const handleSend = async () => {
    const sats = parseInt(amount);
    if (!sats || sats <= 0) return;
    setStatus("loading");

    try {
      if (method === "cashu" && cashuConnected) {
        const client = createCashuClient();
        client.restoreProofs();
        const { token } = await client.sendEcash(sats);
        setResult(token);
        setBalance({ cashuSats: client.balance });
        setStatus("success");
        recordTransaction({ type: "send", amount: sats, backend: "cashu", status: "completed" });
      } else if (method === "fedimint" && fedimintConnected) {
        const client = getFedimintClient();
        const notes = await client.spendEcash(sats * 1000); // msats
        setResult(notes);
        const bal = await client.getBalance();
        setBalance({ fedimintMsats: bal });
        setStatus("success");
        recordTransaction({ type: "send", amount: sats, backend: "fedimint", status: "completed" });
      } else {
        setResult(`Connect to ${method} first`);
        setStatus("error");
      }
    } catch (e: any) {
      setResult(e.message || "Failed to send");
      setStatus("error");
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sovereign-card">
      <h4 className="text-sm font-bold text-sovereign-white mb-3 flex items-center gap-2">
        <ArrowUpRight className="w-4 h-4 text-btc-orange" />
        Send Ecash
      </h4>

      <div className="flex gap-2 mb-3">
        {(["cashu", "fedimint"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              method === m
                ? "bg-btc-orange text-sovereign-black"
                : "border border-sovereign-border text-sovereign-muted"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label className="sovereign-label">Amount (sats)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
          min="1"
          className="sovereign-input text-sm"
        />
      </div>

      {/* Privacy preference */}
      <div className="mb-3">
        <label className="sovereign-label">Privacy</label>
        <div className="flex gap-1.5">
          {(["auto", "standard", "high", "maximum"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPrivacyPref(p)}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all border ${
                privacyPref === p
                  ? "bg-btc-orange/10 border-btc-orange/40 text-btc-orange"
                  : "bg-sovereign-dark border-sovereign-border text-sovereign-muted"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Route suggestion */}
      {routeSuggestion && (
        <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
          routeSuggestion.available
            ? "border-sovereign-border bg-sovereign-dark"
            : "border-red-500/30 bg-red-500/5"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sovereign-muted">Recommended path:</span>
            <span className={`font-medium ${privacyColor(routeSuggestion.privacy)}`}>
              {routeSuggestion.label}
            </span>
          </div>
          <p className="text-sovereign-muted leading-relaxed">{routeSuggestion.reason}</p>
          {routeSuggestion.estimatedFeeSats > 0 && (
            <p className="text-sovereign-muted mt-1">
              Est. fee: ~{routeSuggestion.estimatedFeeSats} sats
            </p>
          )}
          {routeSuggestion.alternatives.length > 0 && (
            <p className="text-sovereign-muted mt-1">
              Also available: {routeSuggestion.alternatives.join(", ")}
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!amount || parseInt(amount) <= 0 || status === "loading"}
        className="sovereign-btn w-full mb-3"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowUpRight className="w-4 h-4" />
        )}
        Create Ecash Token
      </button>

      {status === "success" && result && (
        <div className="relative">
          <pre className="bg-sovereign-dark rounded-lg p-3 text-xs text-sovereign-text font-mono break-all max-h-[120px] overflow-y-auto">
            {result}
          </pre>
          <button
            onClick={copyResult}
            className="absolute top-2 right-2 p-1.5 rounded bg-sovereign-panel hover:bg-sovereign-border transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-sovereign-muted" />
            )}
          </button>
        </div>
      )}

      {status === "error" && <StatusMessage status="error" message={result} />}
    </div>
  );
}

// ---- Invoice Panel ----

function InvoicePanel() {
  const [tab, setTab] = useState<"create" | "pay">("create");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [bolt11Input, setBolt11Input] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const { cashuConnected, fedimintConnected, setBalance } = useSovereignStore();

  const handleCreateInvoice = async () => {
    const sats = parseInt(amount);
    if (!sats || sats <= 0) return;
    setStatus("loading");

    try {
      if (fedimintConnected) {
        const client = getFedimintClient();
        const inv = await client.createInvoice(sats * 1000, memo || "ArxMint");
        setResult(inv.invoice);
        setStatus("success");
      } else if (cashuConnected) {
        const client = createCashuClient();
        const quote = await client.createMintQuote(sats);
        setResult(quote.request);
        setStatus("success");
      } else {
        setResult("Connect to Fedimint or Cashu first");
        setStatus("error");
      }
    } catch (e: any) {
      setResult(e.message || "Failed to create invoice");
      setStatus("error");
    }
  };

  const handlePayInvoice = async () => {
    if (!bolt11Input.trim()) return;
    setStatus("loading");

    try {
      if (fedimintConnected) {
        const client = getFedimintClient();
        await client.payInvoice(bolt11Input);
        const bal = await client.getBalance();
        setBalance({ fedimintMsats: bal });
        setResult("Invoice paid successfully");
        setStatus("success");
        recordTransaction({
          type: "send", amount: 0, backend: "fedimint", status: "completed",
          counterparty: bolt11Input.slice(0, 32),
        });
      } else if (cashuConnected) {
        const client = createCashuClient();
        client.restoreProofs();
        const quote = await client.createMeltQuote(bolt11Input);
        const { paid } = await client.meltProofs(quote);
        setBalance({ cashuSats: client.balance });
        const txStatus = paid ? "completed" : "pending";
        setResult(paid ? "Invoice paid successfully" : "Payment pending");
        setStatus("success");
        recordTransaction({
          type: "send", amount: 0, backend: "cashu", status: txStatus,
          counterparty: bolt11Input.slice(0, 32),
        });
      } else {
        setResult("Connect to Fedimint or Cashu first");
        setStatus("error");
      }
    } catch (e: any) {
      setResult(e.message || "Failed to pay invoice");
      setStatus("error");
    }

    setBolt11Input("");
    setTimeout(() => setStatus("idle"), 3000);
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sovereign-card">
      <h4 className="text-sm font-bold text-sovereign-white mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-400" />
        Lightning Invoices
      </h4>

      <div className="flex gap-2 mb-4">
        {(["create", "pay"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus("idle"); setResult(""); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t
                ? "bg-btc-orange text-sovereign-black"
                : "border border-sovereign-border text-sovereign-muted"
            }`}
          >
            {t === "create" ? "Create Invoice" : "Pay Invoice"}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <>
          <div className="space-y-3 mb-3">
            <div>
              <label className="sovereign-label">Amount (sats)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                min="1"
                className="sovereign-input text-sm"
              />
            </div>
            <div>
              <label className="sovereign-label">Memo (optional)</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="ArxMint payment"
                className="sovereign-input text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleCreateInvoice}
            disabled={!amount || parseInt(amount) <= 0 || status === "loading"}
            className="sovereign-btn w-full mb-3"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Create Invoice
          </button>

          {status === "success" && result && (
            <div className="relative">
              <pre className="bg-sovereign-dark rounded-lg p-3 text-xs text-sovereign-text font-mono break-all max-h-[120px] overflow-y-auto">
                {result}
              </pre>
              <button
                onClick={copyResult}
                className="absolute top-2 right-2 p-1.5 rounded bg-sovereign-panel hover:bg-sovereign-border transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sovereign-muted" />
                )}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "pay" && (
        <>
          <div className="mb-3">
            <label className="sovereign-label">BOLT11 Invoice</label>
            <textarea
              value={bolt11Input}
              onChange={(e) => setBolt11Input(e.target.value)}
              placeholder="lnbc..."
              className="sovereign-input text-sm font-mono min-h-[80px]"
            />
          </div>

          <button
            onClick={handlePayInvoice}
            disabled={!bolt11Input.trim() || status === "loading"}
            className="sovereign-btn w-full"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Pay Invoice
          </button>
        </>
      )}

      <StatusMessage status={status} message={status === "error" ? result : status === "success" && tab === "pay" ? result : ""} />
    </div>
  );
}

// ---- Transaction History ----

function TransactionHistory() {
  const { currentCommunity, transactions, setTransactions } = useSovereignStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const communityId = currentCommunity?.id;
    const url = communityId
      ? `/api/transactions?communityId=${encodeURIComponent(communityId)}&limit=20`
      : `/api/transactions?limit=20`;

    fetch(url)
      .then((r) => r.json())
      .then((data: { transactions?: StoredTransaction[] }) => {
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      })
      .catch(() => {/* DB unavailable — ignore */})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCommunity?.id]);

  if (loading) return null; // Don't flash empty state on first load
  if (transactions.length === 0) return null; // Hide when empty — no clutter

  return (
    <div className="sovereign-card">
      <h4 className="text-sm font-bold text-sovereign-white mb-3 flex items-center gap-2">
        <History className="w-4 h-4 text-btc-orange" />
        Transaction History
      </h4>
      <div className="space-y-1.5">
        {transactions.slice(0, 20).map((tx) => (
          <TxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: StoredTransaction }) {
  const isReceive = tx.type === "receive";
  const date = new Date(tx.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-sovereign-border/40 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            isReceive ? "bg-green-500/10" : "bg-btc-orange/10"
          }`}
        >
          {isReceive ? (
            <ArrowDownLeft className="w-3 h-3 text-green-400" />
          ) : (
            <ArrowUpRight className="w-3 h-3 text-btc-orange" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-sovereign-white capitalize">{tx.type}</div>
          <div className="text-[10px] text-sovereign-muted font-mono truncate">
            {tx.backend} · {dateStr} {timeStr}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <div
          className={`text-sm font-mono font-medium ${
            isReceive ? "text-green-400" : "text-sovereign-text"
          }`}
        >
          {isReceive ? "+" : "−"}{tx.amount > 0 ? formatSats(tx.amount) : "invoice"}
        </div>
        <div
          className={`text-[10px] ${
            tx.status === "completed"
              ? "text-sovereign-muted"
              : tx.status === "failed"
              ? "text-red-400"
              : "text-yellow-400"
          }`}
        >
          {tx.status}
        </div>
      </div>
    </div>
  );
}

// ---- Connection Components ----

function FedimintConnect() {
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { fedimintConnected, setConnected, setBalance } = useSovereignStore();

  const connect = async () => {
    if (!inviteCode.trim()) return;
    setStatus("loading");
    setMessage("Initializing WASM client...");

    try {
      const client = getFedimintClient();
      await client.init();
      setMessage("Joining federation...");
      const fedId = await client.joinFederation(inviteCode);
      const bal = await client.getBalance();
      setBalance({ fedimintMsats: bal });
      setConnected("fedimintConnected", true);
      setMessage(`Joined federation ${fedId.slice(0, 16)}...`);
      setStatus("success");
    } catch (e: any) {
      setMessage(e.message || "Failed to connect");
      setStatus("error");
    }
  };

  const reconnect = async () => {
    setStatus("loading");
    setMessage("Reconnecting...");
    try {
      const client = getFedimintClient();
      await client.init();
      const opened = await client.open();
      if (opened) {
        const bal = await client.getBalance();
        setBalance({ fedimintMsats: bal });
        setConnected("fedimintConnected", true);
        setMessage("Reconnected to federation");
        setStatus("success");
      } else {
        setMessage("No previous federation found. Enter invite code.");
        setStatus("idle");
      }
    } catch (e: any) {
      setMessage(e.message || "Failed to reconnect");
      setStatus("error");
    }
  };

  return (
    <div className="sovereign-card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-sovereign-white">Fedimint</h4>
        <ConnectionBadge connected={fedimintConnected} />
      </div>

      {fedimintConnected ? (
        <p className="text-xs text-green-400">{message || "Connected"}</p>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="fed11qgqpw9thwvaz7t..."
            className="sovereign-input text-sm font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={connect}
              disabled={!inviteCode.trim() || status === "loading"}
              className="sovereign-btn flex-1 !py-2 text-sm"
            >
              {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
              Join
            </button>
            <button
              onClick={reconnect}
              disabled={status === "loading"}
              className="sovereign-btn-outline !py-2 text-sm"
            >
              Reconnect
            </button>
          </div>
          <StatusMessage status={status} message={message} />
        </div>
      )}
    </div>
  );
}

function CashuConnect() {
  const [mintUrl, setMintUrl] = useState("http://localhost:3338");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { cashuConnected, setConnected, setBalance } = useSovereignStore();

  const connect = async () => {
    if (!mintUrl.trim()) return;
    setStatus("loading");
    setMessage("Connecting to mint...");

    try {
      const client = createCashuClient(mintUrl);
      await client.connect();
      client.restoreProofs();
      setBalance({ cashuSats: client.balance });
      setConnected("cashuConnected", true);
      setMessage(`Connected to ${mintUrl}`);
      setStatus("success");
    } catch (e: any) {
      setMessage(e.message || "Failed to connect");
      setStatus("error");
    }
  };

  return (
    <div className="sovereign-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-bold text-sovereign-white">Cashu Mint</h4>
          <span
            title="Avoid auto-trusting unknown mints. ArxMint verifies keyset IDs per NUT-02 to protect against malicious mint attacks (Jan 2026 disclosure). Hold small balances per mint."
            className="cursor-help"
          >
            <Info className="h-3.5 w-3.5 text-sovereign-muted" />
          </span>
        </div>
        <ConnectionBadge connected={cashuConnected} />
      </div>

      {cashuConnected ? (
        <p className="text-xs text-green-400">{message || "Connected"}</p>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={mintUrl}
            onChange={(e) => setMintUrl(e.target.value)}
            placeholder="http://localhost:3338"
            className="sovereign-input text-sm font-mono"
          />
          <button
            onClick={connect}
            disabled={!mintUrl.trim() || status === "loading"}
            className="sovereign-btn w-full !py-2 text-sm"
          >
            {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
            Connect
          </button>
          <StatusMessage status={status} message={message} />
        </div>
      )}
    </div>
  );
}

function LightningConnect() {
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState<SecurityTier>("watch-only");
  const [remoteSignerUrl, setRemoteSignerUrl] = useState("");
  const [remoteSignerTlsCert, setRemoteSignerTlsCert] = useState("");
  const [remoteSignerMacaroon, setRemoteSignerMacaroon] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { lightningConnected, setConnected, setBalance } = useSovereignStore();

  const onTierSelect = (nextTier: SecurityTier) => {
    const escalationPrompt = getTierEscalationConfirmation(tier, nextTier);
    if (escalationPrompt && !window.confirm(escalationPrompt)) {
      return;
    }
    setTier(nextTier);
  };

  const connect = async () => {
    if (!phrase.trim()) return;

    const remoteSignerConfig = tier === "pay-only"
      ? {
          signerUrl: remoteSignerUrl.trim(),
          tlsCert: remoteSignerTlsCert.trim(),
          macaroon: remoteSignerMacaroon.trim(),
        }
      : undefined;

    if (tier === "pay-only") {
      const signerValidation = validateRemoteSignerConfig(remoteSignerConfig);
      if (!signerValidation.valid) {
        setStatus("error");
        setMessage(`Pay-only tier requires remote signer config: ${signerValidation.errors.join(", ")}`);
        return;
      }
    }

    setStatus("loading");
    setMessage(`Connecting via LNC (${tier})...`);

    try {
      const client = getLightningClient();
      await client.connect(phrase, password || "arxmint", tier, remoteSignerConfig);
      const { onchainSats, channelSats } = await client.getBalance();
      const info = await client.getInfo();
      setBalance({ lightningSats: channelSats, onchainSats });
      setConnected("lightningConnected", true);
      setMessage(`${info.alias} (${info.numChannels} ch) — ${tier} tier`);
      setStatus("success");
    } catch (e: any) {
      setMessage(e.message || "Failed to connect");
      setStatus("error");
    }
  };

  const disconnect = () => {
    getLightningClient().disconnect();
    setConnected("lightningConnected", false);
    setBalance({ lightningSats: 0, onchainSats: 0 });
    setMessage("");
    setStatus("idle");
  };

  return (
    <div className="sovereign-card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-sovereign-white">Lightning (LNC)</h4>
        <ConnectionBadge connected={lightningConnected} />
      </div>

      {lightningConnected ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-400">{message || "Connected"}</p>
            <button
              onClick={disconnect}
              className="text-xs text-sovereign-muted hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Unlink className="w-3 h-3" /> Disconnect
            </button>
          </div>
          <div className="text-xs text-sovereign-muted">
            Security tier: <span className="text-btc-orange font-medium">{getLightningClient().securityTier}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="sovereign-label">Pairing Phrase (10 words)</label>
            <input
              type="password"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="word1 word2 word3 ..."
              className="sovereign-input text-sm font-mono"
            />
          </div>
          <div>
            <label className="sovereign-label">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Encryption password"
              className="sovereign-input text-sm"
            />
          </div>
          {/* Security tier selector */}
          <div>
            <label className="sovereign-label">Security Tier</label>
            <div className="flex gap-2">
              {(["watch-only", "pay-only", "admin"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTierSelect(t)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    tier === t
                      ? t === "admin"
                        ? "bg-red-500/10 border-red-500/40 text-red-400"
                        : "bg-btc-orange/10 border-btc-orange/40 text-btc-orange"
                      : "bg-sovereign-dark border-sovereign-border text-sovereign-muted hover:text-sovereign-text"
                  }`}
                >
                  {t === "watch-only" ? "Watch" : t === "pay-only" ? "Pay" : "Admin"}
                </button>
              ))}
            </div>
            <p className="text-xs text-sovereign-muted mt-1">
              {tier === "watch-only" && "Read-only — safe for agents and exploration."}
              {tier === "pay-only" && "Pay/invoice via remote signer — signer URL, TLS cert, and macaroon are required."}
              {tier === "admin" && (
                <span className="text-red-400">
                  Full access. Never grant this to autonomous agents.
                </span>
              )}
            </p>
          </div>
          {tier === "pay-only" && (
            <div className="space-y-3 rounded-lg border border-sovereign-border bg-sovereign-dark/40 p-3">
              <p className="text-xs text-sovereign-muted">
                Remote signer config (required for pay-only)
              </p>
              <div>
                <label className="sovereign-label">Signer URL</label>
                <input
                  type="text"
                  value={remoteSignerUrl}
                  onChange={(e) => setRemoteSignerUrl(e.target.value)}
                  placeholder="https://signer.local:8443"
                  className="sovereign-input text-sm font-mono"
                />
              </div>
              <div>
                <label className="sovereign-label">Signer TLS Cert (base64)</label>
                <textarea
                  value={remoteSignerTlsCert}
                  onChange={(e) => setRemoteSignerTlsCert(e.target.value)}
                  placeholder="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t..."
                  className="sovereign-input text-xs font-mono min-h-[70px]"
                />
              </div>
              <div>
                <label className="sovereign-label">Signer Macaroon (hex)</label>
                <input
                  type="password"
                  value={remoteSignerMacaroon}
                  onChange={(e) => setRemoteSignerMacaroon(e.target.value)}
                  placeholder="0201036c6e6402f801030a10..."
                  className="sovereign-input text-sm font-mono"
                />
              </div>
            </div>
          )}
          <button
            onClick={connect}
            disabled={
              !phrase.trim() ||
              status === "loading" ||
              (tier === "pay-only" &&
                (!remoteSignerUrl.trim() || !remoteSignerTlsCert.trim() || !remoteSignerMacaroon.trim()))
            }
            className="sovereign-btn w-full !py-2 text-sm"
          >
            {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Connect ({tier})
          </button>
          <StatusMessage status={status} message={message} />
        </div>
      )}
    </div>
  );
}

// ---- Shared Components ----

function BalanceRow({ label, value, connected }: { label: string; value: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-sovereign-muted"}`} />
        <span className="text-sm text-sovereign-muted">{label}</span>
      </div>
      <span className="text-sm text-sovereign-text font-mono">{value}</span>
    </div>
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        connected ? "bg-green-500/10 text-green-400" : "bg-sovereign-dark text-sovereign-muted"
      }`}
    >
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function StatusMessage({ status, message }: { status: string; message: string }) {
  if (status === "idle" || !message) return null;

  return (
    <div
      className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${
        status === "success"
          ? "bg-green-500/10 text-green-400"
          : status === "error"
            ? "bg-red-500/10 text-red-400"
            : "bg-blue-500/10 text-blue-400"
      }`}
    >
      {status === "error" && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      {status === "success" && <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      {status === "loading" && <Loader2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 animate-spin" />}
      <span>{message}</span>
    </div>
  );
}
