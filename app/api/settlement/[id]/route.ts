// ============================================================
// ArxMint — Settlement Status Endpoint
// GET /api/settlement/:id — check settlement status by transaction ID
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";
import {
  isCommunityOwnedByUser,
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Settlement ID is required" }, { status: 400 });
  }

  try {
    const tx = await db.transaction.findUnique({
      where: { id },
    });

    if (!tx) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    if (tx.type !== "settlement") {
      return NextResponse.json({ error: "Transaction is not a settlement" }, { status: 404 });
    }

    // Unauthenticated callers receive public fields only — no sensitive payment details
    const caller = getCallerFromRequest(request);
    if (!caller) {
      return NextResponse.json({
        settlementId: tx.id,
        status: tx.status,
        amount: tx.amount,
        createdAt: tx.timestamp.toISOString(),
      });
    }

    // Authenticated: parse notes and verify access before returning full details
    let parsedNotes: Record<string, unknown> = {};
    try {
      parsedNotes = JSON.parse(tx.notes ?? "{}");
    } catch (error: unknown) {
      logger.warn("Settlement notes parse failed", {
        settlementId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const initiatedBy =
      typeof parsedNotes.initiatedBy === "string" ? parsedNotes.initiatedBy : null;

    let hasAccess = initiatedBy === caller;
    if (!hasAccess) {
      try {
        const userId = await requireSessionUserId(request);
        hasAccess = await isCommunityOwnedByUser(tx.communityId, userId);
      } catch (error: unknown) {
        if (error instanceof SessionUserError && error.code === "UNAUTHENTICATED") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Authenticated + authorized: return full details, raw notes blob never exposed
    return NextResponse.json({
      settlementId: tx.id,
      saleId: parsedNotes.saleId ?? null,
      feeAmount: tx.amount,
      method: tx.backend,
      status: tx.status,
      counterparty: tx.counterparty ?? null,
      invoice: parsedNotes.invoice ?? null,
      mintUrl: parsedNotes.mintUrl ?? null,
      createdAt: tx.timestamp.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Could not fetch settlement from DB", { error: message });
    return NextResponse.json(
      { error: "Settlement lookup failed — database may be unavailable" },
      { status: 503 }
    );
  }
}
