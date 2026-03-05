// ============================================================
// ArxMint — Bazaar Product Detail (Server Component)
// /bazaar/[id] — OG metadata + renders <ProductPage>
// ============================================================

import { notFound } from "next/navigation";
import { SEED_PRODUCTS } from "@/lib/bazaar-catalog";
import { ProductPage } from "@/components/product-page";
import type { Metadata } from "next";

function getProduct(id: string) {
  return SEED_PRODUCTS.find((p) => p.id === id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return { title: "Product Not Found — ArxMint Bazaar" };

  return {
    title: `${product.title} — ArxMint Bazaar`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [{ url: product.coverImage, width: 400, height: 600 }],
      siteName: "ArxMint Bazaar",
    },
  };
}

export default async function BazaarProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  return <ProductPage product={product} />;
}
