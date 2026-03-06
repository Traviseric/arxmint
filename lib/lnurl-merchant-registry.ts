// ============================================================
// ArxMint — LNURL-pay Merchant Registry
// Maps Lightning Address usernames → merchant metadata.
// Used by /.well-known/lnurlp/[username] and /api/lnurlp/[username]/invoice
// ============================================================

export interface LnurlMerchant {
  username: string;
  displayName: string;
}

// Hardcoded fallback for known merchants without DB entries.
// Used when Supabase is unavailable or the merchant has no DB row yet.
const FALLBACK_MERCHANTS: Record<string, LnurlMerchant> = {
  glacier: { username: "glacier", displayName: "The Ice Cream Parlor by Glacier" },
  teneo: { username: "teneo", displayName: "Teneo" },
};

/**
 * Look up a merchant by Lightning Address username.
 * Queries Supabase merchant_pledges by slug (id or seed-{slug}), with
 * a hardcoded fallback for known merchants when DB is unavailable.
 * Returns null if the username is not found anywhere.
 */
export async function lookupLnurlMerchant(username: string): Promise<LnurlMerchant | null> {
  const slug = username.toLowerCase();

  try {
    const { supabase } = await import("@/lib/supabase");
    // Try exact slug match first, then "seed-{slug}" pattern used by seeded merchants
    const { data } = await supabase
      .from("merchant_pledges")
      .select("id, businessName")
      .or(`id.eq.${slug},id.eq.seed-${slug}`)
      .eq("approved", true)
      .limit(1)
      .maybeSingle();

    if (data?.businessName) {
      return { username: slug, displayName: data.businessName as string };
    }
  } catch {
    // DB unavailable — fall through to hardcoded fallback
  }

  return FALLBACK_MERCHANTS[slug] ?? null;
}
