"use client";

import { useEffect } from "react";
import { hydrateCashuSession, hydrateNostrSession } from "@/lib/store";

/**
 * Invisible client component that runs storage hydration once on app mount.
 * Restores Cashu proofs and Nostr session from localStorage so they survive
 * page refreshes.
 */
export function StorageHydrator() {
  useEffect(() => {
    hydrateNostrSession();
    hydrateCashuSession();
  }, []);

  return null;
}
