// ============================================================
// ArxMint — Payment API: Verify Proof
// POST /api/payment/verify
//
// Verifies an L402 token (macaroon + preimage) or Cashu ecash token.
// On success, marks the challenge as paid in the registry.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  verifyL402Token,
  verifyCashuPayment,
} from "@/lib/payment-sdk";
import { _challenges } from "@/app/api/payment/route";

export async function POST(request: NextRequest) {
  let body: {
    type?: unknown;
    macaroon?: unknown;
    preimage?: unknown;
    token?: unknown;
    mintUrl?: unknown;
    expectedAmount?: unknown;
    challengeId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = String(body.type ?? "");

  if (type === "l402") {
    const macaroon = String(body.macaroon ?? "");
    const preimage = String(body.preimage ?? "");

    if (!macaroon || !preimage) {
      return NextResponse.json(
        { error: "macaroon and preimage are required for L402 verification" },
        { status: 400 }
      );
    }

    const result = await verifyL402Token({ macaroon, preimage });

    if (result.success) {
      // Mark the challenge as paid in the registry
      const entry = _challenges.get(macaroon);
      if (entry) {
        _challenges.set(macaroon, { ...entry, paidAt: Date.now() });
      }
    }

    return NextResponse.json({
      success: result.success,
      type: "l402",
      ...(result.error && { error: result.error }),
    });
  }

  if (type === "cashu") {
    const token = String(body.token ?? "");
    const mintUrl = String(
      body.mintUrl ?? process.env.CASHU_MINT_URL ?? "http://localhost:3338"
    );
    const expectedAmount = Number(body.expectedAmount ?? 0);

    if (!token) {
      return NextResponse.json(
        { error: "token is required for Cashu verification" },
        { status: 400 }
      );
    }

    if (expectedAmount <= 0) {
      return NextResponse.json(
        { error: "expectedAmount must be a positive number of sats" },
        { status: 400 }
      );
    }

    const result = await verifyCashuPayment({ token, expectedAmount, mintUrl });

    if (result.success) {
      // Mark the associated challenge as paid if a challengeId was provided
      const challengeId = body.challengeId ? String(body.challengeId) : null;
      if (challengeId) {
        const entry = _challenges.get(challengeId);
        if (entry) {
          _challenges.set(challengeId, { ...entry, paidAt: Date.now() });
        }
      }
    }

    return NextResponse.json({
      success: result.success,
      type: "cashu",
      ...(result.error && { error: result.error }),
    });
  }

  return NextResponse.json(
    { error: "type must be 'l402' or 'cashu'" },
    { status: 400 }
  );
}
