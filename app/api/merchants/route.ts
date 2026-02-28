// ============================================================
// ArxMint — Merchant Listings API
// GET  /api/merchants?communityId=xxx — list merchants for a community
// POST /api/merchants — create (persist) a merchant listing
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import { validateCommunityName, errorResponse, errorStatus } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");

    const merchants = await db.merchant.findMany({
      where: communityId ? { communityId } : {},
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ merchants });
  } catch (error: any) {
    // DB not configured — return empty list so the UI degrades gracefully
    console.warn("Could not fetch merchants from DB:", error.message);
    return NextResponse.json({ merchants: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      communityId,
      name,
      description,
      category,
      cashuAddress,
      lightningAddress,
      // Extra fields stored in metadata
      location,
      paymentMethods,
      contactInfo,
    } = body;

    const validatedName = validateCommunityName(name);

    if (!communityId || typeof communityId !== "string") {
      return NextResponse.json(
        { error: "communityId is required", code: "VALIDATION_COMMUNITYID" },
        { status: 400 }
      );
    }

    const merchant = await db.merchant.create({
      data: {
        communityId,
        name: validatedName,
        description: description?.trim() ?? null,
        category: category ?? null,
        cashuAddress: cashuAddress ?? null,
        lightningAddress: lightningAddress ?? null,
        metadata: {
          location: location ?? null,
          paymentMethods: paymentMethods ?? [],
          contactInfo: contactInfo ?? null,
        },
      },
    });

    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error: unknown) {
    if (!(error instanceof Error) || error.name !== "ValidationError") {
      logger.error("POST /api/merchants error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json(errorResponse(error), { status: errorStatus(error) });
  }
}
