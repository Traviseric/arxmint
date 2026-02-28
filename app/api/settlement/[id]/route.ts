// ============================================================
// ArxMint — Settlement Status Endpoint
// GET /api/settlement/:id — check settlement status by transaction ID
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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
      notes: parsedNotes,
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
