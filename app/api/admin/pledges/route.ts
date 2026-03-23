// ============================================================
// ArxMint — Admin Pledges API
// GET  /api/admin/pledges — list ALL merchant pledges (pending + approved)
// POST /api/admin/pledges — approve/reject/feature a pledge by ID
// Auth: Nostr NIP-98 admin pubkey OR X-Marketplace-Secret header
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthPubkey } from "@/lib/auth-middleware";

const ADMIN_PUBKEYS = new Set([
  "c56a311f60a2af124959057e90c7f329fba6a8132ef9cd2c126fe5ae0c90c4e3", // Travis
]);

const SHARED_SECRET = process.env.MARKETPLACE_SHARED_SECRET || "";

function isAuthorized(request: NextRequest): boolean {
  // Nostr NIP-98 admin auth
  const pubkey = getAuthPubkey(request);
  if (pubkey && ADMIN_PUBKEYS.has(pubkey)) return true;

  // Shared secret auth (for CLI / agent queries)
  const secret = request.headers.get("x-marketplace-secret");
  if (SHARED_SECRET && secret === SHARED_SECRET) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { supabase } = await import("@/lib/supabase");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "pending", "approved", or null (all)

    let query = supabase
      .from("merchant_pledges")
      .select("id, business_name, contact_name, email, location, category, website, logo_url, reason, email_opt_in, featured, approved, created_at")
      .order("created_at", { ascending: false });

    if (status === "pending") {
      query = query.eq("approved", false);
    } else if (status === "approved") {
      query = query.eq("approved", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/pledges] query failed:", error);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    const pledges = (data ?? []).map((r) => ({
      id: r.id,
      businessName: r.business_name,
      contactName: r.contact_name,
      email: r.email,
      location: r.location,
      category: r.category,
      website: r.website,
      logoUrl: r.logo_url ? (r.logo_url.startsWith("data:") ? "[data-uri-logo]" : r.logo_url) : null,
      hasLogo: !!r.logo_url,
      reason: r.reason,
      emailOptIn: r.email_opt_in,
      featured: r.featured,
      approved: r.approved,
      createdAt: r.created_at,
    }));

    const pending = pledges.filter((p) => !p.approved).length;
    const approved = pledges.filter((p) => p.approved).length;

    return NextResponse.json({
      pledges,
      total: pledges.length,
      pending,
      approved,
    });
  } catch (e) {
    console.error("[admin/pledges] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action } = body as { id?: string; action?: string };

    if (!id || !action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }

    const { supabase } = await import("@/lib/supabase");

    if (action === "approve") {
      const { error } = await supabase
        .from("merchant_pledges")
        .update({ approved: true })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "approved" });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("merchant_pledges")
        .update({ approved: false })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "rejected" });
    }

    if (action === "feature") {
      const { error } = await supabase
        .from("merchant_pledges")
        .update({ featured: true })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "featured" });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("merchant_pledges")
        .delete()
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "deleted" });
    }

    return NextResponse.json({ error: "Unknown action. Use: approve, reject, feature, delete" }, { status: 400 });
  } catch (e) {
    console.error("[admin/pledges] POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
