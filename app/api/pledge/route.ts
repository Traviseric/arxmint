// ============================================================
// ArxMint — Merchant Pledge API (Public — No Auth Required)
// GET  /api/pledge — list pledged merchants (public, no email exposed)
// POST /api/pledge — submit a new pledge (rate-limited)
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

async function notifyTelegram(pledge: { id: string; businessName: string }, data: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    const lines = [
      `🏪 *New Merchant Signup*`,
      ``,
      `*${String(data.businessName).replace(/[*_`[\]]/g, "")}*`,
      data.location ? `📍 ${data.location}` : "",
      data.category ? `🏷 ${data.category}` : "",
      data.website ? `🌐 ${data.website}` : "",
      data.contactName ? `👤 ${data.contactName}` : "",
      data.email ? `✉️ ${data.email}` : "",
      data.reason ? `\n💬 _${String(data.reason).replace(/[_*`[\]]/g, "")}_` : "\n⚠️ _No description provided_",
      data.logoUrl ? (String(data.logoUrl).startsWith("data:") ? "\n🖼 Logo uploaded" : `\n🖼 ${data.logoUrl}`) : "\n📷 No logo",
    ].filter(Boolean).join("\n");

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: lines,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve:${pledge.id}` },
            { text: "❌ Reject", callback_data: `reject:${pledge.id}` },
          ]],
        },
      }),
    });
  } catch (e) {
    console.error("Telegram notify failed:", e);
  }
}

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
    checkoutEnabled: true,
    defaultAmountSats: 500,
  },
  {
    id: "seed-teneo",
    businessName: "Teneo",
    location: "Fort Collins, CO",
    category: "technology",
    website: "https://www.teneo.pub",
    logoUrl: "/images/merchants/teneo.png",
    reason:
      "AI-powered book publishing platform. We accept Bitcoin for publishing services — zero fees, instant settlement, privacy by default.",
    featured: true,
    createdAt: new Date("2025-01-20").toISOString(),
    checkoutEnabled: true,
    defaultAmountSats: 1000,
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
  const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
  if (logoUrl && !logoUrl.startsWith("data:image/") && logoUrl.length > 500) {
    throw new Error("Logo URL must be 500 characters or less");
  }
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
      .select("id, businessName, location, category, website, logoUrl, reason, featured, createdAt, checkout_enabled, default_amount_sats")
      .eq("approved", true)
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
        checkoutEnabled: r.checkout_enabled ?? false,
        defaultAmountSats: r.default_amount_sats ?? null,
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

    // Fire-and-forget Telegram notification
    notifyTelegram(pledge, data);

    return NextResponse.json({ pledge }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
