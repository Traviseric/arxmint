// ============================================================
// ArxMint — Merchant Listings API
// GET  /api/merchants?communityId=xxx — list merchants for a community
// POST /api/merchants — create (persist) a merchant listing
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import {
  isCommunityOwnedByUser,
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";
import { validateCommunityName, errorResponse, errorStatus } from "@/lib/validation";
import { logger } from "@/lib/logger";

async function getUserIdOrAuthError(
  request: NextRequest
): Promise<string | NextResponse> {
  try {
    return await requireSessionUserId(request);
  } catch (error: unknown) {
    if (error instanceof SessionUserError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 503;
      return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status });
    }
    return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");

    if (communityId) {
      const owned = await isCommunityOwnedByUser(communityId, userId);
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const merchants = await db.merchant.findMany({
      where: communityId ? { communityId } : { community: { userId } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ merchants });
  } catch (error: unknown) {
    // DB not configured — return empty list so the UI degrades gracefully
    logger.warn("Could not fetch merchants from DB", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ merchants: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

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

    const owned = await isCommunityOwnedByUser(communityId, userId);
    if (!owned) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN_COMMUNITY" },
        { status: 403 }
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
