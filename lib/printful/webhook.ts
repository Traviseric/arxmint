import { createHmac, timingSafeEqual } from "node:crypto";
import type { PrintfulWebhookEvent, PrintfulShipmentInfo, PrintfulConfig } from "./types";
import { resolveConfig } from "./client";

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  config?: Partial<PrintfulConfig>,
): { ok: boolean; mode: "verified" | "disabled" | "invalid" } {
  const resolved = resolveConfig(config);
  const secretKey = resolved.webhookSecretKey;

  if (!secretKey) {
    return { ok: true, mode: "disabled" };
  }

  if (!signatureHeader) {
    return { ok: false, mode: "invalid" };
  }

  const calculated = createHmac("sha256", Buffer.from(secretKey, "hex"))
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signatureHeader.toLowerCase(), "hex");
  const calcBuffer = Buffer.from(calculated, "hex");

  if (sigBuffer.length === 0 || calcBuffer.length === 0 || sigBuffer.length !== calcBuffer.length) {
    return { ok: false, mode: "invalid" };
  }

  const ok = timingSafeEqual(sigBuffer, calcBuffer);
  return { ok, mode: ok ? "verified" : "invalid" };
}

export function parseShipmentEvent(body: PrintfulWebhookEvent): PrintfulShipmentInfo | null {
  const eventType = body.type;
  if (eventType !== "package_shipped" && eventType !== "shipment_sent") {
    return null;
  }

  const order = body.data?.order;
  const shipment = body.data?.shipment;

  return {
    printfulOrderId: String(order?.id ?? ""),
    externalId: order?.external_id,
    trackingNumber: shipment?.tracking_number ?? "",
    trackingUrl: shipment?.tracking_url ?? "",
    carrier: shipment?.carrier ?? "",
  };
}

export function createWebhookHandler(handlers: {
  onShipped?: (info: PrintfulShipmentInfo) => Promise<void>;
  onFailed?: (orderId: string, reason: string) => Promise<void>;
  onCanceled?: (orderId: string) => Promise<void>;
  config?: Partial<PrintfulConfig>;
}) {
  return async function POST(request: Request) {
    const { NextResponse } = await import("next/server");

    try {
      const rawBody = await request.text();
      const signature = request.headers.get("x-pf-webhook-signature");
      const auth = verifyWebhookSignature(rawBody, signature, handlers.config);

      if (!auth.ok) {
        console.warn(`[Printful Webhook] Rejected (${auth.mode})`);
        return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }

      const body = JSON.parse(rawBody) as PrintfulWebhookEvent;
      console.log(`[Printful Webhook] Event: ${body.type}`);

      switch (body.type) {
        case "package_shipped":
        case "shipment_sent": {
          const info = parseShipmentEvent(body);
          if (info && handlers.onShipped) {
            await handlers.onShipped(info);
          }
          break;
        }
        case "order_failed": {
          const orderId = String(body.data?.order?.id ?? "");
          const reason = body.data?.reason ?? "unknown";
          console.error(`[Printful Webhook] Order ${orderId} FAILED: ${reason}`);
          if (handlers.onFailed) await handlers.onFailed(orderId, reason);
          break;
        }
        case "order_canceled": {
          const orderId = String(body.data?.order?.id ?? "");
          console.log(`[Printful Webhook] Order ${orderId} canceled`);
          if (handlers.onCanceled) await handlers.onCanceled(orderId);
          break;
        }
        default:
          console.log(`[Printful Webhook] Unhandled: ${body.type}`);
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[Printful Webhook] Error:", err);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  };
}
