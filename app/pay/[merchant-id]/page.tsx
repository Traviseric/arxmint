// ============================================================
// ArxMint — Checkout Page
// /pay/[merchant-id] — customer-facing payment page
// Server Component that fetches merchant data, renders CheckoutFlow
// ============================================================

import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout-flow";
import type { Metadata } from "next";

interface MerchantData {
  id: string;
  businessName: string;
  logoUrl: string | null;
  location: string | null;
  checkout_enabled: boolean;
  default_amount_sats: number | null;
  website: string | null;
  reason: string | null;
}

const SEED_MERCHANTS: Record<string, MerchantData> = {
  "seed-glacier": {
    id: "seed-glacier",
    businessName: "The Ice Cream Parlor by Glacier",
    logoUrl: "/images/merchants/glacier.png",
    location: "Fort Collins, CO",
    checkout_enabled: true,
    default_amount_sats: 500,
    website: "https://www.glacierparlor.com",
    reason: null,
  },
  "seed-teneo": {
    id: "seed-teneo",
    businessName: "Teneo",
    logoUrl: "/images/merchants/teneo.png",
    location: "Boulder, Colorado",
    checkout_enabled: true,
    default_amount_sats: 1000,
    website: "https://teneo.io",
    reason: "AI-powered publishing and agent commerce. Teneo is the first platform where AI agents and humans share the same Bitcoin payment rails — agents sell data and compute via L402 paywalls, creators sell books and courses, all settled instantly in sats with zero platform fees.",
  },
  "arxmint-store": {
    id: "arxmint-store",
    businessName: "ArxMint Store",
    logoUrl: "/images/nav-logo-transparent.svg",
    location: null,
    checkout_enabled: true,
    default_amount_sats: null,
    website: "https://arxmint.com/bazaar",
    reason: "Official ArxMint merch — fortress-energy gear for Bitcoiners. Powered by OpenBazaar.ai.",
  },
};

async function getMerchant(merchantId: string): Promise<MerchantData | null> {
  // Try Supabase first
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_pledges")
      .select("id, businessName, logoUrl, location, checkout_enabled, default_amount_sats, website, reason")
      .eq("id", merchantId)
      .single();

    if (!error && data && data.checkout_enabled) return data;
  } catch {
    // DB unavailable
  }

  // Fallback: seed merchants
  if (SEED_MERCHANTS[merchantId]) return SEED_MERCHANTS[merchantId];

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "merchant-id": string }>;
}): Promise<Metadata> {
  const { "merchant-id": merchantId } = await params;
  const merchant = await getMerchant(merchantId);
  if (!merchant) return { title: "Merchant Not Found — ArxMint" };

  return {
    title: `Pay ${merchant.businessName} — ArxMint`,
    description: `Pay ${merchant.businessName} with Bitcoin Lightning. Zero fees. Instant settlement.`,
    openGraph: {
      title: `Pay ${merchant.businessName} with Bitcoin`,
      description: "Scan the QR code with any Lightning wallet. Zero fees. Instant settlement.",
      siteName: "ArxMint",
    },
  };
}

export default async function PayMerchantPage({
  params,
  searchParams,
}: {
  params: Promise<{ "merchant-id": string }>;
  searchParams: Promise<{ amount?: string; memo?: string; shipping?: string }>;
}) {
  const { "merchant-id": merchantId } = await params;
  const { amount, memo, shipping } = await searchParams;
  const merchant = await getMerchant(merchantId);

  if (!merchant) notFound();

  const presetAmount = amount ? parseInt(amount, 10) : merchant.default_amount_sats ?? undefined;

  return (
    <div
      data-theme="merchant"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#fafafa", color: "#171717" }}
    >
      <CheckoutFlow
        merchantId={merchant.id}
        merchantName={merchant.businessName}
        merchantLogo={merchant.logoUrl}
        merchantLocation={merchant.location}
        merchantWebsite={merchant.website}
        merchantDescription={merchant.reason}
        presetAmount={presetAmount && !isNaN(presetAmount) ? presetAmount : undefined}
        presetMemo={memo}
        collectShipping={shipping === "1"}
      />
    </div>
  );
}
