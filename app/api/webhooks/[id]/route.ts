// ============================================================
// ArxMint — Webhook Subscription Item API
// DELETE /api/webhooks/:id — unregister a subscription (Zapier unsubscribeHook)
//
// Auth: Authorization: Bearer arx_live_<token>
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { parseMerchantKey } from "@/lib/merchant-auth";
import { deleteWebhook } from "@/lib/webhook-engine";
import type { MerchantKeyScope } from "@/lib/merchant-auth";

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

// ---- DELETE /api/webhooks/:id ----

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const resolved = await resolveMerchantKey(req);
  if (!resolved) {
    return NextResponse.json(
      { error: "Unauthorized — valid arx_live_* or arx_test_* API key required" },
      { status: 401 }
    );
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Webhook ID is required" }, { status: 400 });
  }

  try {
    const deleted = await deleteWebhook(id, resolved.merchantId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Webhook not found or does not belong to this merchant" },
        { status: 404 }
      );
    }
    return NextResponse.json({ deleted: true, id });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
