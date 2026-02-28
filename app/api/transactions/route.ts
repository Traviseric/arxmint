// ============================================================
// ArxMint — Transaction Ledger API
// POST /api/transactions — record a transaction
// GET  /api/transactions?communityId=xxx&limit=50 — fetch history
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    const transactions = await db.transaction.findMany({
      where: communityId ? { communityId } : {},
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    // DB not configured — return empty list so UI degrades gracefully
    console.warn("Could not fetch transactions from DB:", error.message);
    return NextResponse.json({ transactions: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      communityId,
      type,
      amount,
      backend,
      status = "completed",
      counterparty,
      proofData,
    } = body;

    if (!communityId || typeof communityId !== "string") {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }

    const validTypes = ["send", "receive", "swap"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "type must be send | receive | swap" }, { status: 400 });
    }

    const validBackends = ["cashu", "lightning", "fedimint"];
    if (!validBackends.includes(backend)) {
      return NextResponse.json(
        { error: "backend must be cashu | lightning | fedimint" },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.create({
      data: {
        communityId,
        type,
        amount: Math.round(amount ?? 0),
        backend,
        status,
        counterparty: counterparty ?? null,
        proofData: proofData ?? undefined,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    console.error("[ArxMint] POST /api/transactions error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
