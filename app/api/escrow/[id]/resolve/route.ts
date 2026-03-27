import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  resolveEscrowMediatorResolve,
  isEscrowStatus,
  type EscrowResolution,
} from "@/lib/escrow";
import { emitEscrowStateChanged } from "@/lib/escrow-events";

// POST /api/escrow/:id/resolve — mediator resolves a disputed escrow
// Body: { resolution: 'buyer' | 'seller' | 'split', splitBps?: number, reason: string }
// Auth: caller must match mediatorAddress on the escrow record
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

  const resolution = (body.resolution as string | undefined)?.trim() as EscrowResolution | undefined;
  const splitBps = body.splitBps !== undefined ? Number(body.splitBps) : undefined;
  const reason = (body.reason as string | undefined)?.trim() || "";

  const escrow = await db.escrow.findUnique({ where: { id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  if (!isEscrowStatus(escrow.status)) {
    return NextResponse.json({ error: "Escrow has invalid status" }, { status: 500 });
  }

  let result: { status: string; resolvedAs: string; splitBps: number | null };
  try {
    result = resolveEscrowMediatorResolve({
      currentStatus: escrow.status,
      mediatorAddress: escrow.mediatorAddress,
      actorId: caller,
      resolution: resolution ?? ("" as EscrowResolution),
      splitBps,
      reason,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transition error";
    // Return 403 for auth failures, 400 for everything else
    const isAuthError =
      msg.includes("Only the designated mediator") || msg.includes("no mediator assigned");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 403 : 400 });
  }

  const previousStatus = escrow.status;
  const note = `Resolved by mediator ${caller} as ${result.resolvedAs}: ${reason}`;

  const [updated] = await db.$transaction([
    db.escrow.update({
      where: { id },
      data: {
        status: result.status,
        resolvedAs: result.resolvedAs,
        splitBps: result.splitBps,
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    }),
    db.escrowEvent.create({
      data: { escrowId: id, type: "resolved", actor: caller, note },
    }),
  ]);

  // @ts-expect-error BigInt is present on updated — correct at runtime
  await emitEscrowStateChanged({ escrow: updated, previousStatus, actor: caller, note });

  return NextResponse.json({ escrow: updated });
}
