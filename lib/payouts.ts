// ============================================================
// ArxMint — Merchant Payout Automation (SPINE-ARX-03)
//
// Settlement flow:
//   1. Merchant configures payout schedule + destination in PayoutConfig
//   2. triggerPayout() creates a Payout record, routes via preferred rail
//   3. Lightning Address is the primary rail (on-chain + ecash stubbed)
//   4. processScheduledPayouts() is called by /api/cron/payouts daily
//   5. checkThresholdPayouts() is called after each payment completion
//   6. Webhook emitted on payout.completed / payout.failed
// ============================================================

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { triggerPayoutWebhooks } from "@/lib/webhook-engine";

// ---- Constants ----

export const PAYOUT_SCHEDULES = ["daily", "weekly", "on_threshold"] as const;
export const PAYOUT_RAILS = ["lightning", "ecash", "onchain"] as const;
export const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"] as const;

export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];
export type PayoutRail = (typeof PAYOUT_RAILS)[number];
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

// Minimum payout amount to avoid dust (1000 sats = ~$0.40 at current prices)
const MIN_PAYOUT_SATS = BigInt(1000);

// Schedule intervals in milliseconds
const SCHEDULE_INTERVALS: Record<Exclude<PayoutSchedule, "on_threshold">, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

// ---- Types ----

export interface PayoutConfigInput {
  schedule: PayoutSchedule;
  thresholdSats?: bigint | number | null;
  rail: PayoutRail;
  destination: string;
  enabled?: boolean;
}

