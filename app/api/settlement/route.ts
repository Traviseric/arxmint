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
      } catch {
        /* ignore */
      }
      const record: SettlementRecord = {
        txId: existing.id,
        saleId,
        feeAmount: existing.amount,
        method: (parsedNotes.method as "cashu" | "fedimint") ?? "cashu",
        status: (existing.status as SettlementRecord["status"]) ?? "initiated",
        invoice: (parsedNotes.invoice as string) ?? undefined,
        createdAt: existing.timestamp.getTime(),
      };
      _settlements.set(saleId, record);
      return record;
    }
  } catch {
    // DB unavailable — rely on in-memory only
  }
  return null;
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
    console.warn("[ArxMint] Cashu mint quote creation failed:", message);
    return null;
  }
}

// ---- POST /api/settlement -----------------------------------

export async function POST(request: NextRequest) {
  // Auth is optional here: marketplace tokens accepted via getCallerFromRequest
  // but we don't block unauthenticated calls for the settlement endpoint
  // (called by server-to-server from Teneo Marketplace).

  let body: Partial<SettlementRequest>;
  try {
    body = await request.json();
  } catch {
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
  if (feeAmount < 1) {
    return NextResponse.json(
      { error: "Calculated fee is less than 1 sat — too small to settle" },
      { status: 400 }
    );
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
  let extraNotes: Record<string, unknown> = {};

  if (method === "cashu") {
    // Create a Cashu mint quote (bolt11 invoice) for the fee amount.
    // The caller funds this invoice; upon payment ArxMint mints ecash
    // and sends it to the recipientCashuAddress.
    const quote = await createCashuMintQuote(feeAmount, mintUrl);
    if (quote) {
      invoice = quote.invoice;
      quoteId = quote.quoteId;
      extraNotes = {
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
      method: "fedimint",
      recipientFedimintInvite,
      status: "awaiting_client_deposit",
    };
    status = "initiated";
  }

  // ---- Persist to Transaction table ----
  const notes = buildNotesJson(saleId, extraNotes);
  const effectiveCommunityId = communityId ?? "marketplace";

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
    console.warn("[ArxMint] Could not persist settlement to DB:", message);
    txId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const record: SettlementRecord = {
    txId,
    saleId,
    feeAmount,
    method,
    status,
    invoice,
    createdAt: Date.now(),
  };

  // Cache in-process for idempotency
  _settlements.set(saleId, record);

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
}

// ---- GET /api/settlement ------------------------------------

export async function GET(request: NextRequest) {
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

  return NextResponse.json({ settlement });
}
