import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { resolveEscrowDispute, isEscrowStatus } from "@/lib/escrow";
import { emitEscrowStateChanged } from "@/lib/escrow-events";

// POST /api/escrow/:id/dispute — buyer or seller raises a dispute
// Body: { reason: string, evidence?: string }
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
    // body optional — but reason is required below
  }

  const reason = (body.reason as string | undefined)?.trim() || "";
  const evidence = (body.evidence as string | undefined)?.trim() || null;

  if (!reason) {
    return NextResponse.json({ error: "reason is required to raise a dispute" }, { status: 400 });
  }

  const escrow = await db.escrow.findUnique({ where: { id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  // Only a party to the escrow can raise a dispute
  if (escrow.payerId !== caller && escrow.payeeId !== caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isEscrowStatus(escrow.status)) {
    return NextResponse.json({ error: "Escrow has invalid status" }, { status: 500 });
  }

  let transition: { status: string };
  try {
    transition = resolveEscrowDispute(escrow.status);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transition error" },
      { status: 400 }
    );
  }

  const previousStatus = escrow.status;
  const note = `Disputed by ${caller}: ${reason}`;

  const [updated] = await db.$transaction([
    db.escrow.update({
      where: { id },
      data: {
        status: transition.status,
        disputeReason: reason,
        disputeEvidence: evidence,
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    }),
    db.escrowEvent.create({
      data: { escrowId: id, type: "disputed", actor: caller, note },
    }),
  ]);

  // @ts-expect-error BigInt is present on updated — correct at runtime
  await emitEscrowStateChanged({ escrow: updated, previousStatus, actor: caller, note });

  return NextResponse.json({ escrow: updated });
}
