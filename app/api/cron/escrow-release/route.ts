// POST /api/cron/escrow-release — Vercel cron job for time-based escrow auto-release
//
// Vercel cron config in vercel.json:
//   { "crons": [{ "path": "/api/cron/escrow-release", "schedule": "*/15 * * * *" }] }
//
// Auth: CRON_SECRET env var (set in Vercel dashboard).
// Vercel automatically sends Authorization: Bearer <CRON_SECRET> for cron invocations.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shouldTimeRelease, isEscrowStatus, isEscrowReleaseCondition } from "@/lib/escrow";
import { emitEscrowStateChanged } from "@/lib/escrow-events";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  logger.info("cron_escrow_release_start", { action: "cron_escrow_release_start" });

  const now = new Date();

  // Fetch funded, time_based escrows whose deadline has passed
  const candidates = await db.escrow.findMany({
    where: {
      status: "funded",
      releaseCondition: "time_based",
      releasesAt: { lte: now },
    },
  });

  let released = 0;
  let errors = 0;

  for (const escrow of candidates) {
    if (
      !isEscrowStatus(escrow.status) ||
      !isEscrowReleaseCondition(escrow.releaseCondition)
    ) {
      continue;
    }

    if (
      !shouldTimeRelease(
        {
          status: escrow.status,
          releaseCondition: escrow.releaseCondition,
          releasesAt: escrow.releasesAt,
        },
        now
      )
    ) {
      continue;
    }

    try {
      const previousStatus = escrow.status;
      const note = "Auto-released by cron: time-based release deadline reached";

      const [updated] = await db.$transaction([
        db.escrow.update({
          where: { id: escrow.id },
          data: { status: "released" },
          include: { events: { orderBy: { createdAt: "asc" } } },
        }),
        db.escrowEvent.create({
          data: {
            escrowId: escrow.id,
            type: "released",
            actor: "system",
            note,
          },
        }),
      ]);

      await emitEscrowStateChanged({
        // @ts-expect-error BigInt is present on updated — correct at runtime
        escrow: updated,
        previousStatus,
        actor: "system",
        note,
      });

      released++;
      logger.info("cron_escrow_auto_released", {
        action: "cron_escrow_auto_released",
        escrowId: escrow.id,
        payerId: escrow.payerId,
        payeeId: escrow.payeeId,
        amountSats: escrow.amountSats.toString(),
      });
    } catch (err: unknown) {
      errors++;
      logger.warn("cron_escrow_release_error", {
        action: "cron_escrow_release_error",
        escrowId: escrow.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("cron_escrow_release_complete", {
    action: "cron_escrow_release_complete",
    candidates: candidates.length,
    released,
    errors,
  });

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    released,
    errors,
  });
}
