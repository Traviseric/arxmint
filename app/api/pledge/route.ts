// ============================================================
// ArxMint — Merchant Pledge API (Public — No Auth Required)
// GET  /api/pledge — list pledged merchants (public, no email exposed)
// POST /api/pledge — submit a new pledge (rate-limited)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, errorResponse, errorStatus } from "@/lib/validation";
import { logger } from "@/lib/logger";

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
  "food-drink",
  "retail",
  "services",
  "health",
  "entertainment",
  "technology",
  "other",
];

function validatePledge(body: Record<string, unknown>) {
  const businessName = String(body.businessName ?? "").trim();
  if (!businessName || businessName.length === 0)
    throw new ValidationError("businessName", "Business name is required");
  if (businessName.length > 100)
    throw new ValidationError("businessName", "Business name must be 100 characters or less");
  if (/<script/i.test(businessName))
    throw new ValidationError("businessName", "Invalid characters");

  const contactName = String(body.contactName ?? "").trim();
  if (!contactName || contactName.length === 0)
    throw new ValidationError("contactName", "Contact name is required");
  if (contactName.length > 100)
    throw new ValidationError("contactName", "Contact name must be 100 characters or less");

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email))
    throw new ValidationError("email", "A valid email address is required");

  const location = body.location ? String(body.location).trim().slice(0, 200) : null;
  const category =
    body.category && VALID_CATEGORIES.includes(String(body.category))
      ? String(body.category)
      : null;
  const website = body.website ? String(body.website).trim().slice(0, 200) : null;
  const logoUrl = body.logoUrl ? String(body.logoUrl).trim().slice(0, 500) : null;
  const reason = body.reason ? String(body.reason).trim().slice(0, 500) : null;
  const emailOptIn = body.emailOptIn === true;

  return { businessName, contactName, email, location, category, website, logoUrl, reason, emailOptIn };
}

export async function GET() {
  try {
    const pledges = await db.merchantPledge.findMany({
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        businessName: true,
        location: true,
        category: true,
        website: true,
        logoUrl: true,
        reason: true,
        featured: true,
        createdAt: true,
        // NOTE: email and contactName intentionally excluded (private)
      },
    });

    // Merge seed merchants with DB results (avoid duplicates by name)
    const dbNames = new Set(pledges.map((p: { businessName: string }) => p.businessName));
    const seeds = SEED_MERCHANTS.filter((s) => !dbNames.has(s.businessName));
    const all = [...seeds, ...pledges];
    return NextResponse.json({ pledges: all, count: all.length });
  } catch (error: unknown) {
    logger.warn("GET /api/pledge — DB unavailable, returning seed merchants", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ pledges: SEED_MERCHANTS, count: SEED_MERCHANTS.length });
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 pledges per IP per hour
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`pledge:${ip}`, { windowMs: 3_600_000, maxRequests: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  try {
    const body = await request.json();
    const data = validatePledge(body);

    const pledge = await db.merchantPledge.create({ data });

    logger.info("New merchant pledge", {
      action: "pledge.create",
      pledgeId: pledge.id,
      businessName: pledge.businessName,
      location: pledge.location,
    });

    return NextResponse.json(
      { pledge: { id: pledge.id, businessName: pledge.businessName } },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (!(error instanceof ValidationError)) {
      logger.error("POST /api/pledge error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json(errorResponse(error), { status: errorStatus(error) });
  }
}
