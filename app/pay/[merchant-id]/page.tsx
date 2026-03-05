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
}

const SEED_MERCHANT: MerchantData = {
  id: "seed-glacier",
  businessName: "The Ice Cream Parlor by Glacier",
  logoUrl: "/images/merchants/glacier.png",
  location: "Fort Collins, CO",
  checkout_enabled: true,
  default_amount_sats: 500,
};

async function getMerchant(merchantId: string): Promise<MerchantData | null> {
  // Try Supabase first
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_pledges")
      .select("id, businessName, logoUrl, location, checkout_enabled, default_amount_sats")
      .eq("id", merchantId)
      .single();

    if (!error && data && data.checkout_enabled) return data;
  } catch {
    // DB unavailable
  }

  // Fallback: seed merchant
  if (merchantId === "seed-glacier") return SEED_MERCHANT;

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
  searchParams: Promise<{ amount?: string }>;
}) {
  const { "merchant-id": merchantId } = await params;
  const { amount } = await searchParams;
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
        presetAmount={presetAmount && !isNaN(presetAmount) ? presetAmount : undefined}
      />
    </div>
  );
}
