// ============================================================
// ArxMint — Point of Sale Terminal
// /pos/[merchant-id] — merchant-facing POS for in-person Lightning payments
// Mobile-first PWA. Numeric keypad, real-time USD→sats, BIP21 QR.
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MerchantData {
  id: string;
  businessName: string;
  logoUrl: string | null;
  location: string | null;
}

type ScreenState = "idle" | "generating" | "waiting" | "paid" | "expired";

// ---------------------------------------------------------------------------
// Seed merchants (matches checkout API seed list)
// ---------------------------------------------------------------------------

const SEED_MERCHANTS: Record<string, MerchantData> = {
  "seed-black-bear": {
    id: "seed-black-bear",
    businessName: "Black Bear Window Cleaning",
    logoUrl: null,
    location: "Boulder, CO",
  },
  "seed-glacier": {
    id: "seed-glacier",
    businessName: "The Ice Cream Parlor by Glacier",
    logoUrl: "/images/merchants/glacier.png",
    location: "Fort Collins, CO",
  },
  "seed-teneo": {
    id: "seed-teneo",
    businessName: "Teneo",
    logoUrl: "/images/merchants/teneo.png",
    location: "Boulder, Colorado",
  },
  "arxmint-store": {
    id: "arxmint-store",
    businessName: "ArxMint Store",
    logoUrl: "/images/nav-logo-transparent.svg",
    location: null,
  },
};

// ---------------------------------------------------------------------------
// BTC price hook — polls CoinGecko every 60s
// ---------------------------------------------------------------------------

function useBtcPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        setPrice(data?.bitcoin?.usd ?? null);
      } catch {
        // keep previous price on error
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  return price;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function usdToSats(usd: number, btcPrice: number): number {
  return Math.round((usd / btcPrice) * 100_000_000);
}

function formatSats(sats: number): string {
  return sats.toLocaleString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#F7931A] border-t-transparent animate-spin" />
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="text-lg font-semibold">Merchant not found</p>
      <p className="text-sm text-white/50">
        This POS terminal is not configured. Check the merchant ID in the URL.
      </p>
    </div>
  );
}

