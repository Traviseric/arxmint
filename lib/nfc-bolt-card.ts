// ============================================================
// ArxMint — NFC Bolt Card support
// Reads LNURL-withdraw from Bolt Cards via Web NFC API (Chrome Android)
//
// NOTE: Requires physical Bolt Card for end-to-end testing.
// Web NFC (NDEFReader) is only available on Chrome for Android.
// Always call isNFCSupported() before any other function.
// ============================================================

import { bech32 } from "@scure/base";

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

/** Returns true if the Web NFC API is available (Chrome Android only). */
export function isNFCSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

// ---------------------------------------------------------------------------
// LNURL decoding
// ---------------------------------------------------------------------------

/**
 * Decode any LNURL variant to a plain HTTPS URL.
 *
 * Handles:
 *   - `LNURL1...` / `lnurl1...`   — bech32-encoded URL
 *   - `lightning:LNURL1...`        — URI scheme prefix
 *   - `lnurlw://host/path`         — Bolt Card shorthand for https://
 */
export function decodeLNURL(raw: string): string {
  const s = raw.trim();

  // lnurlw:// → https://  (Bolt Card proprietary scheme)
  if (s.toLowerCase().startsWith("lnurlw://")) {
    return "https://" + s.slice("lnurlw://".length);
  }

  // Strip lightning: prefix if present
  const stripped = s.toLowerCase().startsWith("lightning:")
    ? s.slice("lightning:".length)
    : s;

  // If it's already an https URL return as-is
  if (stripped.startsWith("https://") || stripped.startsWith("http://")) {
    return stripped;
  }

  // Bech32 decode (LNURL spec: lowercase before decode)
  const lower = stripped.toLowerCase();
  if (!lower.startsWith("lnurl")) {
    throw new Error("Not a recognised LNURL format");
  }

  const decoded = bech32.decode(lower as `${string}1${string}`, 2000);
  const bytes = new Uint8Array(bech32.fromWords(decoded.words));
  const url = new TextDecoder().decode(bytes);

  if (!url.startsWith("http")) {
    throw new Error("LNURL decoded to non-HTTP URL");
  }

  return url;
}

// ---------------------------------------------------------------------------
// LNURL-withdraw params
// ---------------------------------------------------------------------------

export interface LNURLWithdrawParams {
  tag: string;
  callback: string;
  k1: string;
  defaultDescription: string;
  minWithdrawable: number; // millisats
  maxWithdrawable: number; // millisats
}

/** Fetch LNURL-withdraw parameters from the decoded callback URL. */
export async function fetchLNURLWithdrawParams(url: string): Promise<LNURLWithdrawParams> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`LNURL fetch failed: ${res.status}`);

  const data = await res.json();

  if (data.status === "ERROR") {
    throw new Error(data.reason || "LNURL returned error");
  }
  if (data.tag !== "withdrawRequest") {
    throw new Error(`Expected withdrawRequest, got: ${data.tag}`);
  }
  if (!data.callback || !data.k1) {
    throw new Error("Invalid LNURL-withdraw response: missing callback or k1");
  }

  return {
    tag: data.tag,
    callback: data.callback,
    k1: data.k1,
    defaultDescription: data.defaultDescription ?? "",
    minWithdrawable: Number(data.minWithdrawable),
    maxWithdrawable: Number(data.maxWithdrawable),
  };
}

// ---------------------------------------------------------------------------
// LNURL-withdraw callback
// ---------------------------------------------------------------------------

/**
 * Call the LNURL-withdraw callback to have the card pay our invoice.
 * @param callback - callback URL from LNURLWithdrawParams
 * @param k1       - challenge token from LNURLWithdrawParams
 * @param invoice  - BOLT11 invoice for the card to pay
 */
export async function callLNURLWithdraw(
  callback: string,
  k1: string,
  invoice: string
): Promise<void> {
  const url = new URL(callback);
  url.searchParams.set("k1", k1);
  url.searchParams.set("pr", invoice);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`LNURL-withdraw callback failed: ${res.status}`);

  const data = await res.json();
  if (data.status === "ERROR") {
    throw new Error(data.reason || "Card rejected the invoice");
  }
  // status === "OK" — card will pay the invoice shortly
}

// ---------------------------------------------------------------------------
// NDEFReader (not in TypeScript stdlib — declare just enough)
// ---------------------------------------------------------------------------

interface NDEFRecord {
  recordType: string;
  data: DataView;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent {
  message: NDEFMessage;
}

interface NDEFReaderInstance extends EventTarget {
  scan(): Promise<void>;
  addEventListener(type: "reading", listener: (event: NDEFReadingEvent) => void): void;
  addEventListener(type: "error", listener: (event: Event) => void): void;
}

// ---------------------------------------------------------------------------
// Main read function
// ---------------------------------------------------------------------------

const NFC_READ_TIMEOUT_MS = 10_000;

/**
 * Activate the NFC reader and wait for a Bolt Card tap.
 *
 * Returns the raw LNURL string (lnurlw://, LNURL1..., etc.) from the card.
 * Throws if:
 *   - NFC is not supported
 *   - No LNURL record found on tapped tag
 *   - Timeout (10 s) with no card tapped
 *
 * NOTE: Requires physical Bolt Card for testing. Always gate calls with
 * isNFCSupported() first.
 */
export async function readBoltCard(): Promise<string> {
  if (!isNFCSupported()) {
    throw new Error("NFC not supported on this device or browser");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NDEFReaderClass = (window as any).NDEFReader as new () => NDEFReaderInstance;
  const ndef = new NDEFReaderClass();

  // scan() throws if permission is denied or NFC is disabled
  await ndef.scan();

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("NFC read timeout — no card tapped within 10 seconds"));
    }, NFC_READ_TIMEOUT_MS);

    ndef.addEventListener("reading", ({ message }) => {
      clearTimeout(timeout);

      for (const record of message.records) {
        if (record.recordType === "url") {
          const url = new TextDecoder().decode(record.data);
          // Accept lnurlw://, lnurl..., or lightning: prefixes
          const lower = url.toLowerCase();
          if (
            lower.includes("lnurlw://") ||
            lower.includes("lnurl") ||
            lower.startsWith("lightning:")
          ) {
            resolve(url);
            return;
          }
        }
      }

      reject(new Error("Not a Bolt Card — no LNURL-withdraw found on this tag"));
    });

    ndef.addEventListener("error", (event: Event) => {
      clearTimeout(timeout);
      reject(new Error((event as ErrorEvent).message || "NFC read error"));
    });
  });
}
