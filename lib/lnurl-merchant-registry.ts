// ============================================================
// ArxMint — LNURL-pay Merchant Registry
// Maps Lightning Address usernames → merchant metadata.
// Used by /.well-known/lnurlp/[username] and /api/lnurlp/[username]/invoice
// ============================================================

export interface LnurlMerchant {
  username: string;
  displayName: string;
}

// Known merchants that support Lightning Address (username@arxmint.com)
// To add a merchant: append an entry and ensure their LND node is reachable.
const LNURL_MERCHANTS: LnurlMerchant[] = [
  { username: "glacier", displayName: "The Ice Cream Parlor by Glacier" },
  { username: "teneo", displayName: "Teneo" },
];

const registry = new Map<string, LnurlMerchant>(
  LNURL_MERCHANTS.map((m) => [m.username.toLowerCase(), m])
);

export function lookupLnurlMerchant(username: string): LnurlMerchant | null {
  return registry.get(username.toLowerCase()) ?? null;
}
