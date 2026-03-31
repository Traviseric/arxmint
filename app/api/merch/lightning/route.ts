import { NextRequest, NextResponse } from "next/server";
import { getProduct, getVariant } from "@/lib/merch/products";

// Lightning payment flow for merch:
// 1. Client sends items + shipping address
// 2. We store the order in Supabase and create a Lightning invoice via the existing checkout API
// 3. When payment is confirmed, the existing checkout webhook picks it up
// 4. We trigger Printful fulfillment from there

interface LightningMerchRequest {
  items: Array<{ productId: string; variantId: string; quantity: number }>;
  shipping: {
    email: string;
    fullName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LightningMerchRequest;
    const { items, shipping } = body;

    if (!items?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    if (!shipping?.email || !shipping?.fullName || !shipping?.street) {
      return NextResponse.json({ error: "Shipping address required" }, { status: 400 });
    }

    // Calculate total in sats
    let totalSats = 0;
    const printfulItems: Array<{
      sync_variant_id: number;
      quantity: number;
      name: string;
    }> = [];

    for (const item of items) {
      const product = getProduct(item.productId);
      const variant = getVariant(item.productId, item.variantId);
      if (!product || !variant) {
        return NextResponse.json(
          { error: `Invalid product/variant: ${item.productId}/${item.variantId}` },
          { status: 400 },
        );
      }
      totalSats += variant.priceSats * item.quantity;
      if (variant.printfulVariantId > 0) {
        printfulItems.push({
          sync_variant_id: variant.printfulVariantId,
          quantity: item.quantity,
          name: `${product.name} — ${variant.label}`,
        });
      }
    }

    // Build a memo that encodes the order for the checkout webhook
    const memo = `ArxMint Merch: ${printfulItems.map((i) => i.name).join(", ")}`;

    // Create checkout session via the existing ArxMint checkout API
    // This reuses the Lightning invoice infrastructure already in place
    const origin = request.headers.get("origin") || "https://arxmint.com";
    const checkoutRes = await fetch(`${origin}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: "arxmint-merch",
        amountSats: totalSats,
        memo,
        shipping,
        // Stash printful items in metadata for fulfillment
        metadata: {
          printful_items: JSON.stringify(printfulItems),
          needs_dropship: "true",
          source: "arxmint-merch-lightning",
        },
      }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.json().catch(() => ({ error: "Checkout API error" }));
      return NextResponse.json(err, { status: checkoutRes.status });
    }

    const data = await checkoutRes.json();

    return NextResponse.json({
      invoice: data.invoice,
      sessionId: data.sessionId,
      totalSats,
      demoMode: data.demoMode,
    });
  } catch (err) {
    console.error("[Merch Lightning] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
