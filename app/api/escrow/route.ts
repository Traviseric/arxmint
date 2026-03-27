import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  isEscrowStatus,
  isEscrowReleaseCondition,
  validateEscrowCreate,
  type EscrowReleaseCondition,
} from "@/lib/escrow";

function requireCaller(request: NextRequest): string | null {
  return getCallerFromRequest(request);
}

export async function GET(request: NextRequest) {
  const caller = requireCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "any"; // payer | payee | any
  const rawStatus = searchParams.get("status") ?? undefined;

  if (rawStatus && !isEscrowStatus(rawStatus)) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const statusFilter = rawStatus && isEscrowStatus(rawStatus) ? { status: rawStatus } : {};

  const where =
    role === "payer"
      ? { payerId: caller, ...statusFilter }
      : role === "payee"
        ? { payeeId: caller, ...statusFilter }
        : {
            OR: [{ payerId: caller }, { payeeId: caller }],
            ...statusFilter,
          };

  const escrows = await db.escrow.findMany({
    where,
    include: { events: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ escrows, count: escrows.length });
}

export async function POST(request: NextRequest) {
  const caller = requireCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payerId = (body.payerId as string | undefined)?.trim() ?? caller;
  const payeeId = (body.payeeId as string | undefined)?.trim();
  const rawAmount = body.amountSats;
  const releaseConditionRaw = (body.releaseCondition as string | undefined)?.trim();
  const releasesAtRaw = body.releasesAt as string | undefined;
  const invoiceId = (body.invoiceId as string | undefined)?.trim() || null;
  const mediatorAddress = (body.mediatorAddress as string | undefined)?.trim() || null;
  const metadata = body.metadata as Record<string, unknown> | undefined;

  if (!payeeId) {
    return NextResponse.json({ error: "payeeId is required" }, { status: 400 });
  }

  if (!releaseConditionRaw || !isEscrowReleaseCondition(releaseConditionRaw)) {
    return NextResponse.json(
      { error: "releaseCondition must be one of: manual, time_based, delivery_confirmed, dispute_resolved" },
      { status: 400 }
    );
  }
  const releaseCondition: EscrowReleaseCondition = releaseConditionRaw;

  let amountSats: bigint;
  try {
    amountSats = BigInt(String(rawAmount ?? ""));
    if (amountSats <= BigInt(0)) throw new Error("must be positive");
  } catch {
    return NextResponse.json({ error: "amountSats must be a positive integer" }, { status: 400 });
  }

  const releasesAt = releasesAtRaw ? new Date(releasesAtRaw) : null;

  try {
    validateEscrowCreate({ payerId, payeeId, amountSats, releaseCondition, releasesAt, invoiceId, mediatorAddress });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Validation error" },
      { status: 400 }
    );
  }

  const escrow = await db.escrow.create({
    data: {
      payerId,
      payeeId,
      amountSats,
      releaseCondition,
      releasesAt,
      invoiceId,
      mediatorAddress,
      metadata: metadata ? (metadata as Prisma.InputJsonObject) : Prisma.DbNull,
    },
    include: { events: true },
  });

  return NextResponse.json({ escrow }, { status: 201 });
}
