// ArxMint merch catalog — variant IDs from Printful store 17809413
// To get real IDs: curl -s "https://api.printful.com/store/products" \
//   -H "Authorization: Bearer $PRINTFUL_API_KEY" -H "X-PF-Store-Id: 17809413"

export type MerchVariant = {
  id: string;
  label: string;
  printfulVariantId: number;
  /** USD price in cents */
  priceUsd: number;
  /** Price in sats (approximate, update periodically or fetch live) */
  priceSats: number;
};

export type MerchProduct = {
  id: string;
  name: string;
  description: string;
  category: "sticker" | "apparel" | "hat";
  image: string;
  variants: MerchVariant[];
  /** Whether this product requires shipping address */
  requiresShipping: boolean;
};

// ─── Sats/USD conversion helper ───
// At ~$100k/BTC: 1 USD ≈ 1,000 sats. Adjust as needed or fetch live.
const SATS_PER_USD_CENT = 10; // 1 cent = ~10 sats

function usdToSats(cents: number): number {
  return cents * SATS_PER_USD_CENT;
}

export const MERCH_PRODUCTS: MerchProduct[] = [
  // ─── Stickers ───
  {
    id: "arxmint-sticker-pack",
    name: "ArxMint Sticker Pack",
    description: "Die-cut vinyl stickers — ArxMint logo, citadel icon, and 'Build Your Citadel' tagline. Weather-resistant, laptop-ready.",
    category: "sticker",
    image: "/merch/sticker-pack.png",
    requiresShipping: true,
    variants: [
      {
        id: "sticker-pack-3",
        label: "3-Pack",
        printfulVariantId: 0, // TODO: replace with real Printful sync variant ID
        priceUsd: 599,
        priceSats: usdToSats(599),
      },
      {
        id: "sticker-pack-6",
        label: "6-Pack",
        printfulVariantId: 0,
        priceUsd: 999,
        priceSats: usdToSats(999),
      },
    ],
  },

  // ─── T-Shirts ───
  {
    id: "arxmint-tee-classic",
    name: "ArxMint Classic Tee",
    description: "Heavyweight cotton tee with ArxMint fortress logo on front, 'Sovereign by Default' on back. Black with orange print.",
    category: "apparel",
    image: "/merch/tee-classic.png",
    requiresShipping: true,
    variants: [
      { id: "tee-classic-s", label: "S", printfulVariantId: 0, priceUsd: 2999, priceSats: usdToSats(2999) },
      { id: "tee-classic-m", label: "M", printfulVariantId: 0, priceUsd: 2999, priceSats: usdToSats(2999) },
      { id: "tee-classic-l", label: "L", printfulVariantId: 0, priceUsd: 2999, priceSats: usdToSats(2999) },
      { id: "tee-classic-xl", label: "XL", printfulVariantId: 0, priceUsd: 2999, priceSats: usdToSats(2999) },
      { id: "tee-classic-2xl", label: "2XL", printfulVariantId: 0, priceUsd: 3199, priceSats: usdToSats(3199) },
    ],
  },
  {
    id: "arxmint-tee-citadel",
    name: "Citadel Builder Tee",
    description: "Soft-blend tee featuring the ArxMint citadel blueprint graphic. Dark charcoal with subtle orange accents.",
    category: "apparel",
    image: "/merch/tee-citadel.png",
    requiresShipping: true,
    variants: [
      { id: "tee-citadel-s", label: "S", printfulVariantId: 0, priceUsd: 3499, priceSats: usdToSats(3499) },
      { id: "tee-citadel-m", label: "M", printfulVariantId: 0, priceUsd: 3499, priceSats: usdToSats(3499) },
      { id: "tee-citadel-l", label: "L", printfulVariantId: 0, priceUsd: 3499, priceSats: usdToSats(3499) },
      { id: "tee-citadel-xl", label: "XL", printfulVariantId: 0, priceUsd: 3499, priceSats: usdToSats(3499) },
      { id: "tee-citadel-2xl", label: "2XL", printfulVariantId: 0, priceUsd: 3699, priceSats: usdToSats(3699) },
    ],
  },

  // ─── Hats ───
  {
    id: "arxmint-hat-snapback",
    name: "ArxMint Snapback",
    description: "Structured snapback cap with embroidered ArxMint logo. Black with orange embroidery. One size fits most.",
    category: "hat",
    image: "/merch/hat-snapback.png",
    requiresShipping: true,
    variants: [
      {
        id: "hat-snapback-black",
        label: "Black / Orange",
        printfulVariantId: 0,
        priceUsd: 2499,
        priceSats: usdToSats(2499),
      },
    ],
  },
  {
    id: "arxmint-hat-dad",
    name: "ArxMint Dad Hat",
    description: "Unstructured dad hat with embroidered citadel icon. Washed black, adjustable strap.",
    category: "hat",
    image: "/merch/hat-dad.png",
    requiresShipping: true,
    variants: [
      {
        id: "hat-dad-black",
        label: "Washed Black",
        printfulVariantId: 0,
        priceUsd: 2299,
        priceSats: usdToSats(2299),
      },
    ],
  },
];

export function getProduct(id: string): MerchProduct | undefined {
  return MERCH_PRODUCTS.find((p) => p.id === id);
}

export function getVariant(productId: string, variantId: string): MerchVariant | undefined {
  const product = getProduct(productId);
  return product?.variants.find((v) => v.id === variantId);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`;
}
