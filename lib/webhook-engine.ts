// ============================================================
// ArxMint — Webhook Engine
// Push notifications for payment events (Phase 5, T09)
//
// Delivery pattern:
//   1. Payment completes → deliverWebhook() called
//   2. POST to merchant URL with ArxMint-Signature header
//   3. Retry on non-2xx: 5s → 30s → 5min (exponential backoff, 3 attempts)
//
// Signature format (Stripe-compatible):
//   ArxMint-Signature: t=<unix_ts>,v1=<hmac_sha256_hex>
//   Payload signed: `${timestamp}.${JSON.stringify(payload)}`
// ============================================================

import { createHmac, randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

// ---- Types ----

export type WebhookEvent =
  | "payment.completed"
  | "payment.expired"
  | "payment.failed";

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  secret: string; // HMAC signing secret (random, per-endpoint)
  events: WebhookEvent[];
  active: boolean;
  createdAt: number;
}

export interface WebhookPayload {
  id: string; // webhook delivery ID
  event: WebhookEvent;
  created: number; // unix timestamp (seconds)
  data: {
    paymentId: string;
    amount: number; // sats
    merchantId: string;
    metadata?: Record<string, unknown>;
  };
}

export interface DeliveryResult {
  success: boolean;
  attempts: number;
  lastStatus?: number;
  error?: string;
}

// ---- In-memory store ----
// Production: mirror to Supabase via persistWebhook / loadWebhooks.

const _endpointStore = new Map<string, WebhookEndpoint>();

// ---- Signing ----

/**
 * Sign a webhook payload using per-endpoint secret.
 * Returns Stripe-compatible header value: `t=<ts>,v1=<hmac>`
 */
export function buildWebhookSignature(
  payload: WebhookPayload,
  secret: string
): string {
  const timestamp = payload.created;
  const body = JSON.stringify(payload);
  const signed = `${timestamp}.${body}`;
  const hmac = createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verify an inbound ArxMint-Signature header against a known secret.
 * Tolerates up to 5 minutes of clock skew.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300
): boolean {
  const tMatch = signatureHeader.match(/t=(\d+)/);
  const v1Match = signatureHeader.match(/v1=([a-f0-9]+)/);
  if (!tMatch || !v1Match) return false;

  const timestamp = parseInt(tMatch[1], 10);
  if (isNaN(timestamp)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const signed = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");

  // Constant-time comparison
  if (expected.length !== v1Match[1].length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v1Match[1].charCodeAt(i);
  }
  return diff === 0;
}

// ---- Registration ----

/**
 * Register a new webhook endpoint for a merchant.
 * Generates a unique secret per endpoint — merchant must store it.
 */
export async function registerWebhook(
  merchantId: string,
  url: string,
  events: WebhookEvent[]
): Promise<WebhookEndpoint> {
  const endpoint: WebhookEndpoint = {
    id: `wh_${randomBytes(12).toString("hex")}`,
    merchantId,
    url,
    secret: `whsec_${randomBytes(24).toString("base64url")}`,
    events,
    active: true,
    createdAt: Date.now(),
  };
  _endpointStore.set(endpoint.id, endpoint);
  await _persistEndpoint(endpoint);
  return endpoint;
}

/**
 * List all active webhook endpoints for a merchant.
 */
export async function listWebhooks(merchantId: string): Promise<WebhookEndpoint[]> {
  const inMemory = Array.from(_endpointStore.values()).filter(
    (e) => e.merchantId === merchantId
  );

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("merchant_id", merchantId);
    if (error || !data) return inMemory;

    const dbEndpoints: WebhookEndpoint[] = data.map(_rowToEndpoint);
    const dbIds = new Set(dbEndpoints.map((e) => e.id));
    const onlyMemory = inMemory.filter((e) => !dbIds.has(e.id));
    return [...dbEndpoints, ...onlyMemory];
  } catch {
    return inMemory;
  }
}

/**
 * Deactivate and remove a webhook endpoint.
 */
