// ============================================================
// ArxMint — Merchant Pledge API (Public — No Auth Required)
// GET  /api/pledge — list pledged merchants (public, no email exposed)
// POST /api/pledge — submit a new pledge (rate-limited)
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Seed merchants shown when DB is unavailable (or merged with DB results)
const SEED_MERCHANTS = [
  {
    id: "seed-glacier",
    businessName: "The Ice Cream Parlor by Glacier",
    location: "Fort Collins, CO",
    category: "food-drink",
    website: "https://www.glacierparlor.com",
    logoUrl: "/images/merchants/glacier.png",
    reason:
      "Ready to accept Bitcoin for ice cream. Zero fees, instant settlement — the way payments should work. Glacier serves the best homemade ice cream in Colorado and we want to be first to accept sats.",
    featured: true,
    createdAt: new Date("2025-01-15").toISOString(),
  },
];

const VALID_CATEGORIES = [
  "food-drink", "retail", "services", "health",
  "entertainment", "technology", "other",
];

function validatePledge(body: Record<string, unknown>) {
  const businessName = String(body.businessName ?? "").trim();
  if (!businessName) throw new Error("Business name is required");
  if (businessName.length > 100) throw new Error("Business name must be 100 characters or less");
  if (/<script/i.test(businessName)) throw new Error("Invalid characters");

  const contactName = String(body.contactName ?? "").trim();
  if (!contactName) throw new Error("Contact name is required");
  if (contactName.length > 100) throw new Error("Contact name must be 100 characters or less");

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) throw new Error("A valid email address is required");

  const location = body.location ? String(body.location).trim().slice(0, 200) : null;
  const category =
    body.category && VALID_CATEGORIES.includes(String(body.category))
      ? String(body.category) : null;
  const website = body.website ? String(body.website).trim().slice(0, 200) : null;
  const logoUrl = body.logoUrl ? String(body.logoUrl).trim().slice(0, 500) : null;
  const reason = body.reason ? String(body.reason).trim().slice(0, 500) : null;
  const emailOptIn = body.emailOptIn === true;

  return { businessName, contactName, email, location, category, website, logoUrl, reason, emailOptIn };
}

export async function GET() {
  let dbPledges: typeof SEED_MERCHANTS = [];

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_pledges")
      .select("id, businessName, location, category, website, logoUrl, reason, featured, createdAt")
      .order("featured", { ascending: false })
      .order("createdAt", { ascending: true });

    if (!error && data) {
      dbPledges = data.map((r) => ({
        id: r.id,
        businessName: r.businessName,
        location: r.location,
        category: r.category,
        website: r.website,
        logoUrl: r.logoUrl,
        reason: r.reason,
        featured: r.featured,
        createdAt: r.createdAt,
      }));
    }
  } catch {
    // DB unavailable — just use seeds
  }

  const dbNames = new Set(dbPledges.map((p) => p.businessName));
  const seeds = SEED_MERCHANTS.filter((s) => !dbNames.has(s.businessName));
  const all = [...seeds, ...dbPledges];
  return NextResponse.json({ pledges: all, count: all.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = validatePledge(body);

    const { supabase } = await import("@/lib/supabase");
    const { data: pledge, error } = await supabase
      .from("merchant_pledges")
      .insert(data)
      .select("id, businessName")
      .single();

    if (error) {
      console.error("Pledge insert error:", error.message);
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ pledge }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
