import { createWebhookHandler } from "@/lib/printful/webhook";
import type { PrintfulShipmentInfo } from "@/lib/printful/types";

// Printful webhook — receives shipment events and logs tracking info.
// Register this URL in Printful dashboard: https://arxmint.com/api/webhooks/printful

async function onShipped(info: PrintfulShipmentInfo) {
  console.log("[Printful] Package shipped:", {
    orderId: info.printfulOrderId,
    externalId: info.externalId,
    tracking: info.trackingNumber,
    trackingUrl: info.trackingUrl,
    carrier: info.carrier,
  });

  // Update order status in Supabase if we have an external ID (Stripe session ID or ArxMint session ID)
  if (info.externalId) {
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase
        .from("checkout_sessions")
        .update({
          fulfillment_status: "shipped",
          tracking_number: info.trackingNumber,
          tracking_url: info.trackingUrl,
          carrier: info.carrier,
        })
        .eq("id", info.externalId);
    } catch (err) {
      // DB update is best-effort — don't fail the webhook
      console.warn("[Printful] Failed to update session:", err);
    }
  }
}

async function onFailed(orderId: string, reason: string) {
  console.error("[Printful] Order failed:", orderId, reason);
  // TODO: alert via MarketingOS or email
}

async function onCanceled(orderId: string) {
  console.log("[Printful] Order canceled:", orderId);
}

export const POST = createWebhookHandler({
  onShipped,
  onFailed,
  onCanceled,
});
