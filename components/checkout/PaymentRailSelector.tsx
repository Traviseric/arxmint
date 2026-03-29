"use client";

// ============================================================
// ArxMint — Payment Rail Selector
// Tabbed UI for multi-rail checkout: Lightning | Cashu | On-chain
// Each tab shows the appropriate QR code, copy button, and
// a wallet deep-link. Privacy level is indicated per rail.
// ============================================================

import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ExternalLink, Shield, Loader2 } from "lucide-react";
import { useState } from "react";

export type PaymentRail = "lightning" | "cashu" | "onchain";

const RAIL_META: Record<
  PaymentRail,
  {
    label: string;
    icon: string;
    privacyLabel: string;
    privacyColor: string;
    scanLabel: string;
    copyLabel: string;
    openLabel: string;
  }
> = {
  lightning: {
    label: "Lightning",
    icon: "⚡",
    privacyLabel: "Good privacy",
    privacyColor: "text-blue-500",
    scanLabel: "Scan with any Lightning wallet",
    copyLabel: "Copy Invoice",
    openLabel: "Open in Lightning Wallet",
  },
  cashu: {
    label: "Cashu",
    icon: "🥜",
    privacyLabel: "Maximum privacy",
    privacyColor: "text-green-500",
    scanLabel: "Scan with a Cashu-compatible wallet",
    copyLabel: "Copy Token",
    openLabel: "Open in Cashu Wallet",
  },
  onchain: {
    label: "On-chain",
    icon: "₿",
    privacyLabel: "Low privacy",
    privacyColor: "text-amber-500",
    scanLabel: "Scan with any Bitcoin wallet",
    copyLabel: "Copy Address",
    openLabel: "Open in Bitcoin Wallet",
  },
};

/** QR value: Lightning uses uppercase BOLT11 with scheme; others use URI as-is */
function toQrValue(rail: PaymentRail, uri: string): string {
  if (rail === "lightning") return `lightning:${uri.toUpperCase()}`;
  return uri;
}

/** Wallet deep-link URI */
function toWalletUri(rail: PaymentRail, uri: string): string {
  if (rail === "lightning") return `lightning:${uri}`;
  return uri;
}

export interface PaymentRailSelectorProps {
  selectedRail: PaymentRail;
  availableRails: PaymentRail[];
  paymentUri: string;
  amountSats: number;
  merchantName: string;
  loading: boolean;
  onRailChange: (rail: PaymentRail) => void;
}

export function PaymentRailSelector({
  selectedRail,
  availableRails,
  paymentUri,
  amountSats,
  merchantName,
  loading,
  onRailChange,
}: PaymentRailSelectorProps) {
  const [copied, setCopied] = useState(false);
  const meta = RAIL_META[selectedRail];
  const isAvailable = availableRails.includes(selectedRail);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-4">
      {/* Rail tabs — only show if more than one rail is available */}
      {availableRails.length > 1 && (
        <div className="flex rounded-lg border border-border-default overflow-hidden">
          {(["lightning", "cashu", "onchain"] as PaymentRail[]).map((rail) => {
            const available = availableRails.includes(rail);
            if (!available) return null;
            const isActive = rail === selectedRail;
            const m = RAIL_META[rail];
            return (
              <button
                key={rail}
                type="button"
                disabled={loading}
                onClick={() => !loading && onRailChange(rail)}
                className={[
                  "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-accent/5 hover:text-text-primary",
                ].join(" ")}
              >
                <span aria-hidden="true">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Privacy indicator */}
      <div className="flex items-center justify-center gap-1.5">
        <Shield className={`w-3.5 h-3.5 ${meta.privacyColor}`} aria-hidden="true" />
        <span className={`text-xs font-medium ${meta.privacyColor}`}>
          {meta.privacyLabel}
        </span>
      </div>

      {/* Loading state while switching rails */}
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      )}

      {/* Payment QR + actions */}
      {!loading && isAvailable && paymentUri && (
        <>
          <div className="flex justify-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <QRCodeSVG
                value={toQrValue(selectedRail, paymentUri)}
                size={240}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
                aria-label={`${meta.label} payment QR code`}
                role="img"
              />
            </div>
          </div>

          <p className="text-xs text-text-muted text-center">{meta.scanLabel}</p>

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
                  {meta.copyLabel}
                </>
              )}
            </button>

            <a
              href={toWalletUri(selectedRail, paymentUri)}
              aria-label={`${meta.openLabel} — pay ${amountSats.toLocaleString()} sats to ${merchantName}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-default hover:border-accent/50 transition-colors text-sm text-text-secondary hover:text-text-primary"
            >
              <ExternalLink className="w-4 h-4" />
              {meta.openLabel}
            </a>
          </div>
        </>
      )}

      {/* Unavailable rail message */}
      {!loading && !isAvailable && (
        <p className="text-sm text-text-muted text-center py-6">
          {selectedRail === "cashu"
            ? "This merchant has not configured a Cashu mint yet."
            : "This merchant has not configured an on-chain address yet."}
        </p>
      )}
    </div>
  );
}
