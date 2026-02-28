// ============================================================
// ArxMint — Payment API: Status
// GET /api/payment/status/:id
//
// Returns the status of a payment challenge:
//   pending  — created but not yet paid
//   paid     — verified and consumed
//   expired  — past the expiresAt timestamp
//
// Unauthenticated callers receive { status, expiresAt } only.
// Authenticated callers receive the full challenge details.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { _challenges } from "@/app/api/payment/route";
import { getCallerFromRequest } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
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

  // Minimal safe response — safe for unauthenticated callers (e.g. polling for payment status)
  const minimalResponse = {
    status,
    expiresAt: entry.challenge.expiresAt,
    ...(entry.paidAt && { paidAt: entry.paidAt }),
  };

  // Return full challenge details only to authenticated callers
  const caller = getCallerFromRequest(request);
  if (caller) {
    return NextResponse.json({ ...minimalResponse, challenge: entry.challenge });
  }

  return NextResponse.json(minimalResponse);
}
