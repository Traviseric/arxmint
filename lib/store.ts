// ============================================================
// ArxMint — Global State (Zustand)
// ============================================================

import { create } from "zustand";
import type { Proof } from "@cashu/cashu-ts";
import type { CommunityConfig, DeploymentConfig, CycleMetrics, WalletBalance, NostrUser, StoredTransaction, MerchantListing } from "./types";

interface SovereignState {
  // Community
  currentCommunity: CommunityConfig | null;
  deployment: DeploymentConfig | null;
  setDeployment: (d: DeploymentConfig) => void;
  setCurrentCommunity: (c: CommunityConfig) => void;
  clearDeployment: () => void;

  // Saved communities (loaded from DB on dashboard mount)
  communities: CommunityConfig[];
  setCommunities: (communities: CommunityConfig[]) => void;

  // Wallet
  balance: WalletBalance;
  setBalance: (b: Partial<WalletBalance>) => void;

  // Cashu proof storage (for cross-session recovery)
  cashuProofs: Proof[];
  setCashuProofs: (proofs: Proof[]) => void;

  // Transaction ledger (in-memory cache, sourced from DB)
  transactions: StoredTransaction[];
  addTransaction: (tx: StoredTransaction) => void;
  setTransactions: (txs: StoredTransaction[]) => void;

  // Cycle
  cycleMetrics: CycleMetrics | null;
  setCycleMetrics: (m: CycleMetrics) => void;

  // Connection state
  fedimintConnected: boolean;
  cashuConnected: boolean;
  lightningConnected: boolean;
  arkConnected: boolean;
  setConnected: (key: "fedimintConnected" | "cashuConnected" | "lightningConnected" | "arkConnected", value: boolean) => void;

  // Merchants (localStorage-persisted until DB is available)
  merchants: MerchantListing[];
  addMerchant: (merchant: MerchantListing) => void;
  removeMerchant: (id: string) => void;
  saveMerchantsToStorage: () => void;

  // Nostr identity
  nostrUser: NostrUser | null;
  nostrConnected: boolean;
  isAuthenticated: boolean;
  setNostrUser: (user: NostrUser) => void;
  clearNostrUser: () => void;
  setAuthenticated: (value: boolean) => void;
}

const MERCHANT_STORAGE_KEY = "arxmint_merchants";

export const useSovereignStore = create<SovereignState>((set, get) => ({
  currentCommunity: null,
  deployment: null,
  setDeployment: (d) =>
    set({ deployment: d, currentCommunity: d.community }),
  setCurrentCommunity: (c) => set({ currentCommunity: c }),
  clearDeployment: () =>
    set({ deployment: null, currentCommunity: null }),

  communities: [],
  setCommunities: (communities) => set({ communities }),

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

  cashuProofs: [],
  setCashuProofs: (proofs) => set({ cashuProofs: proofs }),

  transactions: [],
  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions].slice(0, 100) })),
  setTransactions: (txs) => set({ transactions: txs }),

  cycleMetrics: null,
  setCycleMetrics: (m) => set({ cycleMetrics: m }),

  fedimintConnected: false,
  cashuConnected: false,
  lightningConnected: false,
  arkConnected: false,
  setConnected: (key, value) => set({ [key]: value }),

  // Merchants
  merchants: [],
  addMerchant: (merchant) =>
    set((state) => ({ merchants: [...state.merchants, merchant] })),
  removeMerchant: (id) =>
    set((state) => ({ merchants: state.merchants.filter((m) => m.id !== id) })),
  saveMerchantsToStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const { merchants } = get();
      localStorage.setItem(MERCHANT_STORAGE_KEY, JSON.stringify(merchants));
    } catch { /* storage full or unavailable */ }
  },

  // Nostr identity
  nostrUser: null,
  nostrConnected: false,
  isAuthenticated: false,
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
    set({ nostrUser: null, nostrConnected: false, isAuthenticated: false });
  },
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));

/** Hydrate Cashu proofs from localStorage (call once on app mount) */
export function hydrateCashuSession(): void {
  if (typeof window === "undefined") return;
  try {
    const prefix = "arxmint_proofs_";
    const allProofs: Proof[] = [];

    // Scan for all stored mint namespaces
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) continue;
      const proofs = (parsed as unknown[]).filter(
        (p): p is Proof =>
          p !== null &&
          typeof p === "object" &&
          typeof (p as Record<string, unknown>).id === "string" &&
          typeof (p as Record<string, unknown>).amount === "number" &&
          typeof (p as Record<string, unknown>).secret === "string" &&
          typeof (p as Record<string, unknown>).C === "string"
      );
      allProofs.push(...proofs);
    }

    if (allProofs.length === 0) return;

    const cashuSats = allProofs.reduce((sum, p) => sum + p.amount, 0);
    const store = useSovereignStore.getState();
    store.setCashuProofs(allProofs);
    store.setBalance({ cashuSats });
  } catch {
    // Ignore storage read errors
  }
}

/** Hydrate merchant listings from localStorage (call once on app mount) */
export function hydrateMerchantsFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MERCHANT_STORAGE_KEY);
    if (raw) {
      const merchants = JSON.parse(raw);
      if (Array.isArray(merchants)) {
        useSovereignStore.setState({ merchants });
      }
    }
  } catch {
    // Corrupt data — ignore, start fresh
  }
}

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
