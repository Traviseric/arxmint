"use client";

// ============================================================
// ArxMint — NWC Sovereign Opt-In
// Lets merchants connect their own Alby Hub / NWC-compatible
// Lightning node via @getalby/bitcoin-connect.
//
// Default: payments route through shared LNbits (managed).
// When connected: NWC URL stored in localStorage for use by
// future checkout routing (see TODO below).
//
// TODO (Phase 4.7 follow-on): In app/api/checkout/route.ts,
//   check localStorage-persisted NWC URL for the merchant and
//   use @getalby/sdk NostrWebLNProvider to create invoices
//   via the merchant's own node instead of shared LNbits.
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { Zap, Unplug, ExternalLink, CheckCircle, Circle } from "lucide-react";

const NWC_STORAGE_KEY = (merchantId: string) =>
  `arxmint:nwc-url:${merchantId}`;

export interface NWCStatus {
  connected: boolean;
  connectorName: string | null;
  nwcUrl: string | null;
}

interface NWCConnectProps {
  merchantId: string;
  onStatusChange?: (status: NWCStatus) => void;
}

export function NWCConnect({ merchantId, onStatusChange }: NWCConnectProps) {
  const [status, setStatus] = useState<NWCStatus>({
    connected: false,
    connectorName: null,
    nwcUrl: null,
  });
  const [bcReady, setBcReady] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(NWC_STORAGE_KEY(merchantId));
    if (stored) {
      try {
        const parsed: NWCStatus = JSON.parse(stored);
        setStatus(parsed);
        onStatusChange?.(parsed);
      } catch {
        localStorage.removeItem(NWC_STORAGE_KEY(merchantId));
      }
    }
  }, [merchantId, onStatusChange]);

  // Load bitcoin-connect and subscribe to events
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unsubConnected: (() => void) | null = null;
    let unsubDisconnected: (() => void) | null = null;

    import("@getalby/bitcoin-connect").then((bc) => {
      // init() configures the library; safe to call multiple times
      bc.init({ appName: "ArxMint" });
      setBcReady(true);

      unsubConnected = bc.onConnected(() => {
        const config = bc.getConnectorConfig();
        const next: NWCStatus = {
          connected: true,
          connectorName: config?.connectorName ?? "Lightning Wallet",
          nwcUrl: config?.nwcUrl ?? null,
        };
        setStatus(next);
        onStatusChange?.(next);
        // Persist to localStorage for future checkout routing
        localStorage.setItem(NWC_STORAGE_KEY(merchantId), JSON.stringify(next));
        setLaunching(false);
      });

      unsubDisconnected = bc.onDisconnected(() => {
        const next: NWCStatus = {
          connected: false,
          connectorName: null,
          nwcUrl: null,
        };
        setStatus(next);
        onStatusChange?.(next);
        localStorage.removeItem(NWC_STORAGE_KEY(merchantId));
      });
    });

    return () => {
      unsubConnected?.();
      unsubDisconnected?.();
    };
  }, [merchantId, onStatusChange]);

  const handleConnect = useCallback(async () => {
    if (!bcReady) return;
    setLaunching(true);
    try {
      const bc = await import("@getalby/bitcoin-connect");
      bc.launchModal();
    } catch {
      setLaunching(false);
    }
  }, [bcReady]);

  const handleDisconnect = useCallback(async () => {
    try {
      const bc = await import("@getalby/bitcoin-connect");
      bc.disconnect();
    } catch {
      // fallback: clear manually
      const next: NWCStatus = { connected: false, connectorName: null, nwcUrl: null };
      setStatus(next);
      onStatusChange?.(next);
      localStorage.removeItem(NWC_STORAGE_KEY(merchantId));
    }
  }, [merchantId, onStatusChange]);

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
        {status.connected ? (
          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          <Circle size={18} className="text-gray-300 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {status.connected
              ? `Connected — ${status.connectorName}`
              : "Using shared LNbits (managed)"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status.connected
              ? "Payments will route through your own node once NWC checkout routing is live."
              : "Default for all Founding Merchants. Connect your own node to go fully sovereign."}
          </p>
          {status.nwcUrl && (
            <p className="text-xs text-gray-400 font-mono mt-1 truncate">
              {status.nwcUrl.replace(/secret=[^&]+/, "secret=•••")}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {status.connected ? (
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
        >
          <Unplug size={15} />
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={!bcReady || launching}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Zap size={15} />
          {launching ? "Connecting…" : "Connect via NWC"}
        </button>
      )}

      {/* Info links */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <a
          href="https://getalby.com/products/hub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-orange-600 transition-colors"
        >
          Get Alby Hub <ExternalLink size={11} />
        </a>
        <a
          href="https://nwc.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-orange-600 transition-colors"
        >
          About NWC <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
