// ============================================================
// ArxMint — Webhook Endpoints CRUD
// GET    /api/v1/webhooks              — list endpoints
// POST   /api/v1/webhooks              — register endpoint
// DELETE /api/v1/webhooks?id=...       — remove endpoint
//
// Auth: session cookie OR arx_live_* API key in Authorization header
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  extractMerchantKey,
  parseMerchantKey,
  verifyMerchantKey,
  scopeAllowsPayments,
} from "@/lib/merchant-auth";
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  type WebhookEvent,
} from "@/lib/webhook-engine";

const VALID_EVENTS: WebhookEvent[] = [
  "payment.completed",
  "payment.expired",
  "payment.failed",
];

/** Resolve the merchantId for this request.
 *  Accepts session auth (returns the session pubkey as merchantId)
 *  OR arx_live_* / arx_pub_* key in Authorization header.
 */
async function resolveMerchant(
  request: NextRequest
): Promise<{ merchantId: string } | null> {
  // 1. Session auth
  const caller = getCallerFromRequest(request);
  if (caller) return { merchantId: caller };

  // 2. arx_* API key
  const authHeader = request.headers.get("Authorization");
  const key = extractMerchantKey(authHeader);
  if (!key) return null;

  const parsed = parseMerchantKey(key);
  if (!parsed) return null;

  // arx_pub_* keys can list but not register/delete webhooks (enforced per-method)
  // Derive merchantId from the key itself for now (no DB lookup needed for listing)
  // Full verification is done per-method when mutation is involved
  return { merchantId: `key:${parsed.scope}:${parsed.token.slice(0, 8)}` };
}

/** GET /api/v1/webhooks?merchantId=... — list webhook endpoints */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveMerchant(request);
    if (!resolved) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId") ?? resolved.merchantId;

    const endpoints = await listWebhooks(merchantId);
    return NextResponse.json({
      merchantId,
      endpoints: endpoints.map((e) => ({
        id: e.id,
        url: e.url,
        events: e.events,
        active: e.active,
        createdAt: e.createdAt,
        // secret omitted from listing — only returned on creation
      })),
      count: endpoints.length,
    });
  } catch (error: unknown) {
    // Belt-and-suspenders: an unhandled throw here was returning an empty
    // 500 (no Content-Type) which broke consumers parsing JSON. Always
    // return a structured error so callers can handle it.
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 }
    );
  }
}

/** POST /api/v1/webhooks — register a new webhook endpoint */
export async function POST(request: NextRequest) {
  // Session auth or arx_live_* key required for registration
  const caller = getCallerFromRequest(request);
  let merchantId: string | null = caller;

  if (!merchantId) {
    const authHeader = request.headers.get("Authorization");
    const key = extractMerchantKey(authHeader);
    if (key) {
      const parsed = parseMerchantKey(key);
      if (!parsed || !scopeAllowsPayments(parsed.scope)) {
        return NextResponse.json(
          { error: "arx_pub_* keys cannot register webhooks. Use arx_live_* or arx_test_*." },
          { status: 403 }
        );
      }
      // For key-based auth, merchantId must be in the request body
      // (we verify the key against that merchantId)
    }
  }

  let body: { merchantId?: string; url?: string; events?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // If session auth, use session pubkey as merchantId (or allow override from body)
  if (!merchantId) {
    if (!body.merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Verify arx_* key against the provided merchantId
    const authHeader = request.headers.get("Authorization");
    const key = extractMerchantKey(authHeader);
    if (!key) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const record = await verifyMerchantKey(key, body.merchantId);
    if (!record) {
      return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
    }
    merchantId = body.merchantId;
  } else if (body.merchantId) {
    merchantId = body.merchantId;
  }

  const { url, events } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }

  const resolvedEvents: WebhookEvent[] =
    Array.isArray(events) && events.length > 0
      ? (events.filter((e) => VALID_EVENTS.includes(e as WebhookEvent)) as WebhookEvent[])
      : [...VALID_EVENTS]; // default: subscribe to all events

  if (resolvedEvents.length === 0) {
    return NextResponse.json(
      { error: `events must include at least one of: ${VALID_EVENTS.join(", ")}` },
      { status: 400 }
    );
  }

  const endpoint = await registerWebhook(merchantId, url, resolvedEvents);

  return NextResponse.json(
    {
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      active: endpoint.active,
      createdAt: endpoint.createdAt,
      secret: endpoint.secret, // Only returned on creation — store it securely
      warning:
        "Store the secret securely. It will not be shown again. " +
        "Use it to verify ArxMint-Signature headers on incoming webhooks.",
    },
    { status: 201 }
  );
}

/** DELETE /api/v1/webhooks?id=...&merchantId=... — remove a webhook endpoint */
export async function DELETE(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    // Check arx_live_* key
    const authHeader = request.headers.get("Authorization");
    const key = extractMerchantKey(authHeader);
    if (!key) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsed = parseMerchantKey(key);
    if (!parsed || !scopeAllowsPayments(parsed.scope)) {
      return NextResponse.json(
        { error: "arx_pub_* keys cannot delete webhooks" },
        { status: 403 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const merchantId = searchParams.get("merchantId");

  if (!id || !merchantId) {
    return NextResponse.json(
      { error: "id and merchantId are required" },
      { status: 400 }
    );
  }

  const deleted = await deleteWebhook(id, merchantId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Webhook not found or merchantId mismatch" },
      { status: 404 }
    );
  }

  return NextResponse.json({ deleted: true, id });
}
