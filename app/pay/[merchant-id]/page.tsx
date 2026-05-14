// ============================================================
// ArxMint — Checkout Page
// /pay/[merchant-id] — customer-facing payment page
// Server Component that fetches merchant data, renders CheckoutFlow
// ============================================================

import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout-flow";
import type { Metadata } from "next";
import { db } from "@/lib/db";

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
  "seed-black-bear": {
    id: "seed-black-bear",
    businessName: "Black Bear Window Cleaning",
    logoUrl: null,
    location: "Boulder, CO",
    checkout_enabled: true,
    default_amount_sats: null,
    website: "https://blackbearwindowcleaning.com",
    reason: "Professional window cleaning in Boulder — pay in sats, zero fees, instant settlement.",
  },
  "arxmint-merch": {
    id: "arxmint-merch",
    businessName: "ArxMint Merch",
    logoUrl: "/images/nav-logo-transparent.svg",
    location: null,
    checkout_enabled: true,
    default_amount_sats: null,
    website: "https://arxmint.com/merch",
    reason: "Official ArxMint-branded merch — stickers, tees, hats. Lightning-paid, Printful-dropshipped, zero platform fees.",
  },
};

async function getMerchant(merchantId: string): Promise<MerchantData | null> {
  // Try Supabase first
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_pledges")
      .select("id, business_name, logo_url, location, checkout_enabled, default_amount_sats, website, reason")
      .eq("id", merchantId)
      .single();

    if (!error && data && data.checkout_enabled) {
      return {
        id: data.id,
        businessName: data.business_name,
        logoUrl: data.logo_url,
        location: data.location,
        checkout_enabled: data.checkout_enabled,
        default_amount_sats: data.default_amount_sats,
        website: data.website,
        reason: data.reason,
      };
    }
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
  searchParams: Promise<{
    amount?: string;
    memo?: string;
    shipping?: string;
    invoiceId?: string;
    /**
     * Pre-minted ArxMint session ID. When set, /pay does NOT mint its own
     * invoice — it loads the existing session and renders its QR. Used by
     * cross-system integrations (e.g. Teneo's btc-create-checkout Lambda
     * mints a session with fulfillment_url, then redirects the user here).
     */
    session?: string;
  }>;
}) {
  const { "merchant-id": merchantId } = await params;
  const { amount, memo, shipping, invoiceId, session } = await searchParams;
  const merchant = await getMerchant(merchantId);

  if (!merchant) notFound();

  // If a pre-minted session was passed, validate it belongs to this merchant.
  // We fetch via Supabase directly (faster + avoids self-call HTTP overhead).
  let presetSession: {
    id: string;
    amountSats: number;
    paymentRail: "lightning" | "cashu" | "onchain";
    demoMode: boolean;
    invoice: string;
  } | null = null;
  if (session) {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("checkout_sessions")
        .select("id, merchant_id, amount_sats, payment_rail, demo_mode, expires_at, status, invoice")
        .eq("id", session)
        .single();
      if (
        !error &&
        data &&
        data.merchant_id === merchant.id &&
        data.status !== "expired" &&
        new Date(data.expires_at) > new Date() &&
        typeof data.invoice === "string" &&
        data.invoice.length > 0
      ) {
        presetSession = {
          id: data.id,
          amountSats: data.amount_sats,
          paymentRail: (data.payment_rail ?? "lightning") as "lightning" | "cashu" | "onchain",
          demoMode: Boolean(data.demo_mode),
          invoice: data.invoice,
        };
      }
    } catch {
      // DB unavailable — fall through to normal flow (user mints a fresh invoice).
    }
  }

  let invoicePreset:
    | { id: string; amountSats: number; memo: string }
    | null = null;

  if (invoiceId) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        merchantId: true,
        status: true,
        currency: true,
        totalMinor: true,
      },
    });

    if (
      !invoice ||
      invoice.merchantId !== merchant.id ||
      invoice.currency !== "BTC" ||
      invoice.status === "void"
    ) {
      notFound();
    }

    invoicePreset = {
      id: invoice.id,
      amountSats: invoice.totalMinor,
      memo: `Invoice ${invoice.invoiceNumber}`,
    };
  }

  const presetAmount = invoicePreset
    ? invoicePreset.amountSats
    : amount
      ? parseInt(amount, 10)
      : merchant.default_amount_sats ?? undefined;

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
        presetMemo={invoicePreset?.memo ?? memo}
        invoiceId={invoicePreset?.id}
        collectShipping={shipping === "1"}
        presetSession={presetSession ?? undefined}
      />
    </div>
  );
}