export async function deleteWebhook(
  id: string,
  merchantId: string
): Promise<boolean> {
  const local = _endpointStore.get(id);
  if (local && local.merchantId !== merchantId) return false;
  _endpointStore.delete(id);

  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase
      .from("webhook_endpoints")
      .delete()
      .eq("id", id)
      .eq("merchant_id", merchantId);
  } catch {
    // In-memory removal is sufficient if DB unavailable
  }
  return true;
}

// ---- Delivery ----

const RETRY_DELAYS_MS = [5_000, 30_000, 300_000]; // 5s, 30s, 5min

/**
 * Deliver a webhook to an endpoint with exponential backoff retry.
 * Returns true if delivery succeeded within 3 attempts.
 */
export async function deliverWebhook(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<DeliveryResult> {
  if (!endpoint.active) {
    return { success: false, attempts: 0, error: "Endpoint is inactive" };
  }
  if (!endpoint.events.includes(payload.event)) {
    return { success: true, attempts: 0 }; // Not subscribed — skip silently
  }

  const body = JSON.stringify(payload);
  const signature = buildWebhookSignature(payload, endpoint.secret);
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await _sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ArxMint-Signature": signature,
          "ArxMint-Webhook-Id": payload.id,
          "ArxMint-Webhook-Event": payload.event,
        },
        body,
      });
      lastStatus = res.status;
      if (res.ok) {
        logger.info("webhook_delivered", {
          action: "webhook_delivered",
          webhookId: payload.id,
          endpointId: endpoint.id,
          attempt: attempt + 1,
          status: res.status,
        });
        return { success: true, attempts: attempt + 1, lastStatus: res.status };
      }
      logger.warn("webhook_delivery_failed", {
        action: "webhook_delivery_attempt_failed",
        webhookId: payload.id,
        endpointId: endpoint.id,
        attempt: attempt + 1,
        status: res.status,
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn("webhook_delivery_error", {
        action: "webhook_delivery_network_error",
        webhookId: payload.id,
        endpointId: endpoint.id,
        attempt: attempt + 1,
        error: lastError,
      });
    }
  }

  return {
    success: false,
    attempts: 3,
    lastStatus,
    error: lastError ?? `HTTP ${lastStatus}`,
  };
}

/**
 * Fire-and-forget: deliver a payment.completed webhook to all active endpoints
 * subscribed to that event for the given merchant.
 *
 * Returns immediately — delivery happens asynchronously (use in API routes).
 */
export function triggerPaymentWebhooks(
  merchantId: string,
  paymentId: string,
  amountSats: number,
  event: WebhookEvent = "payment.completed",
  metadata?: Record<string, unknown>
): void {
  const payload: WebhookPayload = {
    id: `wdlv_${randomBytes(10).toString("hex")}`,
    event,
    created: Math.floor(Date.now() / 1000),
    data: { paymentId, amount: amountSats, merchantId, metadata },
  };

  // Resolve endpoints and deliver asynchronously
  listWebhooks(merchantId)
    .then((endpoints) => {
      const active = endpoints.filter((e) => e.active && e.events.includes(event));
      return Promise.allSettled(active.map((ep) => deliverWebhook(ep, payload)));
    })
    .catch((err) => {
      logger.warn("webhook_trigger_error", {
        action: "webhook_trigger_error",
        merchantId,
        paymentId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}

// ---- Persistence helpers ----

async function _persistEndpoint(endpoint: WebhookEndpoint): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("webhook_endpoints").upsert({
      id: endpoint.id,
      merchant_id: endpoint.merchantId,
      url: endpoint.url,
      secret: endpoint.secret,
      events: endpoint.events,
      active: endpoint.active,
      created_at: endpoint.createdAt,
    });
  } catch {
    // Supabase unavailable — in-memory only
  }
}

function _rowToEndpoint(row: Record<string, unknown>): WebhookEndpoint {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    url: String(row.url),
    secret: String(row.secret),
    events: (row.events as string[]) as WebhookEvent[],
    active: Boolean(row.active),
    createdAt: Number(row.created_at),
  };
}

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
