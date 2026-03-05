// ============================================================
// ArxMint — Bazaar Catalog API
// GET /api/bazaar — list products and collections
// Supports ?merchant= and ?category= filters
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { SEED_PRODUCTS, SEED_COLLECTIONS } from "@/lib/bazaar-catalog";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get("merchant");
  const category = searchParams.get("category");

  let products = SEED_PRODUCTS;
  let collections = SEED_COLLECTIONS;

  if (merchant) {
    products = products.filter((p) => p.merchantId === merchant);
    collections = collections.filter((c) => c.merchantId === merchant);
  }

  if (category) {
    products = products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  return NextResponse.json({ products, collections });
}
