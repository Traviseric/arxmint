// ============================================================
// ArxMint — Agent API Endpoints
// Dual paywall: L402 (Lightning) + NUT-24 (Cashu ecash)
// In production: gated behind Aperture L402 + Cashu verification.
//
// Payment is required by default. To bypass in dev/testing:
//   SKIP_PAYMENT_VERIFY=true (env var — explicit override only)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCycleMetrics } from "@/lib/cycle-monitor";
import {
  computePrivacyScore,
  PRIVACY_PRESETS,
  PRIVACY_DESCRIPTIONS,
  isLayerAvailable,
} from "@/lib/privacy-defaults";
import {
  detectPaymentMethod,
  verifyCashuPayment,
  buildCashuChallenge,
  type CashuPaywallConfig,
} from "@/lib/cashu-paywall";
import { validateRemoteSignerEnv } from "@/lib/lightning-validator";
import { logger } from "@/lib/logger";
import { AgentWallet, MemoryStorage } from "@/lib/agent-wallet";
import { getNetworkIntel, computeRoutingAdvice, getMempoolStats, getFeeEstimates } from "@/lib/mempool-data";
import { createJob, getJob, listComputeTypes, COMPUTE_PRICES } from "@/lib/compute-engine";
import { computeReputation, recordPaymentEvent, checkTrust, compareReputation, TRUST_THRESHOLDS } from "@/lib/agent-reputation";

/** Default paywall config — matches .env.example CASHU_MINT_URL */
const PAYWALL_CONFIG: CashuPaywallConfig = {
  priceSats: Number(process.env.L402_PRICE_SATS) || 100,
  mintUrl: process.env.CASHU_MINT_URL || "http://localhost:3338",
  unit: "sat",
  description: "ArxMint Agent API access",
};

/** Service-specific pricing */
const SERVICE_PRICES: Record<string, number> = {
  "privacy-audit": 200,
  "cycle-signals": 50,
  liquidity: 100,
  "network-intel": 100,
  compute: 500, // Default for compute — actual price per job type in COMPUTE_PRICES
  "verify-payment": 0,
  "wallet-status": 0,
  reputation: 30,
  "trust-check": 20,
  "compare-reputation": 50,
};

/** Singleton agent wallet — persists ecash proofs across requests within the same server process. */
let _agentWallet: AgentWallet | null = null;

function getAgentWallet(): AgentWallet {
  if (!_agentWallet) {
    _agentWallet = new AgentWallet({
      mintUrl: process.env.CASHU_MINT_URL || "http://localhost:3338",
      storage: new MemoryStorage(),
      budget: {
        maxPerOperationSats: 1000,
        maxPerSessionSats: 5000,
      },
    });
    logger.info("Agent wallet initialized (singleton, in-process persistence)", {
      action: "agent_wallet_init",
      mintUrl: process.env.CASHU_MINT_URL || "http://localhost:3338",
    });
  }
  return _agentWallet;
}

/**
 * Verify payment from either L402 or Cashu NUT-24.
 *
 * Returns:
 *  - { authenticated: true }  — valid payment, proceed
 *  - { authenticated: false, response402 }  — invalid payment, return the 402
 *  - { authenticated: false }  — no payment header present (caller builds 402)
 *
 * Dev bypass: SKIP_PAYMENT_VERIFY=true skips all checks (explicit override only).
 */
