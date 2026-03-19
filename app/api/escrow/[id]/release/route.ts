import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { resolveEscrowRelease, isEscrowStatus, isEscrowReleaseCondition } from "@/lib/escrow";
import { emitEscrowStateChanged } from "@/lib/escrow-events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body is optional for release
  }

  const note = (body.note as string | undefined)?.trim() || null;

  const escrow = await db.escrow.findUnique({ where: { id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (escrow.payerId !== caller && escrow.payeeId !== caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isEscrowStatus(escrow.status) || !isEscrowReleaseCondition(escrow.releaseCondition)) {
    return NextResponse.json({ error: "Escrow has invalid state" }, { status: 500 });
  }

  let transition: { status: string };
  try {
    transition = resolveEscrowRelease(
      { status: escrow.status, payerId: escrow.payerId, releaseCondition: escrow.releaseCondition },
      caller
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transition error" },
      { status: 400 }
    );
  }

  const previousStatus = escrow.status;

  const [updated] = await db.$transaction([
    db.escrow.update({
      where: { id },
      data: { status: transition.status },
      include: { events: { orderBy: { createdAt: "asc" } } },
    }),
    db.escrowEvent.create({
      data: { escrowId: id, type: "released", actor: caller, note },
    }),
  ]);

  // @ts-expect-error BigInt is present on updated — correct at runtime
  await emitEscrowStateChanged({ escrow: updated, previousStatus, actor: caller, note });

  return NextResponse.json({ escrow: updated });
}
