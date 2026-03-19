import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { resolveEscrowDispute, resolveEscrowResolve, isEscrowStatus } from "@/lib/escrow";
import { emitEscrowStateChanged } from "@/lib/escrow-events";

// POST /api/escrow/:id/dispute — either party raises a dispute
// POST /api/escrow/:id/dispute?action=resolve — admin/mediator resolves
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "dispute"; // "dispute" | "resolve"

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const note = (body.note as string | undefined)?.trim() || null;

  const escrow = await db.escrow.findUnique({ where: { id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (escrow.payerId !== caller && escrow.payeeId !== caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isEscrowStatus(escrow.status)) {
    return NextResponse.json({ error: "Escrow has invalid status" }, { status: 500 });
  }

  let transition: { status: string };
  let eventType: string;

  try {
    if (action === "resolve") {
      transition = resolveEscrowResolve(escrow.status);
      eventType = "resolved";
    } else {
      transition = resolveEscrowDispute(escrow.status);
      eventType = "disputed";
    }
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
      data: { escrowId: id, type: eventType, actor: caller, note },
    }),
  ]);

  // @ts-expect-error BigInt is present on updated — correct at runtime
  await emitEscrowStateChanged({ escrow: updated, previousStatus, actor: caller, note });

  return NextResponse.json({ escrow: updated });
}
