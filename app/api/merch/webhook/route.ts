import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createDropshipOrder } from "@/lib/printful/client";
import type { PrintfulOrderPayload } from "@/lib/printful/types";

// Stripe webhook handler — receives checkout.session.completed events
// and triggers Printful dropship fulfillment.

function getStripeForWebhook() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeForWebhook();

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[Merch Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  if (metadata.needs_dropship !== "true" || !metadata.printful_items) {
    console.log("[Merch Webhook] No dropship needed for session:", session.id);
    return NextResponse.json({ ok: true });
  }

  try {
    const printfulItems = JSON.parse(metadata.printful_items) as Array<{
      sync_variant_id: number;
      quantity: number;
      name: string;
    }>;

    const shipping = session.shipping_details;
    if (!shipping?.address) {
      console.error("[Merch Webhook] No shipping address on session:", session.id);
      return NextResponse.json({ error: "Missing shipping address" }, { status: 400 });
    }

    const addr = shipping.address;
    const payload: PrintfulOrderPayload = {
      external_id: session.id,
      recipient: {
        name: shipping.name ?? "Customer",
        address1: addr.line1 ?? "",
        address2: addr.line2 ?? undefined,
        city: addr.city ?? "",
        state_code: addr.state ?? "",
        country_code: addr.country ?? "US",
        zip: addr.postal_code ?? "",
        email: session.customer_details?.email ?? "",
      },
      items: printfulItems.map((item) => ({
        sync_variant_id: item.sync_variant_id,
        quantity: item.quantity,
      })),
    };

    console.log("[Merch Webhook] Creating Printful order:", {
      sessionId: session.id,
      recipient: `${payload.recipient.name}, ${payload.recipient.city}, ${payload.recipient.state_code}`,
      items: printfulItems.map((i) => `${i.name} x${i.quantity}`),
    });

    const result = await createDropshipOrder(payload, { confirm: true });

    if (!result.ok) {
      console.error("[Merch Webhook] Printful order failed:", result.error);
      return NextResponse.json({ error: "Printful order failed" }, { status: 502 });
    }

    console.log("[Merch Webhook] Printful order created:", result.data.id);
    return NextResponse.json({ ok: true, printfulOrderId: result.data.id });
  } catch (err) {
    console.error("[Merch Webhook] Error processing fulfillment:", err);
    return NextResponse.json({ error: "Fulfillment error" }, { status: 500 });
  }
}
