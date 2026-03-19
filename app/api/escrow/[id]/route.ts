import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const escrow = await db.escrow.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  if (!escrow) {
    return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  }

  // Only parties to the escrow may view it
  if (escrow.payerId !== caller && escrow.payeeId !== caller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ escrow });
}
