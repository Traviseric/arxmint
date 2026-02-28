// ============================================================
// ArxMint — Payment API: Status
// GET /api/payment/status/:id
//
// Returns the status of a payment challenge:
//   pending  — created but not yet paid
//   paid     — verified and consumed
//   expired  — past the expiresAt timestamp
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { _challenges } from "@/app/api/payment/route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const entry = _challenges.get(id);

  if (!entry) {
    return NextResponse.json(
      { error: "Challenge not found or already expired" },
      { status: 404 }
    );
  }

  const now = Date.now();
  let status: "pending" | "paid" | "expired";

  if (entry.paidAt) {
    status = "paid";
  } else if (entry.challenge.expiresAt < now) {
    status = "expired";
    _challenges.delete(id);
  } else {
    status = "pending";
  }

  return NextResponse.json({
    status,
    challenge: entry.challenge,
    ...(entry.paidAt && { paidAt: entry.paidAt }),
  });
}
