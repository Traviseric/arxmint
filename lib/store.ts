// ============================================================
// ArxMint — Global State (Zustand)
// ============================================================

import { create } from "zustand";
import type { CommunityConfig, DeploymentConfig, CycleMetrics, WalletBalance, NostrUser } from "./types";

interface SovereignState {
  // Community
  currentCommunity: CommunityConfig | null;
  deployment: DeploymentConfig | null;
  setDeployment: (d: DeploymentConfig) => void;
  clearDeployment: () => void;

  // Wallet
  balance: WalletBalance;
  setBalance: (b: Partial<WalletBalance>) => void;

  // Cycle
  cycleMetrics: CycleMetrics | null;
  setCycleMetrics: (m: CycleMetrics) => void;

  // Connection state
  fedimintConnected: boolean;
  cashuConnected: boolean;
  lightningConnected: boolean;
  arkConnected: boolean;
  setConnected: (key: "fedimintConnected" | "cashuConnected" | "lightningConnected" | "arkConnected", value: boolean) => void;

  // Nostr identity
  nostrUser: NostrUser | null;
  nostrConnected: boolean;
  setNostrUser: (user: NostrUser) => void;
  clearNostrUser: () => void;
}

export const useSovereignStore = create<SovereignState>((set) => ({
  currentCommunity: null,
  deployment: null,
  setDeployment: (d) =>
    set({ deployment: d, currentCommunity: d.community }),
  clearDeployment: () =>
    set({ deployment: null, currentCommunity: null }),

  balance: {
    fedimintMsats: 0,
    cashuSats: 0,
    lightningSats: 0,
    onchainSats: 0,
    arkSats: 0,
    totalSats: 0,
  },
  setBalance: (b) =>
    set((state) => {
      const next = { ...state.balance, ...b };
      next.totalSats =
        Math.floor(next.fedimintMsats / 1000) +
        next.cashuSats +
        next.lightningSats +
        next.onchainSats +
        next.arkSats;
      return { balance: next };
    }),

  cycleMetrics: null,
  setCycleMetrics: (m) => set({ cycleMetrics: m }),

  fedimintConnected: false,
  cashuConnected: false,
  lightningConnected: false,
  arkConnected: false,
  setConnected: (key, value) => set({ [key]: value }),

  // Nostr identity
  nostrUser: null,
  nostrConnected: false,
  setNostrUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("arxmint:nostr-user", JSON.stringify(user));
    }
    set({ nostrUser: user, nostrConnected: true });
  },
  clearNostrUser: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("arxmint:nostr-user");
    }
    set({ nostrUser: null, nostrConnected: false });
  },
}));

/** Hydrate Nostr session from localStorage (call once on app mount) */
export function hydrateNostrSession(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("arxmint:nostr-user");
    if (stored) {
      const user: NostrUser = JSON.parse(stored);
      useSovereignStore.getState().setNostrUser(user);
    }
  } catch {
    localStorage.removeItem("arxmint:nostr-user");
  }
}
