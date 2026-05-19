// ============================================================
// ArxMint — Merchant Dashboard Transactions API
// GET /api/merchant-dashboard/transactions
// Query params: merchantId (required), page, limit, from, to
// Returns paginated LNbits payment history with USD conversion.
// Looks up merchant's invoice key from Supabase merchant_wallets.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { requireMerchantDashboardAccess } from "@/lib/merchant-dashboard-auth";

interface LNbitsPayment {
  payment_hash: string;
  amount: number; // millisats
  memo: string | null;
  time: number; // unix timestamp
  paid: boolean;
  pending: boolean;
  checking_id: string;
}

export interface TransactionRow {
  id: string;
  amountSats: number;
  amountUsd: number;
  memo: string | null;
  status: "paid" | "pending" | "expired";
  time: number; // unix timestamp
  date: string; // ISO string
}

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices", {
      next: { revalidate: 300 }, // 5-minute cache
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.USD === "number" ? data.USD : 0;
  } catch {
    return 0;
  }
}

function satsToUsd(sats: number, btcPrice: number): number {
  if (btcPrice <= 0) return 0;
  return Math.round((sats / 100_000_000) * btcPrice * 100) / 100;
}

export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-txns:ip:${ip}`, RATE_LIMITS.public);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!merchantId) {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId query param is required.");
  }

  const authError = await requireMerchantDashboardAccess(request, merchantId, "read");
  if (authError) return authError;

  const LNBITS_URL = process.env.LNBITS_URL;
  if (!LNBITS_URL) {
    return NextResponse.json({
      transactions: [],
      total: 0,
      page: 1,
      pages: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }

  // Look up merchant's LNbits invoice key from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data: wallet } = await supabase
    .from("merchant_wallets")
    .select("lnbits_invoice_key")
    .eq("merchant_id", merchantId)
    .single();

  // Fall back to global env key for seed merchants
  const invoiceKey = wallet?.lnbits_invoice_key || process.env.LNBITS_INVOICE_KEY;
  if (!invoiceKey) {
    return NextResponse.json({
      transactions: [],
      total: 0,
      page: 1,
      pages: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }

  const fromSec = fromParam ? Math.floor(new Date(fromParam).getTime() / 1000) : null;
  const toSec = toParam ? Math.floor(new Date(toParam + "T23:59:59").getTime() / 1000) : null;

  try {
    const [raw, btcPriceUsd] = await Promise.all([
      fetch(`${LNBITS_URL}/api/v1/payments?limit=200`, {
        headers: { "X-Api-Key": invoiceKey },
        next: { revalidate: 0 },
      }).then((r) => (r.ok ? (r.json() as Promise<LNbitsPayment[]>) : [])),
      fetchBtcPrice(),
    ]);

    // Only inbound payments (amount > 0)
    let filtered = (raw as LNbitsPayment[]).filter((p) => p.amount > 0);

    if (fromSec !== null) filtered = filtered.filter((p) => p.time >= fromSec);
    if (toSec !== null) filtered = filtered.filter((p) => p.time <= toSec);

    // Sort newest first
    filtered.sort((a, b) => b.time - a.time);

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const slice = filtered.slice((page - 1) * limit, page * limit);

    const transactions: TransactionRow[] = slice.map((p) => {
      const amountSats = Math.floor(p.amount / 1000);
      return {
        id: p.payment_hash,
        amountSats,
        amountUsd: satsToUsd(amountSats, btcPriceUsd),
        memo: p.memo || null,
        status: p.paid ? "paid" : p.pending ? "pending" : "expired",
        time: p.time,
        date: new Date(p.time * 1000).toISOString(),
      };
    });

    return NextResponse.json({
      transactions,
      total,
      page,
      pages,
      btcPriceUsd,
      lnbitsAvailable: true,
    });
  } catch (error) {
    logger.warn("merchant_transactions_fetch_error", {
      error: error instanceof Error ? error.message : String(error),
      merchantId,
    });
    return NextResponse.json({
      transactions: [],
      total: 0,
      page: 1,
      pages: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }
}
