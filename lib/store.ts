// ============================================================
// ArxMint — Global State (Zustand)
// ============================================================

import { create } from "zustand";
import type { CommunityConfig, DeploymentConfig, CycleMetrics, WalletBalance } from "./types";

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
}));
