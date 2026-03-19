import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { resolveEscrowFund, isEscrowStatus } from "@/lib/escrow";
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentSessionId = (body.paymentSessionId as string | undefined)?.trim() ?? "";

  const escrow = await db.escrow.findUnique({ where: { id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (escrow.payerId !== caller) {
    return NextResponse.json({ error: "Only the payer can fund an escrow" }, { status: 403 });
  }

  if (!isEscrowStatus(escrow.status)) {
    return NextResponse.json({ error: "Escrow has invalid status" }, { status: 500 });
  }

  let transition: { status: string; paymentSessionId: string };
  try {
    transition = resolveEscrowFund(escrow.status, paymentSessionId);
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
      data: {
        status: transition.status,
        paymentSessionId: transition.paymentSessionId,
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    }),
    db.escrowEvent.create({
      data: {
        escrowId: id,
        type: "funded",
        actor: caller,
        note: `Funded via paymentSessionId: ${transition.paymentSessionId}`,
      },
    }),
  ]);

  // @ts-expect-error BigInt is present on updated — type is correct at runtime
  await emitEscrowStateChanged({ escrow: updated, previousStatus, actor: caller, note: null });

  return NextResponse.json({ escrow: updated });
}
