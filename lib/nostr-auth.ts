// ============================================================
// ArxMint — Nostr Auth (NIP-07 + NIP-98)
// ============================================================

import { npubEncode } from "nostr-tools/nip19";
import { verifyEvent } from "nostr-tools";
import type { NostrUser } from "./types";

// NIP-07 window.nostr type declarations
interface Nip07Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrUnsignedEvent): Promise<NostrSignedEvent>;
}

interface NostrUnsignedEvent {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

interface NostrSignedEvent extends NostrUnsignedEvent {
  id: string;
  pubkey: string;
  sig: string;
}

declare global {
  interface Window {
    nostr?: Nip07Nostr;
  }
}

/** Check if a NIP-07 browser extension is available */
export function hasNostrExtension(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

/**
 * Wait for a NIP-07 extension to become available.
 * Extensions may inject `window.nostr` after page load.
 */
export function waitForExtension(timeoutMs = 2000): Promise<boolean> {
  if (hasNostrExtension()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (hasNostrExtension()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 200);
  });
}

/** Convert hex pubkey to bech32 npub */
export function pubkeyToNpub(pubkey: string): string {
  return npubEncode(pubkey);
}

/** Truncate npub for display: npub1abc...xyz */
export function truncateNpub(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 10)}...${npub.slice(-4)}`;
}

/**
 * Connect via NIP-07 extension. Prompts the user's extension
 * to share their public key. Never touches private keys.
 */
export async function connectNostr(): Promise<NostrUser> {
  if (!window.nostr) {
    throw new Error("No NIP-07 extension found. Install Alby or nos2x.");
  }

  const pubkey = await window.nostr.getPublicKey();
  const npub = pubkeyToNpub(pubkey);

  const user: NostrUser = {
    pubkey,
    npub,
    displayName: truncateNpub(npub),
    connectedAt: Date.now(),
  };

  // Attempt to fetch profile metadata asynchronously
  try {
    const profile = await fetchNostrProfile(pubkey);
    if (profile) {
      user.name = profile.name || profile.displayName;
      user.picture = profile.picture;
      user.displayName = user.name || user.displayName;
    }
  } catch (err) {
    console.warn("Failed to fetch NIP-01 profile:", err);
  }

  return user;
}

/**
 * Fetch NIP-01 Profile (kind: 0) metadata for a given pubkey using SimplePool.
 */
export async function fetchNostrProfile(pubkey: string): Promise<Record<string, any> | null> {
  const relays = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
    "wss://relay.snort.social"
  ];

  const pool = new SimplePool();
  try {
    const event = await pool.get(relays, {
      kinds: [0],
      authors: [pubkey],
    });

    if (event) {
      return JSON.parse(event.content);
    }
  } catch (err) {
    console.error("Nostr pool error:", err);
  } finally {
    pool.close(relays);
  }
  return null;
}

// ---- NIP-98 HTTP Auth ----

/** NIP-98 event kind */
const NIP98_KIND = 27235;

/**
 * Create a NIP-98 HTTP auth event for API route protection.
 * Signs a kind-27235 event with the user's extension.
 */
export async function createNip98Auth(
  url: string,
  method: string
): Promise<string> {
  if (!window.nostr) {
    throw new Error("No NIP-07 extension for NIP-98 signing.");
  }

  const event: NostrUnsignedEvent = {
    kind: NIP98_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["u", url],
      ["method", method.toUpperCase()],
    ],
    content: "",
  };

  const signed = await window.nostr.signEvent(event);
  return btoa(JSON.stringify(signed));
}

/**
 * Create a NIP-98 HTTP auth event and return the raw signed event object.
 * Used when submitting to POST /api/auth (server verifies the signature).
 */
export async function createNip98AuthEvent(
  url: string,
  method: string
): Promise<NostrSignedEvent> {
  if (!window.nostr) {
    throw new Error("No NIP-07 extension for NIP-98 signing.");
  }

  const event: NostrUnsignedEvent = {
    kind: NIP98_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["u", url],
      ["method", method.toUpperCase()],
    ],
    content: "",
  };

  return await window.nostr.signEvent(event);
}

/**
 * Verify a NIP-98 auth token from an Authorization header.
 * Server-side — stateless verification.
 */
export function verifyNip98Auth(
  authHeader: string,
  expectedUrl: string,
  expectedMethod: string,
  maxAgeSec = 60
): { valid: boolean; pubkey?: string; error?: string } {
  try {
    const token = authHeader.replace(/^Nostr\s+/i, "");
    const event: NostrSignedEvent = JSON.parse(atob(token));

    if (event.kind !== NIP98_KIND) {
      return { valid: false, error: "Invalid event kind" };
    }

    // Check timestamp freshness
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > maxAgeSec) {
      return { valid: false, error: "Event expired" };
    }

    // Verify URL tag
    const urlTag = event.tags.find((t) => t[0] === "u");
    if (!urlTag || urlTag[1] !== expectedUrl) {
      return { valid: false, error: "URL mismatch" };
    }

    // Verify method tag
    const methodTag = event.tags.find((t) => t[0] === "method");
    if (!methodTag || methodTag[1] !== expectedMethod.toUpperCase()) {
      return { valid: false, error: "Method mismatch" };
    }

    // Verify secp256k1 signature via nostr-tools
    const isValid = verifyEvent(event as any);
    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true, pubkey: event.pubkey };
  } catch {
    return { valid: false, error: "Failed to parse NIP-98 token" };
  }
}
