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
import { db } from "@/lib/db";
import { checkPrincipalAndIpRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { observeApiRoute } from "@/lib/api-observability";

/** In-process challenge registry (process lifetime) */
export const _challenges = new Map<
  string,
  { challenge: PaymentChallenge; paidAt?: number; createdAt: number }
>();

/** Persist a new challenge to DB (best-effort — won't throw on DB errors) */
async function dbWriteChallenge(
  challengeId: string,
  entry: { challenge: PaymentChallenge; createdAt: number }
): Promise<void> {
  try {
    await db.paymentChallenge.create({
      data: {
        id: challengeId,
        type: entry.challenge.type,
        amount: entry.challenge.amount,
        backend: entry.challenge.type === "l402" ? "lightning" : "cashu",
        status: "pending",
        expiresAt: new Date(entry.challenge.expiresAt),
        createdAt: new Date(entry.createdAt),
        notes: JSON.stringify({ challenge: entry.challenge, createdAt: entry.createdAt }),
      },
    });
  } catch (e) {
    logger.warn("challenge_db_persist_failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Clean up expired challenges from memory and DB */
function prune() {
  const now = Date.now();
  for (const [id, entry] of _challenges) {
    if (entry.challenge.expiresAt < now) _challenges.delete(id);
  }
  // Fire-and-forget DB prune (don't block the request)
  void db.paymentChallenge
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((error: unknown) => {
      logger.warn("payment_challenge_db_prune_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

export async function POST(request: NextRequest) {
  return observeApiRoute(request, "/api/payment", async () => {
  prune();

  // Optional: identify the caller (ArxMint session cookie or marketplace Bearer JWT)
  const callerPubkey = getCallerFromRequest(request);
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkPrincipalAndIpRateLimit(
    "payment-create",
    ip,
    callerPubkey,
    RATE_LIMITS.paymentWrite
  );
  if (!rl.allowed) {
    logger.rateLimit(ip, "/api/payment", rl.retryAfter ?? 60);
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 60) },
    });
  }

  let body: {
    amount?: unknown;
    type?: unknown;
    resourceId?: unknown;
  };

  try {
    body = await request.json();
  } catch (error: unknown) {
    logger.warn("POST /api/payment invalid JSON body", {
      error: error instanceof Error ? error.message : String(error),
    });
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

    const entry = { challenge, createdAt: Date.now() };
    _challenges.set(challengeId, entry);
    // Write-through to DB so challenges survive server restarts
    void dbWriteChallenge(challengeId, entry);

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
  });
}
