// ============================================================
// ArxMint — Bazaar Single Product API
// GET /api/bazaar/[id] — fetch a single product by ID
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { SEED_PRODUCTS } from "@/lib/bazaar-catalog";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = SEED_PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
