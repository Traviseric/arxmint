"use client";

// ============================================================
// ArxMint — Checkout Flow Component
// Three states: amount entry → invoice/QR → paid
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackCheckoutEvent } from "@/lib/analytics";
import {
  Zap,
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
import { PaymentRailSelector, type PaymentRail } from "@/components/checkout/PaymentRailSelector";

type CheckoutState = "amount" | "shipping" | "invoice" | "paid" | "expired" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_FAILED: "Payment didn't go through. Please try again or use a different wallet.",
  INVOICE_EXPIRED: "This invoice expired. The merchant will generate a new one — please refresh.",
  INSUFFICIENT_FUNDS: "Your wallet doesn't have enough balance. Try a smaller amount or top up.",
  NETWORK_ERROR: "Connection issue. Check your internet and try again.",
  DEFAULT: "Something went wrong. Please refresh the page or contact the merchant.",
};

function friendlyError(raw: string): string {
  if (!raw) return ERROR_MESSAGES.DEFAULT;
  const key = raw.toUpperCase().replace(/\s+/g, "_");
  return ERROR_MESSAGES[key] ?? raw;
}

interface ShippingAddress {
  email: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface CheckoutFlowProps {
  merchantId: string;
  merchantName: string;
  merchantLogo: string | null;
  merchantLocation: string | null;
  merchantWebsite?: string | null;
  merchantDescription?: string | null;
  presetAmount?: number;
  presetMemo?: string;
  /** Show shipping address form before payment (for physical merch) */
  collectShipping?: boolean;
}

export function CheckoutFlow({
  merchantId,
  merchantName,
  merchantLogo,
  merchantLocation,
  merchantWebsite,
  merchantDescription,
  presetAmount,
  presetMemo,
  collectShipping,
}: CheckoutFlowProps) {
  const initialState = presetAmount
    ? collectShipping ? "shipping" : "invoice"
    : "amount";
  const [state, setState] = useState<CheckoutState>(initialState);
  const [amount, setAmount] = useState(presetAmount?.toString() ?? "");
  const [invoice, setInvoice] = useState("");
  const [paymentUri, setPaymentUri] = useState("");
  const [selectedRail, setSelectedRail] = useState<PaymentRail>("lightning");
  const [availableRails, setAvailableRails] = useState<PaymentRail[]>(["lightning"]);
  const [sessionId, setSessionId] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingAddress>({
    email: "", fullName: "", street: "", city: "", state: "", zip: "",
  });
  const esRef = useRef<EventSource | null>(null);
  const hasCreatedInvoice = useRef(false);

  const createInvoice = useCallback(async (sats: number, shippingData?: ShippingAddress, rail: PaymentRail = "lightning") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          amountSats: sats,
          memo: presetMemo,
          paymentRail: rail,
          ...(shippingData && { shipping: shippingData }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = friendlyError(data.error || "DEFAULT");
        setError(msg);
        setState("error");
        trackCheckoutEvent("payment_failed", { merchant_id: merchantId, reason: data.error });
        return;
      }
      setInvoice(data.invoice);
      setPaymentUri(data.paymentUri ?? data.invoice);
      setSessionId(data.sessionId);
      setDemoMode(data.demoMode);
      if (data.availableRails) setAvailableRails(data.availableRails);
      setSelectedRail(data.paymentRail ?? rail);
      setState("invoice");
      trackCheckoutEvent("checkout_started", { merchant_id: merchantId, amount_sats: sats });
    } catch {
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setState("error");
      trackCheckoutEvent("payment_failed", { merchant_id: merchantId, reason: "network_error" });
    } finally {
      setLoading(false);
    }
  }, [merchantId, presetMemo]);

  // Apply merchant light theme to nav + body so the entire page feels light
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  // Auto-create invoice when preset amount provided (skip if shipping needed)
  useEffect(() => {
    if (presetAmount && !hasCreatedInvoice.current && !collectShipping) {
      hasCreatedInvoice.current = true;
      createInvoice(presetAmount, undefined, "lightning");
    }
  }, [presetAmount, createInvoice, collectShipping]);

  // SSE subscription for real-time payment status
  useEffect(() => {
    if (state !== "invoice" || !sessionId) return;

    const es = new EventSource(`/api/checkout/status/${sessionId}`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "paid") {
          setPaidAt(data.paidAt ?? null);
          setState("paid");
          trackCheckoutEvent("payment_confirmed", { merchant_id: merchantId });
          es.close();
          esRef.current = null;
        } else if (data.status === "expired") {
          setState("expired");
          trackCheckoutEvent("invoice_expired", { merchant_id: merchantId });
          es.close();
          esRef.current = null;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [state, sessionId, merchantId]);

  const handleSubmitAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0 || sats > 1_000_000) {
      setError("Enter an amount between 1 and 1,000,000 sats");
      return;
    }
    if (collectShipping) {
      setState("shipping");
    } else {
      createInvoice(sats);
    }
  };

  const shippingComplete =
    shipping.email.includes("@") &&
    shipping.fullName.length > 0 &&
    shipping.street.length > 0 &&
    shipping.city.length > 0 &&
    shipping.state.length === 2 &&
    shipping.zip.length >= 5;

  const handleSubmitShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingComplete) return;
    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0) return;
    hasCreatedInvoice.current = true;
    createInvoice(sats, shipping, selectedRail);
  };

  const handleRailChange = (rail: PaymentRail) => {
    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0) return;
    setSelectedRail(rail);
    // Close existing SSE before switching rails (new session created)
    esRef.current?.close();
    esRef.current = null;
    setInvoice("");
    setPaymentUri("");
    setSessionId("");
    createInvoice(sats, undefined, rail);
  };

  const handleNewInvoice = () => {
    esRef.current?.close();
    esRef.current = null;
    hasCreatedInvoice.current = false;
    setInvoice("");
    setPaymentUri("");
    setSessionId("");
    setError(null);
    setSelectedRail("lightning");
    setAvailableRails(["lightning"]);
    setState("amount");
  };

  const parsedAmount = parseInt(amount, 10);
  const displayAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

  // Track abandoned checkouts
  useEffect(() => {
    if (state !== "invoice") return;
    const handleUnload = () => {
      trackCheckoutEvent("checkout_abandoned", { merchant_id: merchantId });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [state, merchantId]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Accessible live region for payment status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state === "paid" && "Payment confirmed. Thank you!"}
        {state === "expired" && "Invoice expired. Please generate a new one."}
        {state === "error" && (error ? error : "An error occurred.")}
      </div>

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

      {/* Demo Mode Banner — shown whenever a demo session is active */}
      {demoMode && (state === "invoice" || state === "paid") && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border-2 border-amber-400 text-center">
          <p className="text-sm text-amber-800 font-semibold uppercase tracking-wide">
            DEMO MODE
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Test environment — no real payment is processed
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

      {/* Shipping Address */}
      {state === "shipping" && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmitShipping} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm text-text-muted">Shipping to</p>
              <p className="text-lg font-mono font-semibold text-text-primary">
                {displayAmount.toLocaleString()} sats
              </p>
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">Email (for receipt & tracking)</label>
              <input
                type="email"
                value={shipping.email}
                onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                placeholder="you@email.com"
                className="sovereign-input w-full"
                required
              />
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">Full Name</label>
              <input
                type="text"
                value={shipping.fullName}
                onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                placeholder="First Last"
                className="sovereign-input w-full"
                required
              />
            </div>

            <div>
              <label className="text-xs text-text-muted mb-1 block">Street Address</label>
              <input
                type="text"
                value={shipping.street}
                onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                placeholder="123 Main St"
                className="sovereign-input w-full"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">City</label>
                <input
                  type="text"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  placeholder="City"
                  className="sovereign-input w-full"
                  required
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-text-muted mb-1 block">State</label>
                <input
                  type="text"
                  value={shipping.state}
                  onChange={(e) =>
                    setShipping({ ...shipping, state: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  placeholder="CO"
                  className="sovereign-input w-full text-center"
                  maxLength={2}
                  required
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-text-muted mb-1 block">ZIP</label>
                <input
                  type="text"
                  value={shipping.zip}
                  onChange={(e) =>
                    setShipping({ ...shipping, zip: e.target.value.replace(/\D/g, "").slice(0, 5) })
                  }
                  placeholder="80301"
                  className="sovereign-input w-full text-center"
                  maxLength={5}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !shippingComplete}
              className="antigravity-btn w-full !py-3 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Continue to Payment
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Invoice / QR Code — multi-rail */}
      {state === "invoice" && (invoice || loading) && (
        <div className="bg-bg-elevated border border-border-default rounded-xl p-6 shadow-sm">
          <div className="text-center mb-5">
            <p className="text-sm text-text-muted mb-1">Pay</p>
            <p className="text-3xl font-mono font-semibold text-text-primary">
              {displayAmount.toLocaleString()} <span className="text-base text-text-muted">sats</span>
            </p>
          </div>

          <PaymentRailSelector
            selectedRail={selectedRail}
            availableRails={availableRails}
            paymentUri={paymentUri}
            amountSats={displayAmount}
            merchantName={merchantName}
            loading={loading}
            onRailChange={handleRailChange}
          />

          {/* Waiting indicator — Lightning only (SSE-confirmed); other rails show manual note */}
          {!loading && invoice && (
            <div className="flex items-center justify-center gap-2 mt-5 text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">
                {selectedRail === "lightning"
                  ? "Waiting for payment..."
                  : "Send payment and refresh to confirm"}
              </span>
            </div>
          )}
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