// Numeric keypad screen
function KeypadScreen({
  amount,
  amountSats,
  btcPrice,
  onKey,
  onCharge,
}: {
  amount: string;
  amountSats: number;
  btcPrice: number | null;
  onKey: (key: string) => void;
  onCharge: () => void;
}) {
  const displayAmount = amount === "" ? "0" : amount;
  const canCharge = amountSats > 0;

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Amount display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
        <div className="flex items-start gap-1">
          <span className="text-3xl text-white/50 mt-2">$</span>
          <span
            className="text-7xl font-light tracking-tight"
            style={{ minWidth: "1ch" }}
          >
            {displayAmount}
          </span>
        </div>

        {btcPrice && amountSats > 0 ? (
          <p className="text-[#F7931A] text-lg font-medium">
            {formatSats(amountSats)} sats
          </p>
        ) : btcPrice ? (
          <p className="text-white/30 text-sm">Enter amount to see sats</p>
        ) : (
          <p className="text-white/30 text-sm">Fetching BTC price…</p>
        )}
      </div>

      {/* Keypad */}
      <div className="px-4 pb-4 grid grid-cols-3 gap-3">
        {keys.flat().map((key) => (
          <button
            key={key}
            onClick={() => onKey(key === "⌫" ? "backspace" : key)}
            className="h-16 rounded-2xl text-2xl font-medium bg-white/10 active:bg-white/20 transition-colors select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Charge button */}
      <div className="px-4 pb-8">
        <button
          onClick={onCharge}
          disabled={!canCharge}
          className="w-full h-16 rounded-2xl text-xl font-bold transition-all select-none"
          style={{
            background: canCharge ? "#F7931A" : "#3a3a3a",
            color: canCharge ? "#000" : "#666",
          }}
        >
          {canCharge
            ? `Charge $${displayAmount}`
            : "Enter amount"}
        </button>
      </div>
    </div>
  );
}

// Invoice / QR screen
function InvoiceScreen({
  invoice,
  amountSats,
  amountUSD,
  status,
  onCancel,
}: {
  invoice: string | null;
  amountSats: number;
  amountUSD: number;
  status: ScreenState;
  onCancel: () => void;
}) {
  // BIP21 unified URI: bitcoin:?lightning=<bolt11>
  const bip21Uri = invoice ? `bitcoin:?lightning=${invoice}` : "";

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-6">
      <div className="text-center">
        <p className="text-white/50 text-sm uppercase tracking-wider">Awaiting payment</p>
        <p className="text-3xl font-bold mt-1">${amountUSD.toFixed(2)}</p>
        {amountSats > 0 && (
          <p className="text-[#F7931A] text-base mt-0.5">{formatSats(amountSats)} sats</p>
        )}
      </div>

      {/* QR code */}
      <div className="flex-1 flex items-center justify-center py-6">
        {status === "generating" || !invoice ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#F7931A] border-t-transparent animate-spin" />
            <p className="text-white/50 text-sm">Generating invoice…</p>
          </div>
        ) : (
          <div
            className="p-4 rounded-2xl bg-white"
            style={{ boxShadow: "0 0 0 4px rgba(247,147,26,0.3)" }}
          >
            <QRCodeSVG
              value={bip21Uri}
              size={240}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      {invoice && (
        <p className="text-white/40 text-xs text-center px-4">
          Scan with any Lightning wallet · BIP21 unified QR
        </p>
      )}

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="mt-4 w-full h-12 rounded-xl text-white/50 text-sm bg-white/5 active:bg-white/10 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// Paid confirmation screen
function PaidScreen({
  onReset,
  amountSats,
  amountUSD,
}: {
  onReset: () => void;
  amountSats: number;
  amountUSD: number;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      {/* Green checkmark */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}
      >
        ✓
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-green-400">Payment received!</p>
        <p className="text-white/60 text-base mt-1">
          ${amountUSD.toFixed(2)} · {formatSats(amountSats)} sats
        </p>
      </div>

      <button
        onClick={onReset}
        className="w-full h-14 rounded-2xl text-lg font-bold text-black"
        style={{ background: "#F7931A" }}
      >
        New sale
      </button>
    </div>
  );
}

// Expired screen
function ExpiredScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
        style={{ background: "rgba(239,68,68,0.15)", border: "2px solid #ef4444" }}
      >
        ⏱
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-red-400">Invoice expired</p>
        <p className="text-white/60 text-sm mt-1">The QR code has expired. Try again.</p>
      </div>
      <button
        onClick={onReset}
        className="w-full h-14 rounded-2xl text-lg font-bold text-black"
        style={{ background: "#F7931A" }}
      >
        Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main POS Page
// ---------------------------------------------------------------------------

export default function POSPage() {
  const params = useParams();
  const merchantId = params["merchant-id"] as string;

  const [merchant, setMerchant] = useState<MerchantData | null | "loading">("loading");
  const [amount, setAmount] = useState(""); // USD string e.g. "12.50"
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [invoice, setInvoice] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const btcPrice = useBtcPrice();
  const esRef = useRef<EventSource | null>(null);

  // ---------------------------------------------------------------------------
  // Load merchant
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!merchantId) return;

    // Check seed list first (instant)
    if (SEED_MERCHANTS[merchantId]) {
      setMerchant(SEED_MERCHANTS[merchantId]);
      return;
    }

    // Try Supabase via existing checkout API pattern
    let cancelled = false;
    fetch(`/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, amountSats: 1, memo: "ping" }),
    })
      .then((res) => {
        if (cancelled) return;
        // If the checkout API knows this merchant, it's valid
        if (res.status === 400 || res.status === 200) {
          // merchant exists — but we need display name, fall back to ID
          setMerchant({ id: merchantId, businessName: merchantId, logoUrl: null, location: null });
        } else {
          setMerchant(null);
        }
      })
      .catch(() => {
        if (!cancelled) setMerchant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  // ---------------------------------------------------------------------------
  // SSE subscription for real-time payment status
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (screen !== "waiting" || !sessionId) return;

    const es = new EventSource(`/api/checkout/status/${sessionId}`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "paid") {
          setScreen("paid");
          es.close();
          esRef.current = null;
        } else if (data.status === "expired") {
          setScreen("expired");
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
  }, [screen, sessionId]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const amountUSD = parseFloat(amount) || 0;
  const amountSats = btcPrice && amountUSD > 0 ? usdToSats(amountUSD, btcPrice) : 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleKey = useCallback(
    (key: string) => {
      if (screen !== "idle") return;
      if (key === "backspace") {
        setAmount((prev) => prev.slice(0, -1));
        return;
      }
      setAmount((prev) => {
        // Only one decimal point
        if (key === "." && prev.includes(".")) return prev;
        // Replace leading zero unless adding decimal
        if (prev === "0" && key !== ".") return key;
        // Limit to 2 decimal places
        const next = prev + key;
        const parts = next.split(".");
        if (parts[1] && parts[1].length > 2) return prev;
        return next;
      });
    },
    [screen]
  );

  const handleCharge = useCallback(async () => {
    if (amountSats <= 0 || screen !== "idle" || !merchant || merchant === "loading") return;
    setScreen("generating");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          amountSats,
          memo: `POS sale — ${merchant.businessName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");
      setInvoice(data.invoice);
      setSessionId(data.sessionId);
      setScreen("waiting");
    } catch {
      setScreen("idle");
    }
  }, [amountSats, screen, merchant, merchantId]);

  const handleReset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setScreen("idle");
    setInvoice(null);
    setSessionId(null);
    setAmount("");
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (merchant === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col max-w-[430px] mx-auto">
        <LoadingScreen />
      </div>
    );
  }

  if (merchant === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col max-w-[430px] mx-auto">
        <NotFoundScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col max-w-[430px] mx-auto select-none">
      {/* PWA viewport meta handled by Next.js metadata in layout */}

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
            ArxMint POS
          </p>
          <p className="font-semibold text-sm leading-tight">{merchant.businessName}</p>
          {merchant.location && (
            <p className="text-[10px] text-white/40">{merchant.location}</p>
          )}
        </div>
        <div className="text-right">
          {btcPrice ? (
            <>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">BTC</p>
              <p className="text-sm font-medium text-[#F7931A]">
                ${btcPrice.toLocaleString()}
              </p>
            </>
          ) : (
            <div className="w-4 h-4 rounded-full border border-[#F7931A]/50 border-t-transparent animate-spin" />
          )}
        </div>
      </header>

      {/* Screen content */}
      {screen === "paid" ? (
        <PaidScreen onReset={handleReset} amountSats={amountSats} amountUSD={amountUSD} />
      ) : screen === "expired" ? (
        <ExpiredScreen onReset={handleReset} />
      ) : screen === "waiting" || screen === "generating" ? (
        <InvoiceScreen
          invoice={invoice}
          amountSats={amountSats}
          amountUSD={amountUSD}
          status={screen}
          onCancel={handleReset}
        />
      ) : (
        <KeypadScreen
          amount={amount}
          amountSats={amountSats}
          btcPrice={btcPrice}
          onKey={handleKey}
          onCharge={handleCharge}
        />
      )}
    </div>
  );
}