export interface PayoutConfigRecord {
  id: string;
  merchantId: string;
  schedule: PayoutSchedule;
  thresholdSats: bigint | null;
  rail: PayoutRail;
  destination: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutRecord {
  id: string;
  merchantId: string;
  amountSats: bigint;
  rail: PayoutRail;
  destination: string;
  status: PayoutStatus;
  txRef: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerPayoutOptions {
  amountSats?: bigint | number;
  note?: string;
}

export interface TriggerPayoutResult {
  payout: PayoutRecord;
  success: boolean;
  error?: string;
}

// ---- Validators ----

export function isPayoutSchedule(v: string): v is PayoutSchedule {
  return (PAYOUT_SCHEDULES as readonly string[]).includes(v);
}

export function isPayoutRail(v: string): v is PayoutRail {
  return (PAYOUT_RAILS as readonly string[]).includes(v);
}

// ---- Config helpers ----

function rowToConfig(row: {
  id: string;
  merchantId: string;
  schedule: string;
  thresholdSats: bigint | null;
  rail: string;
  destination: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PayoutConfigRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    schedule: row.schedule as PayoutSchedule,
    thresholdSats: row.thresholdSats ?? null,
    rail: row.rail as PayoutRail,
    destination: row.destination,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToPayout(row: {
  id: string;
  merchantId: string;
  amountSats: bigint;
  rail: string;
  destination: string;
  status: string;
  txRef: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PayoutRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    amountSats: row.amountSats,
    rail: row.rail as PayoutRail,
    destination: row.destination,
    status: row.status as PayoutStatus,
    txRef: row.txRef,
    receiptUrl: row.receiptUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---- Public API ----

/**
 * Read the payout configuration for a merchant.
 * Returns null if no config is set.
 */
export async function getPayoutConfig(merchantId: string): Promise<PayoutConfigRecord | null> {
  const row = await db.payoutConfig.findUnique({ where: { merchantId } });
  return row ? rowToConfig(row) : null;
}

/**
 * Create or update the payout configuration for a merchant.
 */
export async function upsertPayoutConfig(
  merchantId: string,
  input: PayoutConfigInput
): Promise<PayoutConfigRecord> {
  if (!isPayoutSchedule(input.schedule)) {
    throw new Error(`Invalid payout schedule: ${input.schedule}`);
  }
  if (!isPayoutRail(input.rail)) {
    throw new Error(`Invalid payout rail: ${input.rail}`);
  }
  if (!input.destination.trim()) {
    throw new Error("Payout destination is required");
  }
  if (input.schedule === "on_threshold") {
    const threshold =
      input.thresholdSats != null ? BigInt(input.thresholdSats) : null;
    if (!threshold || threshold < MIN_PAYOUT_SATS) {
      throw new Error(
        `thresholdSats must be at least ${MIN_PAYOUT_SATS} when schedule is "on_threshold"`
      );
    }
  }

  const thresholdSats =
    input.thresholdSats != null ? BigInt(input.thresholdSats) : null;

  const row = await db.payoutConfig.upsert({
    where: { merchantId },
    create: {
      merchantId,
      schedule: input.schedule,
      thresholdSats,
      rail: input.rail,
      destination: input.destination.trim(),
      enabled: input.enabled ?? true,
    },
    update: {
      schedule: input.schedule,
      thresholdSats,
      rail: input.rail,
      destination: input.destination.trim(),
      enabled: input.enabled ?? true,
    },
  });

  return rowToConfig(row);
}

/**
 * List payout history for a merchant, newest first.
 */
export async function listPayouts(
  merchantId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ payouts: PayoutRecord[]; nextCursor: string | null }> {
  const limit = Math.min(opts.limit ?? 20, 100);

  const rows = await db.payout.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return { payouts: page.map(rowToPayout), nextCursor };
}

/**
 * Trigger an immediate payout for a merchant.
 *
 * Routing priority:
 *   1. lightning — send to Lightning Address (LNURL-pay / keysend stub)
 *   2. ecash     — stub (not yet implemented)
 *   3. onchain   — stub (not yet implemented)
 *
 * In production, replace _sendLightningAddress() with a real LND/LNURL call.
 */
export async function triggerPayout(
  merchantId: string,
  opts: TriggerPayoutOptions = {}
): Promise<TriggerPayoutResult> {
  const config = await getPayoutConfig(merchantId);
  if (!config) {
    return {
      payout: _makePendingPayout(merchantId, opts),
      success: false,
      error: "No payout config found for merchant",
    };
  }
  if (!config.enabled) {
    return {
      payout: _makePendingPayout(merchantId, opts),
      success: false,
      error: "Payout is disabled for this merchant",
    };
  }

  const amountSats = opts.amountSats != null ? BigInt(opts.amountSats) : await _pendingBalance(merchantId);
  if (amountSats < MIN_PAYOUT_SATS) {
    return {
      payout: _makePendingPayout(merchantId, opts),
      success: false,
      error: `Amount (${amountSats} sats) is below minimum payout threshold (${MIN_PAYOUT_SATS} sats)`,
    };
  }

  // Create payout record in processing state
  const payout = await db.payout.create({
    data: {
      merchantId,
      amountSats,
      rail: config.rail,
      destination: config.destination,
      status: "processing",
    },
  });

  logger.info("payout_triggered", {
    action: "payout_triggered",
    payoutId: payout.id,
    merchantId,
    amountSats: amountSats.toString(),
    rail: config.rail,
  });

  // Route via preferred rail
  let txRef: string | null = null;
  let error: string | undefined;

  try {
    if (config.rail === "lightning") {
      txRef = await _sendLightningAddress(config.destination, amountSats);
    } else if (config.rail === "ecash") {
      txRef = await _sendEcash(config.destination, amountSats);
    } else {
      txRef = await _sendOnchain(config.destination, amountSats);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const finalStatus: PayoutStatus = error ? "failed" : "completed";
  const updated = await db.payout.update({
    where: { id: payout.id },
    data: {
      status: finalStatus,
      txRef,
      receiptUrl: txRef ? `/api/payouts/${payout.id}/receipt` : null,
    },
  });

  const result = rowToPayout(updated);

  // Emit webhook
  triggerPayoutWebhooks(merchantId, payout.id, Number(amountSats), finalStatus);

  if (error) {
    logger.warn("payout_failed", {
      action: "payout_failed",
      payoutId: payout.id,
      merchantId,
      error,
    });
  } else {
    logger.info("payout_completed", {
      action: "payout_completed",
      payoutId: payout.id,
      merchantId,
      txRef,
    });
  }

  return { payout: result, success: !error, error };
}

/**
 * Process all scheduled payouts due now.
 * Called by /api/cron/payouts — safe to call concurrently.
 */
export async function processScheduledPayouts(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  const configs = await db.payoutConfig.findMany({
    where: { enabled: true, schedule: { not: "on_threshold" } },
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const config of configs) {
    const isDue = await _isScheduleDue(config.merchantId, config.schedule as Exclude<PayoutSchedule, "on_threshold">);
    if (!isDue) { skipped++; continue; }

    const result = await triggerPayout(config.merchantId);
    if (result.success) processed++;
    else failed++;
  }

  return { processed, failed, skipped };
}

/**
 * Check all on_threshold merchants and trigger payout if balance >= threshold.
 * Call this after each payment completion.
 */
export async function checkThresholdPayouts(): Promise<void> {
  const configs = await db.payoutConfig.findMany({
    where: { enabled: true, schedule: "on_threshold" },
  });

  for (const config of configs) {
    if (!config.thresholdSats) continue;
    const balance = await _pendingBalance(config.merchantId);
    if (balance >= config.thresholdSats) {
      await triggerPayout(config.merchantId).catch((err) => {
        logger.warn("threshold_payout_error", {
          action: "threshold_payout_error",
          merchantId: config.merchantId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}

// ---- Internal helpers ----

/**
 * Calculate the unsettled balance for a merchant.
 *
 * Strategy: sum completed payments from Supabase, subtract already-paid-out amounts.
 * Falls back to 0 if the payment data is unavailable (DB not connected).
 */
async function _pendingBalance(merchantId: string): Promise<bigint> {
  // Sum all completed payouts for this merchant
  const payoutSum = await db.payout.aggregate({
    where: { merchantId, status: "completed" },
    _sum: { amountSats: true },
  });
  const alreadyPaidOut = payoutSum._sum.amountSats ?? BigInt(0);

  // Query completed payment volume from Supabase
  let grossReceivedSats = BigInt(0);
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("payments")
      .select("amount_sats")
      .eq("merchant_id", merchantId)
      .eq("status", "paid");

    if (data && Array.isArray(data)) {
      for (const row of data) {
        grossReceivedSats += BigInt(row.amount_sats ?? 0);
      }
    }
  } catch {
    // Supabase unavailable — return 0 (no known pending balance)
  }

  const pending = grossReceivedSats - alreadyPaidOut;
  return pending > BigInt(0) ? pending : BigInt(0);
}

/**
 * Determine if a scheduled payout is due based on last completed payout time.
 */
async function _isScheduleDue(
  merchantId: string,
  schedule: Exclude<PayoutSchedule, "on_threshold">
): Promise<boolean> {
  const last = await db.payout.findFirst({
    where: { merchantId, status: "completed" },
    orderBy: { createdAt: "desc" },
  });

  if (!last) return true; // Never paid out — due immediately

  const intervalMs = SCHEDULE_INTERVALS[schedule];
  return Date.now() - last.createdAt.getTime() >= intervalMs;
}

/**
 * Send sats to a Lightning Address (LNURL-pay).
 *
 * Production implementation: resolve LNURL-pay callback → fetch invoice → pay via LND.
 * Stub: returns a fake payment hash for development/testing.
 */
async function _sendLightningAddress(address: string, amountSats: bigint): Promise<string> {
  if (process.env.NODE_ENV !== "production" && !process.env.LND_GRPC_HOST) {
    // Dev stub: simulate successful payment
    logger.info("payout_lightning_stub", {
      action: "payout_lightning_stub",
      address,
      amountSats: amountSats.toString(),
    });
    return `stub_${Math.random().toString(16).slice(2)}`;
  }

  // Production: resolve Lightning Address → LNURL-pay callback → get invoice → pay
  // Format: user@domain.com → https://domain.com/.well-known/lnurlp/user
  const [user, domain] = address.split("@");
  if (!user || !domain) {
    throw new Error(`Invalid Lightning Address: ${address}`);
  }

  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${user}`;
  const lnurlRes = await fetch(lnurlpUrl);
  if (!lnurlRes.ok) {
    throw new Error(`LNURL-pay lookup failed for ${address}: HTTP ${lnurlRes.status}`);
  }

  const lnurlData = await lnurlRes.json() as {
    callback: string;
    minSendable: number;
    maxSendable: number;
    status?: string;
  };

  if (lnurlData.status === "ERROR") {
    throw new Error(`LNURL-pay error for ${address}`);
  }

  const amountMsats = amountSats * BigInt(1000);
  if (amountMsats < BigInt(lnurlData.minSendable) || amountMsats > BigInt(lnurlData.maxSendable)) {
    throw new Error(
      `Amount ${amountSats} sats is outside LNURL-pay range [${lnurlData.minSendable / 1000}, ${lnurlData.maxSendable / 1000}] sats`
    );
  }

  const callbackUrl = `${lnurlData.callback}?amount=${amountMsats.toString()}`;
  const invoiceRes = await fetch(callbackUrl);
  if (!invoiceRes.ok) {
    throw new Error(`LNURL-pay callback failed: HTTP ${invoiceRes.status}`);
  }

  const invoiceData = await invoiceRes.json() as { pr?: string; status?: string };
  if (!invoiceData.pr) {
    throw new Error(`No payment request returned from LNURL-pay callback`);
  }

  // Pay the invoice via LND REST API
  const lndHost = process.env.LND_REST_HOST ?? "localhost:8080";
  const lndMacaroon = process.env.LND_MACAROON_HEX ?? "";
  const payRes = await fetch(`https://${lndHost}/v1/channels/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Grpc-Metadata-macaroon": lndMacaroon,
    },
    body: JSON.stringify({ payment_request: invoiceData.pr }),
  });

  if (!payRes.ok) {
    throw new Error(`LND payment failed: HTTP ${payRes.status}`);
  }

  const payData = await payRes.json() as { payment_hash?: string; payment_error?: string };
  if (payData.payment_error) {
    throw new Error(`LND payment error: ${payData.payment_error}`);
  }

  return payData.payment_hash ?? "unknown";
}

/**
 * Send via ecash rail. Stubbed — not yet implemented.
 */
async function _sendEcash(_destination: string, _amountSats: bigint): Promise<string> {
  throw new Error("Ecash payout rail is not yet implemented");
}

/**
 * Send via on-chain. Stubbed — not yet implemented.
 */
async function _sendOnchain(_destination: string, _amountSats: bigint): Promise<string> {
  throw new Error("On-chain payout rail is not yet implemented");
}

/**
 * Build a placeholder PayoutRecord for error return paths (not persisted).
 */
function _makePendingPayout(merchantId: string, opts: TriggerPayoutOptions): PayoutRecord {
  const now = new Date();
  return {
    id: "",
    merchantId,
    amountSats: opts.amountSats != null ? BigInt(opts.amountSats) : BigInt(0),
    rail: "lightning",
    destination: "",
    status: "failed",
    txRef: null,
    receiptUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}
