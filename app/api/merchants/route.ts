// ============================================================
// ArxMint — Merchant Listings API
// GET  /api/merchants?communityId=xxx — list merchants for a community
// POST /api/merchants — create (persist) a merchant listing
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!communityId || typeof communityId !== "string") {
      return NextResponse.json(
        { error: "communityId is required" },
        { status: 400 }
      );
    }

    const merchant = await db.merchant.create({
      data: {
        communityId,
        name: name.trim(),
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
  } catch (error: any) {
    console.warn("Could not save merchant to DB:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to save merchant" },
      { status: 500 }
    );
  }
}
