// ============================================================
// ArxMint — Transaction Ledger API
// POST /api/transactions — record a transaction
// GET  /api/transactions?communityId=xxx&limit=50 — fetch history
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";
import {
  isCommunityOwnedByUser,
  requireSessionUserId,
  SessionUserError,
} from "@/lib/session-user";
import { validateAmount, errorResponse, errorStatus } from "@/lib/validation";
import {
  checkDailyVolumeCap,
  checkSingleTxCap,
  checkWalletBalanceCap,
  ValueCapError,
} from "@/lib/value-caps";
import { logger } from "@/lib/logger";

function utcDayStart(date = new Date()): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function getTodayCommunityVolumeSats(communityId: string): Promise<number> {
  const start = utcDayStart();
  const next = new Date(start);
  next.setUTCDate(start.getUTCDate() + 1);

  const aggregate = await db.transaction.aggregate({
    _sum: { amount: true },
    where: {
      communityId,
      timestamp: { gte: start, lt: next },
      status: { not: "failed" },
    },
  });
  return aggregate._sum.amount ?? 0;
}

async function getCommunityWalletBalanceSats(communityId: string): Promise<number> {
  const rows = await db.transaction.findMany({
    where: {
      communityId,
      status: { not: "failed" },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  let balance = 0;
  for (const row of rows) {
    switch (row.type) {
      case "receive":
        balance += row.amount;
        break;
      case "send":
      case "settlement":
        balance -= row.amount;
        break;
      default:
        break;
    }
  }

  return Math.max(0, balance);
}

async function getUserIdOrAuthError(
  request: NextRequest
): Promise<string | NextResponse> {
  try {
    return await requireSessionUserId(request);
  } catch (error: unknown) {
    if (error instanceof SessionUserError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 503;
      return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status });
    }
    return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get("communityId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    if (communityId) {
      const owned = await isCommunityOwnedByUser(communityId, userId);
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const transactions = await db.transaction.findMany({
      where: communityId ? { communityId } : { community: { userId } },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (error: unknown) {
    // DB not configured — return empty list so UI degrades gracefully
    logger.warn("Could not fetch transactions from DB", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ transactions: [] });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const userId = await getUserIdOrAuthError(request);
  if (userId instanceof NextResponse) return userId;

  try {
    const body = await request.json();
    const {
      communityId,
      type,
      amount,
      backend,
      status = "completed",
      counterparty,
      notes,
    } = body;

    if (!communityId || typeof communityId !== "string") {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }

    const owned = await isCommunityOwnedByUser(communityId, userId);
    if (!owned) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN_COMMUNITY" },
        { status: 403 }
      );
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

    const validatedAmount = validateAmount(amount);
    checkSingleTxCap(validatedAmount);
    const todayVolumeSats = await getTodayCommunityVolumeSats(communityId);
    checkDailyVolumeCap(todayVolumeSats, validatedAmount);
    if (type === "receive") {
      const currentBalanceSats = await getCommunityWalletBalanceSats(communityId);
      checkWalletBalanceCap(currentBalanceSats + validatedAmount);
    }

    const transaction = await db.transaction.create({
      data: {
        communityId,
        type,
        amount: validatedAmount,
        backend,
        status,
        counterparty: counterparty ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ValueCapError) {
      return NextResponse.json(
        { error: error.message, code: "VALUE_CAP_EXCEEDED" },
        { status: 400 }
      );
    }
    if (!(error instanceof Error) || error.name !== "ValidationError") {
      logger.error("POST /api/transactions error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json(errorResponse(error), { status: errorStatus(error) });
  }
}
