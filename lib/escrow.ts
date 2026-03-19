// ============================================================
// ArxMint — Escrow State Machine (SPINE-ARX-02 Phase 1)
// ============================================================
// Handles trustless escrow for OpenBazaar trade, agent commerce,
// and high-value merchant transactions.
//
// State machine:
//   pending_funding → funded → released
//                           → disputed → resolved
//                                      → voided
//   (any state) → voided (admin only)
// ============================================================

export const ESCROW_STATUSES = [
  "pending_funding",
  "funded",
  "released",
  "disputed",
  "resolved",
  "voided",
] as const;

export const ESCROW_RELEASE_CONDITIONS = [
  "manual",
  "time_based",
  "delivery_confirmed",
  "dispute_resolved",
] as const;

export type EscrowStatus = (typeof ESCROW_STATUSES)[number];
export type EscrowReleaseCondition = (typeof ESCROW_RELEASE_CONDITIONS)[number];

export function isEscrowStatus(value: string): value is EscrowStatus {
  return (ESCROW_STATUSES as readonly string[]).includes(value);
}

export function isEscrowReleaseCondition(value: string): value is EscrowReleaseCondition {
  return (ESCROW_RELEASE_CONDITIONS as readonly string[]).includes(value);
}

export interface EscrowRecordLike {
  id: string;
  payerId: string;
  payeeId: string;
  amountSats: bigint;
  currency: string;
  releaseCondition: EscrowReleaseCondition;
  releasesAt: Date | null;
  status: EscrowStatus;
  invoiceId: string | null;
  paymentSessionId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowCreateParams {
  payerId: string;
  payeeId: string;
  amountSats: bigint;
  releaseCondition: EscrowReleaseCondition;
  releasesAt?: Date | null;
  invoiceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EscrowEventPayload {
  id: string;
  event: "escrow.state_changed";
  created: number;
  data: {
    escrowId: string;
    previousStatus: EscrowStatus;
    status: EscrowStatus;
    payerId: string;
    payeeId: string;
    amountSats: string; // serialised as string — BigInt is not JSON-safe
    currency: string;
    releaseCondition: EscrowReleaseCondition;
    releasesAt: string | null;
    actor: string | null;
    note: string | null;
  };
}

// ── Validation helpers ──────────────────────────────────────

export function validateEscrowCreate(params: EscrowCreateParams): void {
  if (!params.payerId?.trim()) {
    throw new Error("payerId is required");
  }
  if (!params.payeeId?.trim()) {
    throw new Error("payeeId is required");
  }
  if (params.payerId.trim() === params.payeeId.trim()) {
    throw new Error("payerId and payeeId must be different");
  }
  if (typeof params.amountSats !== "bigint" || params.amountSats <= BigInt(0)) {
    throw new Error("amountSats must be a positive BigInt");
  }
  if (!isEscrowReleaseCondition(params.releaseCondition)) {
    throw new Error(`Invalid releaseCondition: ${params.releaseCondition}`);
  }
  if (params.releaseCondition === "time_based" && !params.releasesAt) {
    throw new Error("releasesAt is required for time_based release condition");
  }
  if (params.releasesAt && new Date(params.releasesAt).getTime() <= Date.now()) {
    throw new Error("releasesAt must be in the future");
  }
}

// ── Transition guards ──────────────────────────────────────

export function resolveEscrowFund(
  currentStatus: EscrowStatus,
  paymentSessionId: string
): { status: EscrowStatus; paymentSessionId: string } {
  if (currentStatus !== "pending_funding") {
    throw new Error(`Cannot fund escrow in status: ${currentStatus}`);
  }
  if (!paymentSessionId?.trim()) {
    throw new Error("paymentSessionId is required to fund an escrow");
  }
  return { status: "funded", paymentSessionId: paymentSessionId.trim() };
}

export function resolveEscrowRelease(
  escrow: Pick<EscrowRecordLike, "status" | "payerId" | "releaseCondition">,
  actorId: string
): { status: EscrowStatus } {
  if (escrow.status !== "funded") {
    throw new Error(`Cannot release escrow in status: ${escrow.status}`);
  }
  // Only the payer (or system for time_based/delivery_confirmed) can release
  const isSystemRelease =
    actorId === "system" &&
    (escrow.releaseCondition === "time_based" ||
      escrow.releaseCondition === "delivery_confirmed");
  if (!isSystemRelease && actorId !== escrow.payerId) {
    throw new Error("Only the payer or system can release this escrow");
  }
  return { status: "released" };
}

export function resolveEscrowDispute(
  currentStatus: EscrowStatus
): { status: EscrowStatus } {
  if (currentStatus !== "funded") {
    throw new Error(`Cannot dispute escrow in status: ${currentStatus}`);
  }
  return { status: "disputed" };
}

export function resolveEscrowResolve(
  currentStatus: EscrowStatus
): { status: EscrowStatus } {
  if (currentStatus !== "disputed") {
    throw new Error(`Cannot resolve escrow in status: ${currentStatus}`);
  }
  return { status: "resolved" };
}

export function resolveEscrowVoid(
  currentStatus: EscrowStatus
): { status: EscrowStatus } {
  if (currentStatus === "released" || currentStatus === "voided") {
    throw new Error(`Cannot void escrow in status: ${currentStatus}`);
  }
  return { status: "voided" };
}

// ── Time-based release check ──────────────────────────────

export function shouldTimeRelease(
  escrow: Pick<EscrowRecordLike, "status" | "releaseCondition" | "releasesAt">,
  now = new Date()
): boolean {
  return (
    escrow.status === "funded" &&
    escrow.releaseCondition === "time_based" &&
    !!escrow.releasesAt &&
    new Date(escrow.releasesAt).getTime() <= now.getTime()
  );
}

// ── Event payload builder ─────────────────────────────────

export function buildEscrowStateChangedPayload(
  escrow: EscrowRecordLike,
  previousStatus: EscrowStatus,
  actor: string | null,
  note: string | null
): EscrowEventPayload {
  return {
    id: `escrow_evt_${escrow.id}_${Date.now()}`,
    event: "escrow.state_changed",
    created: Math.floor(Date.now() / 1000),
    data: {
      escrowId: escrow.id,
      previousStatus,
      status: escrow.status,
      payerId: escrow.payerId,
      payeeId: escrow.payeeId,
      amountSats: escrow.amountSats.toString(),
      currency: escrow.currency,
      releaseCondition: escrow.releaseCondition,
      releasesAt: escrow.releasesAt ? new Date(escrow.releasesAt).toISOString() : null,
      actor,
      note,
    },
  };
}
