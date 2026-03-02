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
  type PaymentChallenge,
} from "@/lib/payment-sdk";
import { _challenges } from "@/app/api/payment/route";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { validateCashuToken } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { checkPrincipalAndIpRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { observeApiRoute } from "@/lib/api-observability";

/** Load challenge entry from memory; fall back to DB if not found */
async function getOrLoadChallenge(
  id: string
): Promise<{ challenge: PaymentChallenge; paidAt?: number; createdAt: number } | null> {
  const cached = _challenges.get(id);
  if (cached) return cached;
  try {
    const row = await db.paymentChallenge.findUnique({ where: { id } });
    if (!row || row.status !== "pending" || !row.notes) return null;
    const data = JSON.parse(row.notes) as { challenge: PaymentChallenge; createdAt: number };
    const entry = { challenge: data.challenge, createdAt: data.createdAt };
    _challenges.set(id, entry);
    return entry;
  } catch {
    return null;
  }
}

/** Mark a challenge as paid in the DB (best-effort) */
async function dbMarkPaid(id: string, paidAt: number): Promise<void> {
  try {
    await db.paymentChallenge.update({
      where: { id },
      data: { status: "paid", paidAt: new Date(paidAt) },
    });
  } catch {
    // Silently fail — in-memory state is source of truth during this process lifetime
  }
}

export async function POST(request: NextRequest) {
  return observeApiRoute(request, "/api/payment/verify", async () => {
  // Optional: identify the caller (ArxMint session cookie or marketplace Bearer JWT)
  const callerPubkey = getCallerFromRequest(request);
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkPrincipalAndIpRateLimit(
    "payment-verify",
    ip,
    callerPubkey,
    RATE_LIMITS.paymentWrite
  );
  if (!rl.allowed) {
    logger.rateLimit(ip, "/api/payment/verify", rl.retryAfter ?? 60);
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 60) },
    });
  }

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
      // Mark the challenge as paid in memory and DB
      const entry = await getOrLoadChallenge(macaroon);
      if (entry) {
        const paidAt = Date.now();
        _challenges.set(macaroon, { ...entry, paidAt });
        void dbMarkPaid(macaroon, paidAt);
      }
    }

    return NextResponse.json({
      success: result.success,
      type: "l402",
      ...(callerPubkey && { callerPubkey }),
      ...(result.error && { error: result.error }),
    });
  }

  if (type === "cashu") {
    let token: string;
    try {
      token = validateCashuToken(body.token);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid token", code: "VALIDATION_TOKEN" },
        { status: 400 }
      );
    }
    const mintUrl = String(
      body.mintUrl ?? process.env.CASHU_MINT_URL ?? "http://localhost:3338"
    );
    const expectedAmount = Number(body.expectedAmount ?? 0);

    if (expectedAmount <= 0) {
      return NextResponse.json(
        { error: "expectedAmount must be a positive number of sats", code: "VALIDATION_EXPECTEDAMOUNT" },
        { status: 400 }
      );
    }

    const result = await verifyCashuPayment({ token, expectedAmount, mintUrl });

    if (result.success) {
      // Mark the associated challenge as paid in memory and DB
      const challengeId = body.challengeId ? String(body.challengeId) : null;
      if (challengeId) {
        const entry = await getOrLoadChallenge(challengeId);
        if (entry) {
          const paidAt = Date.now();
          _challenges.set(challengeId, { ...entry, paidAt });
          void dbMarkPaid(challengeId, paidAt);
        }
      }
    }

    logger.payment("verify", {
      amount: expectedAmount,
      backend: "cashu",
      status: result.success ? "paid" : "failed",
    });

    return NextResponse.json({
      success: result.success,
      type: "cashu",
      ...(callerPubkey && { callerPubkey }),
      ...(result.error && { error: result.error }),
    });
  }

  return NextResponse.json(
    { error: "type must be 'l402' or 'cashu'" },
    { status: 400 }
  );
  });
}