async function checkPayment(
  request: NextRequest,
  serviceName: string
): Promise<{
  authenticated: boolean;
  method: "l402" | "cashu" | "none" | "skip";
  response402?: NextResponse;
}> {
  // Explicit dev/test bypass — must be opted in, not on by default
  if (process.env.SKIP_PAYMENT_VERIFY === "true") {
    if (process.env.NODE_ENV === "production") {
      // FATAL: never bypass payment verification in production
      logger.error("SKIP_PAYMENT_VERIFY=true is not allowed in production — ignoring.", {
        action: "payment_bypass_blocked",
      });
      // Fall through to normal payment verification
    } else {
      logger.warn("DEV: SKIP_PAYMENT_VERIFY=true - skipping payment verification", {
        action: "payment_bypass_dev",
      });
      return { authenticated: true, method: "skip" };
    }
  }

  // Support both standard Authorization and X-Cashu alternative header
  const authHeader =
    request.headers.get("Authorization") ??
    request.headers.get("X-Cashu");

  const { method, token } = detectPaymentMethod(authHeader);

  // L402: Verify Aperture upstream proxy validated the payment.
  // Aperture sets X-Aperture-Verified header with APERTURE_SHARED_SECRET after
  // successful verification. Without a matching header the L402 token is not trusted.
  if (method === "l402") {
    const apertureToken = request.headers.get("X-Aperture-Verified");
    const expected = process.env.APERTURE_SHARED_SECRET;
    if (expected && apertureToken === expected) {
      return { authenticated: true, method: "l402" };
    }
    // L402 header present but not verified by Aperture proxy — treat as no payment
    return { authenticated: false, method: "l402" };
  }

  // Cashu NUT-24: Verify the ecash token directly against the mint.
  if (method === "cashu" && token) {
    const price = SERVICE_PRICES[serviceName] || PAYWALL_CONFIG.priceSats;
    const result = await verifyCashuPayment(token, {
      ...PAYWALL_CONFIG,
      priceSats: price,
    });

    if (result.paid) {
      return { authenticated: true, method: "cashu" };
    }

    // Payment failed — return 402 with error details
    const config = { ...PAYWALL_CONFIG, priceSats: price };
    return {
      authenticated: false,
      method: "cashu",
      response402: NextResponse.json(
        {
          error: "Payment verification failed",
          detail: result.error,
          required: price,
          received: result.amountSats,
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": buildCashuChallenge(config),
          },
        }
      ),
    };
  }

  // No payment header present — caller will build 402
  return { authenticated: false, method: "none" };
}

/**
 * Record a completed payment event for reputation tracking.
 * Uses X-Agent-Id header if provided by the calling agent.
 */
async function recordReputationEvent(
  request: NextRequest,
  method: "l402" | "cashu" | "skip",
  serviceName: string
): Promise<void> {
  const agentId = request.headers.get("X-Agent-Id");
  if (!agentId) return;

  const price = SERVICE_PRICES[serviceName] || PAYWALL_CONFIG.priceSats;
  if (price === 0) return;

  recordPaymentEvent({
    agentId,
    counterpartyId: "arxmint-agent-api",
    amountSats: price,
    direction: "sent",
    status: "completed",
    timestamp: Date.now(),
    metadata: { service: serviceName, paymentMethod: method },
  }).catch(() => {});
}

/**
 * GET /api/agent — Main agent query endpoint
 *
 * Payment required (unless SKIP_PAYMENT_VERIFY=true in env):
 *   - L402 (Lightning): Authorization: L402 <macaroon>:<preimage>
 *   - Cashu NUT-24:     Authorization: Cashu <cashuB...token>
 *                   or: X-Cashu: <cashuB...token>
 *
 * Returns 402 with NUT-24 challenge when no payment is provided.
 * Returns 401 when an invalid or spent Cashu token is provided.
 */
