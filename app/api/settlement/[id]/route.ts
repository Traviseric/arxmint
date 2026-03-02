// ============================================================
// ArxMint — Settlement Status Endpoint
// GET /api/settlement/:id — check settlement status by transaction ID
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPubkey, requireAuth } from "@/lib/auth-middleware";
import {
  isCommunityOwnedByUser,
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

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

    let parsedNotes: Record<string, unknown> = {};
    try {
      parsedNotes = JSON.parse(tx.notes ?? "{}");
    } catch {
      /* ignore */
    }

    const callerPubkey = getAuthPubkey(request);
    const initiatedBy =
      typeof parsedNotes.initiatedBy === "string" ? parsedNotes.initiatedBy : null;

    let hasAccess = initiatedBy === callerPubkey;
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

    // Strip sensitive internal fields — never expose raw notes blob or federation invites
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
    console.warn("[ArxMint] Could not fetch settlement from DB:", message);
    return NextResponse.json(
      { error: "Settlement lookup failed — database may be unavailable" },
      { status: 503 }
    );
  }
}
