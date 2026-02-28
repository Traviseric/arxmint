// ============================================================
// ArxMint — Payment API: Create Challenge
// POST /api/payment
// Body: { amount: number, type?: 'l402' | 'cashu' | 'auto', resourceId?: string }
//
// Used by Teneo Marketplace and external integrators to create
// a payment challenge. Returns a challenge ID + challenge details.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  createL402Challenge,
  createCashuChallenge,
  routePayment,
  type PaymentChallenge,
} from "@/lib/payment-sdk";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { validateAmount, errorResponse } from "@/lib/validation";
import { checkSingleTxCap, ValueCapError } from "@/lib/value-caps";
import { logger } from "@/lib/logger";

/** In-process challenge registry (process lifetime) */
export const _challenges = new Map<
  string,
  { challenge: PaymentChallenge; paidAt?: number; createdAt: number }
>();

/** Clean up expired challenges */
function prune() {
  const now = Date.now();
  for (const [id, entry] of _challenges) {
    if (entry.challenge.expiresAt < now) _challenges.delete(id);
  }
}

export async function POST(request: NextRequest) {
  prune();

  // Optional: identify the caller (ArxMint session cookie or marketplace Bearer JWT)
  const callerPubkey = getCallerFromRequest(request);

  let body: {
    amount?: unknown;
    type?: unknown;
    resourceId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let amount: number;
  try {
    amount = validateAmount(body.amount);
    checkSingleTxCap(amount);
  } catch (e: unknown) {
    if (e instanceof ValueCapError) {
      return NextResponse.json(
        { error: e.message, code: "VALUE_CAP_EXCEEDED" },
        { status: 400 }
      );
    }
    return NextResponse.json(errorResponse(e), { status: 400 });
  }

  const typeParam = String(body.type ?? "auto");
  const resourceId = String(body.resourceId ?? "marketplace-access");

  let challengeType: "l402" | "cashu";

  if (typeParam === "auto") {
    const mintUrl = process.env.CASHU_MINT_URL;
    const route = await routePayment({ amount });
    // Use L402 when Lightning is routed; otherwise use Cashu
    challengeType =
      route.backend === "lightning"
        ? mintUrl
          ? "cashu" // prefer Cashu when a mint is available
          : "l402"
        : "cashu";
  } else if (typeParam === "l402" || typeParam === "cashu") {
    challengeType = typeParam;
  } else {
    return NextResponse.json(
      { error: "type must be 'l402', 'cashu', or 'auto'" },
      { status: 400 }
    );
  }

  try {
    let challenge: PaymentChallenge;

    if (challengeType === "l402") {
      challenge = await createL402Challenge({ amount, resourcePath: resourceId });
    } else {
      const mintUrl =
        process.env.CASHU_MINT_URL ?? "http://localhost:3338";
      challenge = await createCashuChallenge({ amount, mintUrl });
    }

    // Use macaroon as L402 challenge ID (already stored internally in SDK)
    // Use a timestamp+random suffix for Cashu challenges
    const challengeId =
      challengeType === "l402" && challenge.macaroon
        ? challenge.macaroon
        : `cashu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    _challenges.set(challengeId, {
      challenge,
      createdAt: Date.now(),
    });

    logger.payment("challenge_created", {
      amount,
      backend: challengeType === "l402" ? "lightning" : "cashu",
      status: "pending",
    });

    return NextResponse.json({
      challengeId,
      challenge,
      ...(callerPubkey && { callerPubkey }),
      instructions:
        challengeType === "l402"
          ? [
              "1. Pay the Lightning invoice in challenge.invoice",
              "2. Retry with: POST /api/payment/verify { type: 'l402', macaroon, preimage }",
            ]
          : [
              `1. Get a Cashu token from the mint at ${challenge.mintUrl}`,
              "2. Submit it via: POST /api/payment/verify { type: 'cashu', token, mintUrl, expectedAmount }",
            ],
    });
  } catch (error: unknown) {
    logger.error("Payment challenge creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create payment challenge", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