export async function GET(request: NextRequest) {
  // Validate remote signer config at request time, not module load time.
  // This prevents a misconfigured env from crashing the entire Next.js server.
  const signerCheck = validateRemoteSignerEnv(
    process.env as Record<string, string | undefined>
  );
  if (!signerCheck.valid) {
    return NextResponse.json(
      {
        error: "Remote signer not configured",
        details: signerCheck.errors.join("; "),
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") || "query";

  const payment = await checkPayment(request, service);

  // Cashu payment present but invalid/spent → 401
  if (payment.response402) {
    return payment.response402;
  }

  // No payment at all → 402 with NUT-24 + instructions
  if (!payment.authenticated) {
    const price = SERVICE_PRICES[service] || PAYWALL_CONFIG.priceSats;
    const config = { ...PAYWALL_CONFIG, priceSats: price };
    return NextResponse.json(
      {
        error: "Payment required",
        message:
          "Pay via Cashu ecash (NUT-24) or Lightning (L402) to access this service.",
        price_sats: price,
        payment_methods: [
          "Cashu NUT-24: Authorization: Cashu <cashuB_token>",
          "Cashu NUT-24 (alt): X-Cashu: <cashuB_token>",
          "L402 Lightning: Authorization: L402 <macaroon>:<preimage>",
        ],
        hint: `Obtain a Cashu token from your mint at ${PAYWALL_CONFIG.mintUrl}`,
      },
      {
        status: 402,
        headers: {
          "WWW-Authenticate": buildCashuChallenge(config),
        },
      }
    );
  }

  const paymentMethod = payment.method;

  // Record payment for reputation tracking (best-effort, never blocks)
  recordReputationEvent(request, paymentMethod, service);

  // Route to the right agent service
  switch (service) {
    case "privacy-audit": {
      const privacyConfig = PRIVACY_PRESETS.standard;
      const score = computePrivacyScore(privacyConfig);

      // Recommend layers that are available but not yet enabled
      const recommendations = (
        Object.keys(PRIVACY_DESCRIPTIONS) as Array<keyof typeof PRIVACY_DESCRIPTIONS>
      )
        .filter((layer) => !privacyConfig[layer] && isLayerAvailable(layer, "cashu"))
        .map((layer) => `${PRIVACY_DESCRIPTIONS[layer].name}: ${PRIVACY_DESCRIPTIONS[layer].short}`);

      // Build per-layer breakdown
      const breakdown = Object.fromEntries(
        (Object.keys(PRIVACY_DESCRIPTIONS) as Array<keyof typeof PRIVACY_DESCRIPTIONS>).map(
          (layer) => [
            layer,
            {
              status: privacyConfig[layer]
                ? isLayerAvailable(layer, "cashu")
                  ? "active"
                  : "limited"
                : "available",
              privacy: PRIVACY_DESCRIPTIONS[layer].status,
            },
          ]
        )
      );

      return NextResponse.json({
        service: "privacy-audit",
        paymentMethod,
        audit: {
          score,
          grade: score >= 80 ? "A" : score >= 60 ? "B" : "C",
          recommendations,
          breakdown,
          computed_at: new Date().toISOString(),
        },
      });
    }

    case "liquidity": {
      try {
        const [cycleMetrics, stats, fees] = await Promise.all([
          getCycleMetrics(),
          getMempoolStats(),
          getFeeEstimates(),
        ]);
        const routing = computeRoutingAdvice(stats, fees);

        const btcAction: string =
          cycleMetrics.signal === "strong-buy"
            ? "Aggressively convert USD → BTC. Mempool is " +
              routing.mempoolCongestion +
              ". Use Lightning for small buys (" +
              routing.recommendedFee +
              " on-chain)."
            : cycleMetrics.signal === "buy"
              ? "DCA into BTC. Current on-chain fee: " +
                fees.fastestFee +
                " sat/vB."
              : cycleMetrics.signal === "sell" || cycleMetrics.signal === "strong-sell"
                ? "Cycle top signals firing. Spend BTC on productive assets. " +
                  routing.mempoolCongestion +
                  " mempool — expect " +
                  (routing.lightningRecommended ? "use Lightning" : "on-chain is fine") +
                  "."
                : "Hold. Mempool " +
                  routing.mempoolCongestion +
                  " (" +
                  stats.count +
                  " tx pending).";

        return NextResponse.json({
          service: "liquidity",
          paymentMethod,
          treasury: {
            cycle: {
              signal: cycleMetrics.signal,
              mvrv: cycleMetrics.mvrv,
              nupl: cycleMetrics.nupl,
              supplyInProfit: cycleMetrics.supplyInProfit,
              price: cycleMetrics.price,
            },
            network: {
              mempoolTxCount: stats.count,
              mempoolVSize: stats.vsize,
              congestion: routing.mempoolCongestion,
              fees,
              recommendedFee: routing.recommendedFee,
            },
            action: btcAction,
            routingRecommendation: routing.lightningRecommended
              ? "Lightning"
              : routing.mempoolCongestion === "low"
                ? "On-chain"
                : "Ecash (instant, zero-fee)",
          },
          timestamp: Date.now(),
        });
      } catch (error: unknown) {
        logger.warn("liquidity live fetch failed; returning degraded signal", {
          error: error instanceof Error ? error.message : String(error),
          action: "liquidity_fallback",
        });
        try {
          const cycleMetrics = await getCycleMetrics();
          return NextResponse.json({
            service: "liquidity",
            paymentMethod,
            degraded: true,
            treasury: {
              cycle: {
                signal: cycleMetrics.signal,
                mvrv: cycleMetrics.mvrv,
                nupl: cycleMetrics.nupl,
                supplyInProfit: cycleMetrics.supplyInProfit,
                price: cycleMetrics.price,
              },
              network: { note: "mempool data unavailable" },
            },
            timestamp: Date.now(),
          });
        } catch {
          return NextResponse.json({
            service: "liquidity",
            error: "All data sources unavailable",
            cached: { signal: "neutral", action: "Hold. Check again later." },
          });
        }
      }
    }

    case "cycle-signals": {
      try {
        const metrics = await getCycleMetrics();
        return NextResponse.json({
          service: "cycle-signals",
          paymentMethod,
          signals: {
            ...metrics,
            recommendation:
              metrics.signal === "strong-buy" || metrics.signal === "buy"
                ? "Accumulate BTC. Convert USD reserves."
                : metrics.signal === "sell" || metrics.signal === "strong-sell"
                  ? "Consider spending BTC on real goods/assets."
                  : "Hold steady. Stack normally.",
          },
          timestamp: Date.now(),
        });
      } catch (error: unknown) {
        logger.warn("cycle-signals live fetch failed; returning cached signal", {
          error: error instanceof Error ? error.message : String(error),
          action: "cycle_signals_fallback",
        });
        return NextResponse.json({
          service: "cycle-signals",
          error: "Failed to fetch live data — returning cached signal",
          cached: {
            signal: "neutral",
            recommendation: "Hold steady. Stack normally.",
          },
        });
      }
    }

    case "compute": {
      const ct = (searchParams.get("type") || "hash").toLowerCase();
      const inputParam = searchParams.get("input");
      const jobId = searchParams.get("jobId");

      if (jobId) {
        const job = getJob(jobId);
        if (!job) {
          return NextResponse.json({ error: "Job not found", jobId }, { status: 404 });
        }
        return NextResponse.json({
          service: "compute",
          paymentMethod,
          job,
        }, {
          headers: job.status === "completed"
            ? { "X-Job-Status": "completed" }
            : { "Retry-After": "2" },
        });
      }

      if (!inputParam) {
        const types = listComputeTypes();
        return NextResponse.json({
          service: "compute",
          paymentMethod,
          message: "Supply ?type=<jobType>&input=<json>. Use ?type=list to see available types.",
          availableTypes: types,
          hint: "POST also accepted for larger inputs.",
        });
      }

      let input: unknown;
      try {
        input = JSON.parse(inputParam);
      } catch {
        input = inputParam;
      }

      const price = COMPUTE_PRICES[ct] || COMPUTE_PRICES.generic;
      const job = createJob(ct, input);

      return NextResponse.json({
        service: "compute",
        paymentMethod,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          costSats: price,
          createdAt: job.createdAt,
        },
        pollUrl: `/api/agent?service=compute&jobId=${job.id}`,
      });
    }

    case "data":
    case "network-intel":
      return NextResponse.json({
        service: "network-intel",
        paymentMethod,
        intel: await getNetworkIntel(),
        datasets: [
          {
            id: "btc-mempool",
            name: "BTC Mempool (live)",
            description: "Real-time mempool size, fee rates, and tx backlog",
            price_sats: 50,
            format: "json",
            source: "mempool.space",
          },
          {
            id: "lightning-network",
            name: "Lightning Network (live)",
            description: "Node count, channel count, total capacity",
            price_sats: 75,
            format: "json",
            source: "mempool.space",
          },
          {
            id: "fee-estimates",
            name: "Fee Estimates (live)",
            description: "Recommended fee rates — fastest, hour, economy",
            price_sats: 30,
            format: "json",
            source: "mempool.space",
          },
          {
            id: "routing-advice",
            name: "Payment Routing Advice (computed)",
            description: "Congestion-aware Lightning vs ecash vs on-chain routing recommendation",
            price_sats: 40,
            format: "json",
            source: "computed",
          },
        ],
        timestamp: Date.now(),
      });

    case "reputation": {
      const targetId = searchParams.get("agentId") || searchParams.get("id");
      if (!targetId) {
        return NextResponse.json(
          { error: "Missing ?agentId=<rootId> parameter" },
          { status: 400 }
        );
      }
      const rep = await computeReputation(targetId);
      return NextResponse.json({
        service: "reputation",
        paymentMethod,
        reputation: rep,
      });
    }

    case "trust-check": {
      const targetId = searchParams.get("agentId") || searchParams.get("id");
      const action = searchParams.get("action") || "browse-bazaar";
      if (!targetId) {
        return NextResponse.json(
          { error: "Missing ?agentId=<rootId> parameter" },
          { status: 400 }
        );
      }
      if (!(action in TRUST_THRESHOLDS)) {
        return NextResponse.json(
          {
            error: "Unknown action",
            validActions: Object.keys(TRUST_THRESHOLDS),
          },
          { status: 400 }
        );
      }
      const trust = await checkTrust(
        targetId,
        action as keyof typeof TRUST_THRESHOLDS
      );
      return NextResponse.json({
        service: "trust-check",
        paymentMethod,
        agentId: targetId,
        action,
        ...trust,
      });
    }

    case "compare-reputation": {
      const a = searchParams.get("a");
      const b = searchParams.get("b");
      if (!a || !b) {
        return NextResponse.json(
          { error: "Missing ?a=<agentId>&b=<agentId> parameters" },
          { status: 400 }
        );
      }
      const comparison = await compareReputation(a, b);
      return NextResponse.json({
        service: "compare-reputation",
        paymentMethod,
        ...comparison,
      });
    }

    case "verify-payment": {
      // Payment verification service for downstream TE services (e.g. teneo-publishing).
      // If we reach here, checkPayment() already verified the payment is valid.
      const verifyWallet = getAgentWallet();
      return NextResponse.json({
        service: "verify-payment",
        verified: true,
        paymentMethod,
        amount_sats: SERVICE_PRICES[service] || PAYWALL_CONFIG.priceSats,
        wallet: {
          balance_sats: verifyWallet.getBalance(),
          budget: verifyWallet.getBudgetState(),
        },
        timestamp: Date.now(),
      });
    }

    case "wallet-status": {
      const statusWallet = getAgentWallet();
      return NextResponse.json({
        service: "wallet-status",
        paymentMethod,
        wallet: {
          balance_sats: statusWallet.getBalance(),
          budget: statusWallet.getBudgetState(),
          audit_log: statusWallet.exportAuditLog(),
        },
        timestamp: Date.now(),
      });
    }

    default:
      return NextResponse.json({
        service: "agent-query",
        paymentMethod,
        message: "ArxMint Agent API",
        available_services: [
          "privacy-audit",
          "cycle-signals",
          "liquidity",
          "network-intel",
          "compute",
          "reputation",
          "trust-check",
          "compare-reputation",
          "verify-payment",
          "wallet-status",
        ],
        pricing: {
          "privacy-audit": "200 sats",
          "cycle-signals": "50 sats",
          liquidity: "100 sats (cycle + mempool treasury intelligence)",
          "network-intel": "100 sats (live mempool.space data)",
          compute: "100-500 sats/job (hash, verify, derive, merkle-proof)",
          reputation: "30 sats (agent reputation score + tier)",
          "trust-check": "20 sats (permission check for commerce action)",
          "compare-reputation": "50 sats (compare two agents)",
          "verify-payment": "0 sats (TE service verification)",
          "wallet-status": "0 sats (agent introspection)",
        },
        payment_methods: [
          "L402 (Lightning): Pay BOLT11 invoice, include preimage in Authorization header",
          "Cashu NUT-24: Send ecash token in Authorization: Cashu <token>",
        ],
        timestamp: Date.now(),
      });
  }
}

