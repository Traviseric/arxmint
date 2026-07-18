// ============================================================
// ArxMint — Agent Reputation Engine
// Trust scoring layer on top of the identity alias graph.
// Agents build reputation through payment history, account age,
// and dispute resolution. Enables autonomous commerce with
// trust-based pricing and counterparty filtering.
// ============================================================

import { logger } from "@/lib/logger";

export type ReputationTier =
  | "untrusted"
  | "bronze"
  | "silver"
  | "gold"
  | "sovereign";

export interface ReputationScore {
  agentId: string;
  score: number;
  tier: ReputationTier;
  components: ReputationComponents;
  updatedAt: number;
}

export interface ReputationComponents {
  paymentCompletion: number;
  totalVolume: number;
  accountAge: number;
  disputeHistory: number;
}

export interface PaymentEvent {
  agentId: string;
  counterpartyId: string;
  amountSats: number;
  direction: "sent" | "received";
  status: "completed" | "failed" | "disputed";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const MAX_COMPLETION_SCORE = 40;
const MAX_VOLUME_SCORE = 25;
const MAX_AGE_SCORE = 20;
const MAX_DISPUTE_SCORE = 15;

const VOLUME_SAT_POINT = 10_000;
const ACCOUNT_AGE_MS_DAY = 86_400_000;
const DISPUTE_FREE_WINDOW_MS = 30 * ACCOUNT_AGE_MS_DAY;

/** In-memory event log (falls back gracefully when Supabase is unavailable) */
const paymentLog: PaymentEvent[] = [];

/**
 * Record a payment event for reputation tracking.
 * Persisted to Supabase when available; in-memory fallback otherwise.
 */
export async function recordPaymentEvent(event: PaymentEvent): Promise<void> {
  paymentLog.push(event);

  try {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("agent_payment_events").insert({
      agent_id: event.agentId,
      counterparty_id: event.counterpartyId,
      amount_sats: event.amountSats,
      direction: event.direction,
      status: event.status,
      occurred_at: new Date(event.timestamp).toISOString(),
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    logger.warn("agent_reputation_payment_record_failed", {
      action: "reputation_record",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Fetch payment events for an agent.
 * Prefers Supabase; falls back to in-memory log.
 */
async function getPaymentEvents(agentId: string): Promise<PaymentEvent[]> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("agent_payment_events")
      .select("*")
      .eq("agent_id", agentId)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!data) return paymentLog.filter((e) => e.agentId === agentId);

    return data.map((row: Record<string, unknown>) => ({
      agentId: row.agent_id as string,
      counterpartyId: row.counterparty_id as string,
      amountSats: row.amount_sats as number,
      direction: row.direction as PaymentEvent["direction"],
      status: row.status as PaymentEvent["status"],
      timestamp: new Date(row.occurred_at as string).getTime(),
      metadata: row.metadata as Record<string, unknown> | undefined,
    }));
  } catch {
    return paymentLog.filter((e) => e.agentId === agentId);
  }
}

/**
 * Get the account age in days for an agent.
 * Uses the earliest identity link timestamp from the identity graph.
 */
async function getAccountAgeDays(agentId: string): Promise<number> {
  try {
    const { getAllAliases } = await import("@/lib/identity");
    const resolved = await getAllAliases(agentId);
    if (!resolved || resolved.aliases.length === 0) return 0;

    const earliest = resolved.aliases.reduce((a, b) =>
      a.linkedAt < b.linkedAt ? a : b
    );
    return Math.floor(
      (Date.now() - earliest.linkedAt.getTime()) / ACCOUNT_AGE_MS_DAY
    );
  } catch {
    return 0;
  }
}

/**
 * Compute a reputation score (0-100) for an agent.
 *
 * Components:
 *   paymentCompletion (0-40):  % of completed payments in last 200 events
 *   totalVolume (0-25):        log-scaled total sats transacted
 *   accountAge (0-20):         linear from 0-365 days
 *   disputeHistory (0-15):     starts at 15, reduced by dispute events
 */
export async function computeReputation(agentId: string): Promise<ReputationScore> {
  const [events, accountAgeDays] = await Promise.all([
    getPaymentEvents(agentId),
    getAccountAgeDays(agentId),
  ]);

  const recent = events.slice(0, 200);
  const completed = recent.filter((e) => e.status === "completed").length;
  const disputed = recent.filter((e) => e.status === "disputed").length;
  const total = recent.length;

  const paymentCompletion =
    total > 0
      ? Math.round((completed / total) * MAX_COMPLETION_SCORE)
      : 0;

  const totalVolumeSats = events.reduce((sum, e) => sum + e.amountSats, 0);
  const totalVolume = Math.min(
    Math.round(Math.log2(1 + totalVolumeSats / VOLUME_SAT_POINT) * 5),
    MAX_VOLUME_SCORE
  );

  const accountAge = Math.min(
    Math.round((accountAgeDays / 365) * MAX_AGE_SCORE),
    MAX_AGE_SCORE
  );

  const recentDisputes = disputed > 0
    ? Math.min(disputed * 5, MAX_DISPUTE_SCORE)
    : 0;
  const disputeHistory = MAX_DISPUTE_SCORE - recentDisputes;

  const score = Math.max(
    0,
    Math.min(100, paymentCompletion + totalVolume + accountAge + disputeHistory)
  );

  const tier = scoreToTier(score);

  return {
    agentId,
    score,
    tier,
    components: {
      paymentCompletion,
      totalVolume,
      accountAge,
      disputeHistory,
    },
    updatedAt: Date.now(),
  };
}

function scoreToTier(score: number): ReputationTier {
  if (score >= 91) return "sovereign";
  if (score >= 76) return "gold";
  if (score >= 51) return "silver";
  if (score >= 26) return "bronze";
  return "untrusted";
}

/**
 * Minimum reputation tier required for different commerce actions.
 */
export const TRUST_THRESHOLDS: Record<string, ReputationTier> = {
  "browse-bazaar": "untrusted",
  "place-order": "bronze",
  "use-escrow": "bronze",
  "create-merchant": "silver",
  "agent-commerce": "silver",
  "high-value-trade": "gold",
  "federation-guardian": "sovereign",
};

/**
 * Check if an agent meets the trust threshold for an action.
 */
export async function checkTrust(
  agentId: string,
  action: keyof typeof TRUST_THRESHOLDS
): Promise<{ allowed: boolean; reputation: ReputationScore }> {
  const reputation = await computeReputation(agentId);
  const required = TRUST_THRESHOLDS[action];
  const tiers: ReputationTier[] = [
    "untrusted",
    "bronze",
    "silver",
    "gold",
    "sovereign",
  ];
  const allowed = tiers.indexOf(reputation.tier) >= tiers.indexOf(required);
  return { allowed, reputation };
}

/**
 * Compare two agents — returns which is more trusted.
 * Useful for routing high-value transactions to the most trusted counterparty.
 */
export async function compareReputation(
  agentA: string,
  agentB: string
): Promise<{ preferred: string; a: ReputationScore; b: ReputationScore }> {
  const [a, b] = await Promise.all([
    computeReputation(agentA),
    computeReputation(agentB),
  ]);
  return {
    preferred: a.score >= b.score ? agentA : agentB,
    a,
    b,
  };
}

/** Tier descriptions for UI display */
export const TIER_LABELS: Record<ReputationTier, { label: string; color: string; emoji: string }> = {
  untrusted: { label: "Untrusted", color: "#FF5252", emoji: "!" },
  bronze: { label: "Bronze", color: "#CD7F32", emoji: "B" },
  silver: { label: "Silver", color: "#C0C0C0", emoji: "S" },
  gold: { label: "Gold", color: "#FFD700", emoji: "G" },
  sovereign: { label: "Sovereign", color: "#F7931A", emoji: "S" },
};