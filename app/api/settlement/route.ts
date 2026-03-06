// ============================================================
// ArxMint — Federation Ecash Settlement Endpoint
// POST /api/settlement — initiate a referral fee settlement
// GET  /api/settlement  — list settlements (by saleId query param)
//
// Called by Teneo Marketplace when a referral sale completes.
// Initiates Cashu ecash minting or Fedimint deposit for the fee.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { Wallet } from "@cashu/cashu-ts";
import { db } from "@/lib/db";
import {
  checkDailyVolumeCap,
  checkSingleTxCap,
  ValueCapError,
} from "@/lib/value-caps";
import { logger } from "@/lib/logger";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { checkPrincipalAndIpRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { observeApiRoute } from "@/lib/api-observability";

// ---- Types --------------------------------------------------

interface SettlementRequest {
  saleAmount: number;
  referralFeePct: number;
  recipientFedimintInvite?: string;
  recipientCashuAddress?: string;
  saleId: string;
  communityId?: string;
}

interface SettlementRecord {
  txId: string;
  saleId: string;
  feeAmount: number;
  method: "cashu" | "fedimint";
  status: "pending" | "initiated" | "completed" | "failed";
  invoice?: string;
  initiatedBy?: string;
  createdAt: number;
}

// In-process idempotency cache (backs up the DB query)
const _settlements = new Map<string, SettlementRecord>();

// ---- Helpers ------------------------------------------------

function buildNotesJson(saleId: string, extra?: object): string {
  return JSON.stringify({ saleId, ...extra });
}

async function findExistingSettlement(
  saleId: string
): Promise<SettlementRecord | null> {
  // In-memory fast path
  const cached = _settlements.get(saleId);
  if (cached) return cached;

  // Persistent DB check: notes starts with { "saleId":"<saleId>"
  try {
    const existing = await db.transaction.findFirst({
      where: {
        type: "settlement",
        notes: { startsWith: `{"saleId":"${saleId}"` },
      },
      orderBy: { timestamp: "desc" },
    });
    if (existing) {
      let parsedNotes: Record<string, unknown> = {};
      try {
        parsedNotes = JSON.parse(existing.notes ?? "{}");
      } catch (error: unknown) {
        logger.warn("findExistingSettlement notes parse failed", {
          saleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      const record: SettlementRecord = {
        txId: existing.id,
        saleId,
        feeAmount: existing.amount,
        method: (parsedNotes.method as "cashu" | "fedimint") ?? "cashu",
        status: (existing.status as SettlementRecord["status"]) ?? "initiated",
        invoice: (parsedNotes.invoice as string) ?? undefined,
        initiatedBy: (parsedNotes.initiatedBy as string) ?? undefined,
        createdAt: existing.timestamp.getTime(),
      };
      _settlements.set(saleId, record);
      return record;
    }
  } catch (error: unknown) {
    logger.warn("findExistingSettlement DB lookup failed; using in-memory cache only", {
      saleId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
}

function utcDayStart(date = new Date()): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function getTodaySettlementVolumeSats(communityId: string): Promise<number> {
  const start = utcDayStart();
  const next = new Date(start);
  next.setUTCDate(start.getUTCDate() + 1);

  const aggregate = await db.transaction.aggregate({
    _sum: { amount: true },
    where: {
      communityId,
      type: "settlement",
      timestamp: { gte: start, lt: next },
      status: { not: "failed" },
    },
  });
  return aggregate._sum.amount ?? 0;
}

async function createCashuMintQuote(
  feeAmount: number,
  mintUrl: string
): Promise<{ invoice: string; quoteId: string } | null> {
  try {
    const wallet = new Wallet(mintUrl);
    const quote = await wallet.createMintQuoteBolt11(feeAmount);
    return { invoice: quote.request, quoteId: quote.quote };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Cashu mint quote creation failed", { error: message });
    return null;
  }
}

// ---- POST /api/settlement -----------------------------------

export async function POST(request: NextRequest) {
  return observeApiRoute(request, "/api/settlement", async () => {
  // Require auth: accept ArxMint session cookie, Bearer JWT, or X-Marketplace-Secret
  // header (server-to-server from Teneo Marketplace via MARKETPLACE_SHARED_SECRET).
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkPrincipalAndIpRateLimit(
    "settlement-create",
    ip,
    caller,
    RATE_LIMITS.settlementWrite
  );
  if (!rl.allowed) {
    logger.rateLimit(ip, "/api/settlement", rl.retryAfter ?? 60);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  let body: Partial<SettlementRequest>;
  try {
    body = await request.json();
  } catch (error: unknown) {
    logger.warn("POST /api/settlement invalid JSON body", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { saleAmount, referralFeePct, recipientFedimintInvite, recipientCashuAddress, saleId, communityId } = body;

  // ---- Input validation ----
  if (!saleId || typeof saleId !== "string" || saleId.trim() === "") {
    return NextResponse.json({ error: "saleId is required" }, { status: 400 });
  }

  if (!saleAmount || typeof saleAmount !== "number" || saleAmount <= 0) {
    return NextResponse.json({ error: "saleAmount must be a positive number (sats)" }, { status: 400 });
  }

  if (
    typeof referralFeePct !== "number" ||
    referralFeePct <= 0 ||
    referralFeePct > 1
  ) {
    return NextResponse.json(
      { error: "referralFeePct must be a number between 0 and 1 (e.g., 0.15 for 15%)" },
      { status: 400 }
    );
  }

  if (!recipientFedimintInvite && !recipientCashuAddress) {
    return NextResponse.json(
      { error: "Provide recipientCashuAddress or recipientFedimintInvite" },
      { status: 400 }
    );
  }

  const feeAmount = Math.floor(saleAmount * referralFeePct);
  const effectiveCommunityId = communityId ?? "marketplace";
  if (feeAmount < 1) {
    return NextResponse.json(
      { error: "Calculated fee is less than 1 sat — too small to settle" },
      { status: 400 }
    );
  }

  try {
    checkSingleTxCap(feeAmount);
    const todayVolumeSats = await getTodaySettlementVolumeSats(effectiveCommunityId);
    checkDailyVolumeCap(todayVolumeSats, feeAmount);
  } catch (e: unknown) {
    if (e instanceof ValueCapError) {
      return NextResponse.json(
        { error: e.message, code: "VALUE_CAP_EXCEEDED" },
        { status: 400 }
      );
    }
  }

  // ---- Idempotency ----
  const existing = await findExistingSettlement(saleId);
  if (existing) {
    return NextResponse.json(
      {
        idempotent: true,
        message: "Settlement already processed for this saleId",
        settlement: existing,
      },
      { status: 200 }
    );
  }

  // ---- Route to Cashu or Fedimint ----
  const method: "cashu" | "fedimint" = recipientCashuAddress ? "cashu" : "fedimint";
  const mintUrl = process.env.CASHU_MINT_URL ?? "http://localhost:3338";

  let invoice: string | undefined;
  let quoteId: string | undefined;
  let status: SettlementRecord["status"] = "initiated";
  let extraNotes: Record<string, unknown> = { initiatedBy: caller };

  if (method === "cashu") {
    // Create a Cashu mint quote (bolt11 invoice) for the fee amount.
    // The caller funds this invoice; upon payment ArxMint mints ecash
    // and sends it to the recipientCashuAddress.
    const quote = await createCashuMintQuote(feeAmount, mintUrl);
    if (quote) {
      invoice = quote.invoice;
      quoteId = quote.quoteId;
      extraNotes = {
        ...extraNotes,
        method: "cashu",
        mintUrl,
        invoice,
        quoteId,
        recipientCashuAddress,
      };
    } else if (process.env.NODE_ENV !== "production") {
      // Dev fallback: accept without a real invoice
      invoice = "lnbc1dev_settlement_placeholder_not_payable";
      extraNotes = {
        ...extraNotes,
        method: "cashu",
        mintUrl,
        invoice,
        recipientCashuAddress,
        devMode: true,
      };
    } else {
      return NextResponse.json(
        { error: "Failed to create Cashu mint quote — check CASHU_MINT_URL" },
        { status: 502 }
      );
    }
  } else {
    // Fedimint: the actual WASM join + deposit must be triggered client-side.
    // We record the initiation and return instructions to the caller.
    extraNotes = {
      ...extraNotes,
      method: "fedimint",
      recipientFedimintInvite,
      status: "awaiting_client_deposit",
    };
    status = "initiated";
  }

  // ---- Persist to Transaction table ----
  const notes = buildNotesJson(saleId, extraNotes);

  let txId: string;
  try {
    const tx = await db.transaction.create({
      data: {
        communityId: effectiveCommunityId,
        type: "settlement",
        amount: feeAmount,
        backend: method,
        status,
        counterparty: recipientCashuAddress ?? recipientFedimintInvite ?? null,
        notes,
      },
    });
    txId = tx.id;
  } catch (err: unknown) {
    // DB unavailable — generate a temp ID and continue
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Could not persist settlement to DB", { error: message });
    txId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const record: SettlementRecord = {
    txId,
    saleId,
    feeAmount,
    method,
    status,
    invoice,
    initiatedBy: caller,
    createdAt: Date.now(),
  };

  // Cache in-process for idempotency
  _settlements.set(saleId, record);

  logger.payment("settlement_initiated", {
    amount: feeAmount,
    backend: method,
    status,
  });

  const response: Record<string, unknown> = {
    settlementId: txId,
    saleId,
    feeAmount,
    method,
    status,
  };

  if (method === "cashu") {
    response.invoice = invoice;
    response.mintUrl = mintUrl;
    response.instructions = [
      `1. Pay the Lightning invoice to fund the Cashu mint quote (${feeAmount} sats)`,
      `2. Once paid, the ArxMint node will mint ecash and send it to ${recipientCashuAddress}`,
      `3. Check settlement status: GET /api/settlement/${txId}`,
    ];
  } else {
    response.recipientFedimintInvite = recipientFedimintInvite;
    response.instructions = [
      `1. The recipient must join the federation using the provided invite code`,
      `2. ArxMint will deposit ${feeAmount} sats into the federation when the client-side wallet confirms`,
      `3. Check settlement status: GET /api/settlement/${txId}`,
    ];
  }

  return NextResponse.json(response, { status: 201 });
  });
}

// ---- GET /api/settlement ------------------------------------

export async function GET(request: NextRequest) {
  return observeApiRoute(request, "/api/settlement", async () => {
  const caller = getCallerFromRequest(request);
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkPrincipalAndIpRateLimit(
    "settlement-read",
    ip,
    caller,
    RATE_LIMITS.settlementWrite
  );
  if (!rl.allowed) {
    logger.rateLimit(ip, "/api/settlement", rl.retryAfter ?? 60);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get("saleId");

  if (!saleId) {
    return NextResponse.json(
      { error: "Pass ?saleId=<id> to look up a settlement" },
      { status: 400 }
    );
  }

  const settlement = await findExistingSettlement(saleId);
  if (!settlement) {
    return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  }

  // Unauthenticated callers receive public fields only — no sensitive payment details
  if (!caller) {
    return NextResponse.json({
      settlementId: settlement.txId,
      status: settlement.status,
      amount: settlement.feeAmount,
      createdAt: settlement.createdAt,
    });
  }

  // Authenticated: verify caller has access (initiator or marketplace system)
  if (caller !== "marketplace-system") {
    if (!settlement.initiatedBy || settlement.initiatedBy !== caller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Return full details — raw notes blob never included in response
  return NextResponse.json({
    settlementId: settlement.txId,
    saleId: settlement.saleId,
    feeAmount: settlement.feeAmount,
    method: settlement.method,
    status: settlement.status,
    invoice: settlement.invoice ?? null,
    createdAt: settlement.createdAt,
  });
  });
}
