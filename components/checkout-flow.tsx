"use client";

// ============================================================
// ArxMint — Checkout Flow Component
// Three states: amount entry → invoice/QR → paid
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import Link from "next/link";
import {
  Zap,
  Copy,
  Check,
  CheckCircle,
  Loader2,
  RefreshCw,
  MapPin,
  AlertCircle,
  Globe,
  ExternalLink,
  Star,
  Users,
} from "lucide-react";

type CheckoutState = "amount" | "invoice" | "paid" | "expired" | "error";

interface CheckoutFlowProps {
  merchantId: string;
  merchantName: string;
  merchantLogo: string | null;
  merchantLocation: string | null;
  merchantWebsite?: string | null;
  merchantDescription?: string | null;
  presetAmount?: number;
}

export function CheckoutFlow({
  merchantId,
  merchantName,
  merchantLogo,
  merchantLocation,
  merchantWebsite,
  merchantDescription,
  presetAmount,
}: CheckoutFlowProps) {
  const [state, setState] = useState<CheckoutState>(presetAmount ? "invoice" : "amount");
  const [amount, setAmount] = useState(presetAmount?.toString() ?? "");
  const [invoice, setInvoice] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCreatedInvoice = useRef(false);

  const createInvoice = useCallback(async (sats: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, amountSats: sats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create invoice");
        setState("error");
        return;
      }
      setInvoice(data.invoice);
      setSessionId(data.sessionId);
      setDemoMode(data.demoMode);
      setState("invoice");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  // Auto-create invoice when preset amount provided
  useEffect(() => {
    if (presetAmount && !hasCreatedInvoice.current) {
      hasCreatedInvoice.current = true;
      createInvoice(presetAmount);
    }
  }, [presetAmount, createInvoice]);

  // Poll for payment status
  useEffect(() => {
    if (state !== "invoice" || !sessionId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "paid") {
          setPaidAt(data.paidAt);
          setState("paid");
        } else if (data.status === "expired") {
          setState("expired");
        }
      } catch {
        // Ignore poll errors
      }
    }, 2_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state, sessionId]);

  const handleSubmitAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0 || sats > 1_000_000) {
      setError("Enter an amount between 1 and 1,000,000 sats");
      return;
    }
    createInvoice(sats);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const handleNewInvoice = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    hasCreatedInvoice.current = false;
    setInvoice("");
    setSessionId("");
    setError(null);
    setState("amount");
  };

  const parsedAmount = parseInt(amount, 10);
  const displayAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Merchant Header */}
      <div className="text-center mb-8">
        {merchantLogo && (
          <div className="w-20 h-20 rounded-2xl bg-white border border-border-strong overflow-hidden mx-auto mb-4 flex items-center justify-center shadow-sm">
            <Image
              src={merchantLogo}
              alt={`${merchantName} logo`}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <h1 className="text-2xl font-semibold text-text-primary">{merchantName}</h1>
        {merchantLocation && (
          <p className="text-sm text-text-muted flex items-center justify-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {merchantLocation}
          </p>
        )}
      </div>

      {/* Demo Mode Banner */}
      {demoMode && state === "invoice" && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
          <p className="text-xs text-amber-700 font-medium">
            Demo Mode — invoice will auto-settle in ~5 seconds
          </p>
        </div>
      )}

      {/* Amount Entry */}
      {state === "amount" && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmitAmount} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                <Zap className="w-4 h-4 text-accent" />
                Amount (sats)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 500"
                className="sovereign-input w-full text-center text-2xl font-mono"
                min={1}
                max={1_000_000}
                autoFocus
              />
              <p className="text-xs text-text-muted text-center mt-2">
                1 – 1,000,000 sats
              </p>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 justify-center">
              {[100, 500, 1000, 5000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-3 py-1.5 rounded-lg text-sm font-mono border border-border-default hover:border-accent/50 hover:bg-accent/5 transition-colors text-text-secondary"
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount}
              className="antigravity-btn w-full !py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Invoice
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Invoice / QR Code */}
      {state === "invoice" && invoice && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-6 shadow-sm">
          <div className="text-center mb-5">
            <p className="text-sm text-text-muted mb-1">Pay</p>
            <p className="text-3xl font-mono font-semibold text-text-primary">
              {displayAmount.toLocaleString()} <span className="text-base text-text-muted">sats</span>
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            <a
              href={`lightning:${invoice}`}
              className="block bg-white rounded-xl p-4 shadow-sm"
            >
              <QRCodeSVG
                value={`lightning:${invoice.toUpperCase()}`}
                size={240}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </a>
          </div>

          <p className="text-xs text-text-muted text-center mb-4">
            Scan with any Lightning wallet
          </p>

          {/* Copy + Deep Link */}
          <div className="space-y-2">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-default hover:border-accent/50 transition-colors text-sm text-text-secondary hover:text-text-primary"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Invoice
                </>
              )}
            </button>

            <a
              href={`lightning:${invoice}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-default hover:border-accent/50 transition-colors text-sm text-text-secondary hover:text-text-primary"
            >
              <Zap className="w-4 h-4" />
              Open in Wallet
            </a>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center justify-center gap-2 mt-5 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Waiting for payment...</span>
          </div>
        </div>
      )}

      {/* Loading state (creating invoice with preset amount) */}
      {state === "invoice" && !invoice && loading && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-12 shadow-sm text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-sm text-text-secondary">Creating invoice...</p>
        </div>
      )}

      {/* Paid */}
      {state === "paid" && (
        <div className="bg-bg-elevated border border-green-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Payment Received
          </h2>
          <p className="text-3xl font-mono font-semibold text-green-600 mb-2">
            {displayAmount.toLocaleString()} <span className="text-base">sats</span>
          </p>
          <p className="text-sm text-text-muted">
            Paid to {merchantName}
          </p>
          {paidAt && (
            <p className="text-xs text-text-muted mt-2">
              {new Date(paidAt).toLocaleString()}
            </p>
          )}
          {demoMode && (
            <p className="text-xs text-amber-600 mt-3">
              This was a demo payment
            </p>
          )}
        </div>
      )}

      {/* Expired */}
      {state === "expired" && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-bg-surface border border-border-default flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Invoice Expired
          </h2>
          <p className="text-sm text-text-muted mb-5">
            This invoice has expired. Generate a new one to continue.
          </p>
          <button
            onClick={handleNewInvoice}
            className="antigravity-btn !px-6 !py-2.5 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate New Invoice
          </button>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="bg-bg-elevated border border-red-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Something Went Wrong
          </h2>
          <p className="text-sm text-red-600 mb-5">{error}</p>
          <button
            onClick={handleNewInvoice}
            className="antigravity-btn !px-6 !py-2.5 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Merchant Info Section */}
      {merchantDescription && (
        <div className="mt-8 bg-bg-elevated border border-border-default rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-semibold text-text-primary mb-2">
              About {merchantName}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {merchantDescription}
            </p>
          </div>

          {merchantWebsite && (
            <a
              href={merchantWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {merchantWebsite.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <div className="border-t border-border-default pt-5 space-y-3">
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
              Get Involved
            </p>

            <a
              href="/merchants"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              <Users className="w-4 h-4" />
              Join the Pilot — Become a Founding Merchant
            </a>

            <a
              href="https://github.com/Traviseric/arxmint"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-default hover:border-accent/50 text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              <Star className="w-4 h-4" />
              Star on GitHub — Help us grow
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-text-muted mt-8">
        Powered by{" "}
        <Link href="/" className="text-accent hover:underline">
          ArxMint
        </Link>
        {" "}— Bitcoin payments with zero fees
      </p>
    </div>
  );
}
