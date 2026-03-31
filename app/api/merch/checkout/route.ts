import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { getProduct, getVariant, formatUsd } from "@/lib/merch/products";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as {
      items: Array<{ productId: string; variantId: string; quantity: number }>;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const stripe = getStripe();
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [];
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

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.name} — ${variant.label}`,
            description: product.description,
          },
          unit_amount: variant.priceUsd,
        },
        quantity: item.quantity,
      });

      if (variant.printfulVariantId > 0) {
        printfulItems.push({
          sync_variant_id: variant.printfulVariantId,
          quantity: item.quantity,
          name: `${product.name} — ${variant.label}`,
        });
      }
    }

    const origin = request.headers.get("origin") || "https://arxmint.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US"] },
      success_url: `${origin}/merch?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/merch?canceled=1`,
      metadata: {
        printful_items: JSON.stringify(printfulItems),
        needs_dropship: printfulItems.length > 0 ? "true" : "false",
        source: "arxmint-merch",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Merch Checkout] Error creating Stripe session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
