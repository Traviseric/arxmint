import { logger } from "@/lib/logger";
import {
  buildEscrowStateChangedPayload,
  type EscrowRecordLike,
  type EscrowStatus,
} from "@/lib/escrow";

export async function emitEscrowStateChanged(args: {
  escrow: EscrowRecordLike;
  previousStatus: EscrowStatus;
  actor: string | null;
  note: string | null;
}): Promise<void> {
  const payload = buildEscrowStateChangedPayload(
    args.escrow,
    args.previousStatus,
    args.actor,
    args.note
  );

  logger.info("escrow_state_changed", {
    action: "escrow_state_changed",
    escrowId: args.escrow.id,
    previousStatus: args.previousStatus,
    status: args.escrow.status,
    payerId: args.escrow.payerId,
    payeeId: args.escrow.payeeId,
    amountSats: args.escrow.amountSats.toString(),
    releaseCondition: args.escrow.releaseCondition,
  });

  const webhookUrl = process.env.ESCROW_EVENTS_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ArxMint-Event": payload.event,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn("escrow_event_webhook_failed", {
        action: "escrow_event_webhook_failed",
        escrowId: args.escrow.id,
        status: response.status,
      });
    }
  } catch (error: unknown) {
    logger.warn("escrow_event_webhook_error", {
      action: "escrow_event_webhook_error",
      escrowId: args.escrow.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
