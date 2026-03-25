// ============================================================
// ArxMint — Merchant Pledge API (Public — No Auth Required)
// GET  /api/pledge — list pledged merchants (public, no email exposed)
// POST /api/pledge — submit a new pledge (rate-limited)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthPubkey } from "@/lib/auth-middleware";

function cuid(): string {
  return "c" + randomBytes(12).toString("hex");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin pubkeys (hex) — users who see pipeline merchants
const ADMIN_PUBKEYS = new Set([
  "c56a311f60a2af124959057e90c7f329fba6a8132ef9cd2c126fe5ae0c90c4e3", // Travis
]);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";

async function notifyTelegram(pledge: { id: string; businessName: string }, data: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    const esc = (s: string) => s.replace(/[*_`[\]]/g, "");
    const lines = [
      `🏪 *New Merchant Signup*`,
      ``,
      `*${esc(String(data.businessName))}*`,
      data.location ? `📍 ${data.location}` : "",
      data.category ? `🏷 ${data.category}` : "",
      data.website ? `🌐 ${data.website}` : "",
      data.contactName ? `👤 ${data.contactName}` : "",
      data.email ? `✉️ ${data.email}` : "",
      data.reason ? `\n💬 _${esc(String(data.reason))}_` : "\n⚠️ _No description provided_",
      data.logoUrl ? "\n🖼 Logo attached below" : "\n📷 No logo provided",
    ].filter(Boolean).join("\n");

    const inlineKeyboard = {
      inline_keyboard: [[
        { text: "✅ Approve", callback_data: `approve:${pledge.id}` },
        { text: "❌ Reject", callback_data: `reject:${pledge.id}` },
      ]],
    };

    // If logo is a data URI, send it as a photo first so admin can see it
    const logoUrl = data.logoUrl ? String(data.logoUrl) : "";
    if (logoUrl.startsWith("data:image/")) {
      try {
        const [header, b64] = logoUrl.split(",");
        const mimeMatch = header.match(/data:(image\/\w+)/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const ext = mime.split("/")[1] || "png";
        const buf = Buffer.from(b64, "base64");

        const boundary = "----ArxMintLogo" + Date.now();
        const parts = [
          `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_ADMIN_CHAT_ID}`,
          `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n🖼 Logo for ${esc(String(data.businessName))}`,
          `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="logo.${ext}"\r\nContent-Type: ${mime}\r\n\r\n`,
        ];

        const preBuf = Buffer.from(parts.join("\r\n") + "\r\n");
        const postBuf = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = Buffer.concat([preBuf, buf, postBuf]);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
          body,
        });
      } catch (e) {
        console.error("Telegram logo upload failed:", e);
      }
    }

    // Send the text message with approve/reject buttons
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: lines,
        parse_mode: "Markdown",
        reply_markup: inlineKeyboard,
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
    id: "seed-black-bear",
    businessName: "Black Bear Window Cleaning",
    location: "Boulder, Colorado",
    category: "services",
    website: "https://www.blackbearwindowcleaning.com",
    logoUrl: "/images/merchants/black-bear.png",
    reason:
      "Professional window cleaning serving Boulder and the Front Range. Black Bear Window Cleaning is joining the ArxMint network to accept Bitcoin payments — zero processing fees, instant settlement, full sovereignty over every transaction.",
    featured: true,
    createdAt: new Date("2026-03-20").toISOString(),
    checkoutEnabled: false,
    defaultAmountSats: 0,
  },
  {
    id: "seed-teneo",
    businessName: "Teneo",
    location: "Boulder, Colorado",
    category: "technology",
    website: "https://teneo.io",
    logoUrl: "/images/merchants/teneo.png",
    reason:
      "AI-powered publishing and agent commerce. Teneo is the first platform where AI agents and humans share the same Bitcoin payment rails — agents sell data and compute via L402 paywalls, creators sell books and courses, all settled instantly in sats with zero platform fees.",
    featured: true,
    createdAt: new Date("2025-01-20").toISOString(),
    checkoutEnabled: true,
    defaultAmountSats: 1000,
  },
];

// Ecosystem merchants — logos ready, hidden until first real transaction.
// To activate: move entry from PIPELINE_MERCHANTS into SEED_MERCHANTS above.
const PIPELINE_MERCHANTS = [
  { id: "seed-image-engine", businessName: "Image Engine", location: "Fort Collins, CO", category: "technology", website: "https://image-engine.app", logoUrl: "/images/merchants/image-engine.png", reason: "AI image generation for book covers, logos, avatars, and marketing campaigns. Pay per image with Lightning.", defaultAmountSats: 500 },
  { id: "seed-conversos", businessName: "Conversos", location: "Fort Collins, CO", category: "technology", website: "https://conversos.app", logoUrl: "/images/merchants/conversos.png", reason: "AI chat intelligence with personality-aware routing. Pay per session via Lightning.", defaultAmountSats: 100 },
  { id: "seed-profileengine", businessName: "ProfileEngine", location: "Fort Collins, CO", category: "technology", website: "https://profileengine.app", logoUrl: "/images/merchants/profileengine.png", reason: "5-layer psychological analysis from text. Pay per analysis with Lightning.", defaultAmountSats: 1000 },
  { id: "seed-trendos", businessName: "TrendOS", location: "Fort Collins, CO", category: "technology", website: "https://trend-os.io", logoUrl: "/images/merchants/trendos.png", reason: "AI trend intelligence — keyword research, grant discovery, opportunity alerts. Pay per report via Lightning.", defaultAmountSats: 1000 },
  { id: "seed-marketingos", businessName: "MarketingOS", location: "Fort Collins, CO", category: "technology", website: "https://marketingos.app", logoUrl: "/images/merchants/marketingos.png", reason: "AI marketing automation — email campaigns, social calendars, lead scoring. Pay per campaign via Lightning.", defaultAmountSats: 2000 },
  { id: "seed-analyticsos", businessName: "AnalyticsOS", location: "Fort Collins, CO", category: "technology", website: "https://analyticsos.io", logoUrl: "/images/merchants/analyticsos.png", reason: "Behavioral web analytics with bot detection. Pay per report via Lightning.", defaultAmountSats: 1000 },
  { id: "seed-detection-lab", businessName: "Detection Lab", location: "Fort Collins, CO", category: "technology", website: "https://detectionlab.app", logoUrl: "/images/merchants/detection-lab.png", reason: "25-signal behavioral biometrics and bot detection scoring engine. Pay per session via Lightning.", defaultAmountSats: 5000 },
  { id: "seed-formforge", businessName: "FormForge", location: "Fort Collins, CO", category: "technology", website: "https://formforge.app", logoUrl: "/images/merchants/formforge.png", reason: "Drop-in form API with AI spam detection. Pay per form via Lightning.", defaultAmountSats: 500 },
  { id: "seed-domainos", businessName: "DomainOS", location: "Fort Collins, CO", category: "technology", website: "https://domainos.app", logoUrl: "/images/merchants/domainos.png", reason: "AI domain intelligence — search, valuation, trademark checking. Pay per search via Lightning.", defaultAmountSats: 500 },
  { id: "seed-faviforge", businessName: "FaviForge", location: "Fort Collins, CO", category: "technology", website: "https://faviforge.app", logoUrl: "/images/merchants/faviforge.png", reason: "AI favicon generator with iterative self-correction. Pay per icon via Lightning.", defaultAmountSats: 200 },
  { id: "seed-video-engine", businessName: "Video Engine", location: "Fort Collins, CO", category: "entertainment", website: "https://video-engine.app", logoUrl: "/images/merchants/video-engine.png", reason: "12-stage AI video production pipeline. Pay per video via Lightning.", defaultAmountSats: 10000 },
  { id: "seed-audio-engine", businessName: "Audio Engine", location: "Fort Collins, CO", category: "entertainment", website: "https://audio-engine.app", logoUrl: "/images/merchants/audio-engine.png", reason: "AI audio production — voiceovers, podcast editing, music production. Pay per clip via Lightning.", defaultAmountSats: 5000 },
  { id: "seed-revenue-engine", businessName: "RevenueEngine", location: "Fort Collins, CO", category: "technology", website: "https://revenueengine.app", logoUrl: "/images/merchants/revenue-engine.png", reason: "Cross-service revenue intelligence and orchestration. Pay per analysis via Lightning.", defaultAmountSats: 2000 },
];

// Suppress unused-variable lint — PIPELINE_MERCHANTS is a ready-to-activate registry
void PIPELINE_MERCHANTS;

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
  const referredBy = body.referredBy ? String(body.referredBy).trim().toUpperCase().slice(0, 12) : null;

  return { businessName, contactName, email, location, category, website, logoUrl, reason, emailOptIn, referredBy };
}

export async function GET(request: NextRequest) {
  const pubkey = getAuthPubkey(request);
  const showPipeline = pubkey !== null && ADMIN_PUBKEYS.has(pubkey);

  let dbPledges: typeof SEED_MERCHANTS = [];

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_pledges")
      .select("id, business_name, location, category, website, logo_url, reason, featured, created_at")
      .eq("approved", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      dbPledges = data.map((r) => ({
        id: r.id,
        businessName: r.business_name,
        location: r.location,
        category: r.category,
        website: r.website,
        logoUrl: r.logo_url,
        reason: r.reason,
        featured: r.featured,
        createdAt: r.created_at,
        checkoutEnabled: false,
        defaultAmountSats: 0,
      }));
    }
  } catch {
    // DB unavailable — just use seeds
  }

  const dbNames = new Set(dbPledges.map((p) => p.businessName));
  const seeds = SEED_MERCHANTS.filter((s) => !dbNames.has(s.businessName));
  const all = [...seeds, ...dbPledges];

  // Admin view: append pipeline merchants (marked for grayed-out display)
  if (showPipeline) {
    const pipelineNames = new Set(all.map((p) => p.businessName));
    const pending = PIPELINE_MERCHANTS
      .filter((p) => !pipelineNames.has(p.businessName))
      .map((p) => ({
        ...p,
        featured: false,
        createdAt: new Date("2025-02-01").toISOString(),
        checkoutEnabled: false,
        pipeline: true,
      }));
    return NextResponse.json({ pledges: [...all, ...pending], count: all.length, pipelineCount: pending.length });
  }

  return NextResponse.json({ pledges: all, count: all.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = validatePledge(body);
    const { referredBy, ...pledgeData } = data;

    const { supabase } = await import("@/lib/supabase");

    // First 20 merchants get "Founding Merchant" status
    const FOUNDING_MERCHANT_CAP = 20;
    let isFounding = false;
    try {
      const { count } = await supabase
        .from("merchant_pledges")
        .select("id", { count: "exact", head: true })
        .eq("approved", true);
      isFounding = (count ?? 0) + SEED_MERCHANTS.length < FOUNDING_MERCHANT_CAP;
    } catch {
      // If count fails, still allow signup — just won't auto-feature
    }

    const { data: pledge, error } = await supabase
      .from("merchant_pledges")
      .insert({
        id: cuid(),
        business_name: pledgeData.businessName,
        contact_name: pledgeData.contactName,
        email: pledgeData.email,
        location: pledgeData.location,
        category: pledgeData.category,
        website: pledgeData.website,
        logo_url: pledgeData.logoUrl,
        reason: pledgeData.reason,
        email_opt_in: pledgeData.emailOptIn,
        approved: true,
        featured: isFounding,
      })
      .select("id, business_name")
      .single();

    if (error) {
      console.error("[pledge] insert failed:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
    }

    // Email notification stub — replace with Resend/SendGrid when ready
    console.log(`[arxmint] New self-registration: ${data.businessName} <${data.email}> → notify travis@arxmint.com`);

    // Fire-and-forget Telegram notification
    notifyTelegram({ id: pledge.id, businessName: pledge.business_name }, data);

    return NextResponse.json({ pledge: { id: pledge.id, businessName: pledge.business_name } }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
