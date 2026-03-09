// ============================================================
// ArxMint — Webhook Subscription API
// GET    /api/webhooks         — list subscriptions for merchant
// POST   /api/webhooks         — register a new subscription (Zapier subscribeHook)
//
// Auth: Authorization: Bearer arx_live_<token>
// Merchant ID is resolved from the API key via Supabase lookup.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  parseMerchantKey,
  type MerchantKeyScope,
} from "@/lib/merchant-auth";
import {
  registerWebhook,
  listWebhooks,
  type WebhookEvent,
} from "@/lib/webhook-engine";

const ALLOWED_EVENTS: WebhookEvent[] = [
  "payment.completed",
  "payment.expired",
  "payment.failed",
];

const MAX_WEBHOOKS_PER_MERCHANT = 10;

// ---- Auth helper ----

interface ResolvedKey {
  merchantId: string;
  scope: MerchantKeyScope;
}

async function resolveMerchantKey(req: NextRequest): Promise<ResolvedKey | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();

  const parsed = parseMerchantKey(key);
  if (!parsed) return null;

  // Look up merchant_id from Supabase by key
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_api_keys")
      .select("merchant_id, scope, expires_at")
      .eq("key", key)
      .single();
    if (error || !data) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
    return { merchantId: String(data.merchant_id), scope: parsed.scope };
  } catch {
    return null;
  }
}

// ---- GET /api/webhooks ----

export async function GET(req: NextRequest) {
  const resolved = await resolveMerchantKey(req);
  if (!resolved) {
    return NextResponse.json(
      { error: "Unauthorized — valid arx_live_* or arx_test_* API key required" },
      { status: 401 }
    );
  }

  try {
    const endpoints = await listWebhooks(resolved.merchantId);
    // Strip secret from list response
    const safeList = endpoints.map(({ id, url, events, active, createdAt }) => ({
      id,
      url,
      events,
      active,
      created_at: createdAt,
    }));
    return NextResponse.json({ webhooks: safeList });
  } catch {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
}

// ---- POST /api/webhooks ----

export async function POST(req: NextRequest) {
  const resolved = await resolveMerchantKey(req);
  if (!resolved) {
    return NextResponse.json(
      { error: "Unauthorized — valid arx_live_* or arx_test_* API key required" },
      { status: 401 }
    );
  }

  let body: { url?: unknown; events?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate URL
  const url = body.url;
  if (typeof url !== "string" || !url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "url must use HTTPS" },
      { status: 400 }
    );
  }

  // Validate events
  const rawEvents = body.events;
  let events: WebhookEvent[];
  if (rawEvents === undefined || rawEvents === null) {
    events = ["payment.completed"];
  } else if (!Array.isArray(rawEvents)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  } else {
    const invalid = rawEvents.filter(
      (e): boolean => !ALLOWED_EVENTS.includes(e as WebhookEvent)
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown event types: ${invalid.join(", ")}. Allowed: ${ALLOWED_EVENTS.join(", ")}`,
        },
        { status: 400 }
      );
    }
    events = rawEvents as WebhookEvent[];
  }

  // Rate limit: max 10 webhooks per merchant
  try {
    const existing = await listWebhooks(resolved.merchantId);
    if (existing.filter((e) => e.active).length >= MAX_WEBHOOKS_PER_MERCHANT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_WEBHOOKS_PER_MERCHANT} active webhook subscriptions per merchant` },
        { status: 429 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Register
  try {
    const endpoint = await registerWebhook(resolved.merchantId, url, events);
    // Return secret on creation only — it cannot be retrieved later
    return NextResponse.json(
      {
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        secret: endpoint.secret,
        created_at: endpoint.createdAt,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
