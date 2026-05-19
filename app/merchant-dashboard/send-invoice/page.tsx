"use client";

// ============================================================
// ArxMint — Send Invoice Page
// /merchant-dashboard/send-invoice?merchant=[id]
// Merchant enters customer email + amount, sends a payment request.
// ============================================================

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Check,
  RefreshCw,
  Zap,
  DollarSign,
} from "lucide-react";

// ---- Seed merchant data fallback ----

const SEED_MERCHANTS: Record<string, { businessName: string }> = {
  "seed-black-bear": { businessName: "Black Bear Window Cleaning" },
  "seed-glacier": { businessName: "The Ice Cream Parlor by Glacier" },
  "seed-teneo": { businessName: "Teneo" },
  "arxmint-store": { businessName: "ArxMint Store" },
};

// ---- Send Invoice Form ----

function SendInvoiceContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchant") || "seed-black-bear";
  const merchantName =
    SEED_MERCHANTS[merchantId]?.businessName ?? merchantId;

  // Form state
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "sats">("USD");
  const [memo, setMemo] = useState("Window cleaning service");

  // BTC price
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  // Submission state
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [sentAmount, setSentAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Apply merchant light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "merchant");
    document.body.style.background = "#fafafa";
    return () => {
      document.documentElement.removeAttribute("data-theme");
      document.body.style.background = "";
    };
  }, []);

  // Fetch BTC price
  useEffect(() => {
    fetch("https://mempool.space/api/v1/prices")
      .then((r) => r.json())
      .then((d: { USD?: number }) => {
        if (d.USD) setBtcPrice(d.USD);
      })
      .catch(() => {});
  }, []);

  // Compute conversions
  const numericAmount = parseFloat(amount) || 0;

  let satsValue: number;
  let usdValue: number;

  if (currency === "USD") {
    usdValue = numericAmount;
    satsValue = btcPrice && numericAmount > 0
      ? Math.round((numericAmount / btcPrice) * 100_000_000)
      : 0;
  } else {
    satsValue = Math.round(numericAmount);
    usdValue = btcPrice && numericAmount > 0
      ? (numericAmount / 100_000_000) * btcPrice
      : 0;
  }

  const conversionText =
    btcPrice && numericAmount > 0
      ? currency === "USD"
        ? `${satsValue.toLocaleString()} sats`
        : `$${usdValue.toFixed(2)} USD`
      : null;

  const handleSend = useCallback(async () => {
    if (!customerEmail || satsValue < 1) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/merchant-dashboard/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim() || undefined,
          serviceAddress: serviceAddress.trim() || undefined,
          serviceDate: serviceDate || undefined,
          amountSats: satsValue,
          memo: memo.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSentEmail(customerEmail.trim());
        setSentAmount(
          currency === "USD"
            ? `$${numericAmount.toFixed(2)} (${satsValue.toLocaleString()} sats)`
            : `${satsValue.toLocaleString()} sats`
        );
        setSuccess(true);
      } else {
        const d = (await res.json().catch(() => ({}))) as {
          error?: { message?: string } | string;
        };
        const msg =
          typeof d.error === "string"
            ? d.error
            : typeof d.error === "object" && d.error?.message
              ? d.error.message
              : "Failed to send invoice. Please try again.";
        setError(msg);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }, [
    customerEmail,
    customerName,
    serviceAddress,
    serviceDate,
    satsValue,
    merchantId,
    memo,
    currency,
    numericAmount,
  ]);

  const handleReset = () => {
    setCustomerEmail("");
    setCustomerName("");
    setServiceAddress("");
    setServiceDate("");
    setAmount("");
    setMemo("Window cleaning service");
    setSuccess(false);
    setSentEmail("");
    setSentAmount("");
    setError(null);
  };

  const isValid =
    customerEmail.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    satsValue >= 1 &&
    satsValue <= 1_000_000;

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
      </div>

      <div className="relative z-10 w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <Link
              href={`/merchant-dashboard?merchant=${merchantId}`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                {merchantName}
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Mail size={20} className="text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Send Invoice
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-[52px]">
              Email a payment request to your customer. They&apos;ll get a
              professional invoice with a &quot;Pay Now&quot; button.
            </p>
          </div>

          {success ? (
            /* ---- Success state ---- */
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice Sent
              </h2>
              <p className="text-gray-600">
                Payment request for{" "}
                <span className="font-medium text-orange-600">
                  {sentAmount}
                </span>{" "}
                sent to{" "}
                <span className="font-medium text-gray-900">{sentEmail}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Send Another
                </button>
                <Link
                  href={`/merchant-dashboard?merchant=${merchantId}`}
                  className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* ---- Form ---- */
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 space-y-6">
              {/* Customer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Name{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer or company name"
                  maxLength={120}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Service Date{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Service Address{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    placeholder="123 Main St"
                    maxLength={180}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Amount with USD/sats toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setCurrency("USD")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        currency === "USD"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <DollarSign size={12} className="inline mr-0.5" />
                      USD
                    </button>
                    <button
                      onClick={() => setCurrency("sats")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        currency === "sats"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Zap size={12} className="inline mr-0.5" />
                      sats
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currency === "USD" ? "$" : "\u26A1"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={currency === "USD" ? "0.00" : "0"}
                    min="0"
                    step={currency === "USD" ? "0.01" : "1"}
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
                {/* Conversion display */}
                {conversionText && (
                  <p className="text-xs text-gray-500 mt-1.5 ml-1">
                    &#8776; {conversionText}
                    {!btcPrice && " (loading price...)"}
                  </p>
                )}
                {btcPrice && (
                  <p className="text-xs text-gray-400 mt-0.5 ml-1">
                    1 BTC = ${btcPrice.toLocaleString()} USD
                  </p>
                )}
                {satsValue > 1_000_000 && (
                  <p className="text-xs text-red-500 mt-1 ml-1">
                    Maximum 1,000,000 sats per invoice
                  </p>
                )}
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Memo / Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. Window cleaning - standard"
                  maxLength={200}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSend}
                disabled={sending || !isValid}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Invoice
                  </>
                )}
              </button>

              {/* Back link */}
              <div className="text-center">
                <Link
                  href={`/merchant-dashboard?merchant=${merchantId}`}
                  className="text-sm text-gray-500 hover:text-orange-600 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SendInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa]" />}>
      <SendInvoiceContent />
    </Suspense>
  );
}
