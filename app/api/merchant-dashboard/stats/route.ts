// ============================================================
// ArxMint — Merchant Dashboard Stats API
// GET /api/merchant-dashboard/stats?merchantId=xxx
// Returns today's payment summary + balance from LNbits
// with USD conversion via mempool.space price API.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

interface LNbitsPayment {
  payment_hash: string;
  amount: number; // millisats (negative = outbound)
  memo: string | null;
  time: number; // unix timestamp
  paid: boolean;
  pending: boolean;
  checking_id: string;
}

interface LNbitsWalletInfo {
  id: string;
  name: string;
  balance: number; // millisats
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
  const rl = checkRateLimit(`rl:merchant-stats:ip:${ip}`, RATE_LIMITS.public);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");

  if (!merchantId) {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId query param is required.");
  }

  const LNBITS_URL = process.env.LNBITS_URL;
  if (!LNBITS_URL) {
    return NextResponse.json({
      todayTotal: 0,
      todayTotalUsd: 0,
      todayCount: 0,
      recentPayments: [],
      balance: 0,
      balanceUsd: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }

  // Look up merchant's LNbits invoice key from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data: wallet, error: walletError } = await supabase
    .from("merchant_wallets")
    .select("lnbits_invoice_key, lnbits_wallet_id")
    .eq("merchant_id", merchantId)
    .single();

  if (walletError || !wallet) {
    // Fall back to global env key for seed merchants
    const fallbackKey = process.env.LNBITS_INVOICE_KEY;
    if (!fallbackKey) {
      return NextResponse.json({
        todayTotal: 0,
        todayTotalUsd: 0,
        todayCount: 0,
        recentPayments: [],
        balance: 0,
        balanceUsd: 0,
        btcPriceUsd: 0,
        lnbitsAvailable: false,
      });
    }
    // Use fallback key for seed merchants
    return fetchAndReturnStats(LNBITS_URL, fallbackKey, null);
  }

  return fetchAndReturnStats(LNBITS_URL, wallet.lnbits_invoice_key, wallet.lnbits_wallet_id);
}

async function fetchAndReturnStats(
  baseUrl: string,
  invoiceKey: string,
  walletId: string | null
): Promise<NextResponse> {
  try {
    const [paymentsRaw, btcPriceUsd, walletInfo] = await Promise.all([
      fetch(`${baseUrl}/api/v1/payments?limit=100`, {
        headers: { "X-Api-Key": invoiceKey },
        next: { revalidate: 0 },
      }).then((r) => (r.ok ? (r.json() as Promise<LNbitsPayment[]>) : [])),
      fetchBtcPrice(),
      walletId
        ? fetch(`${baseUrl}/api/v1/wallet`, {
            headers: { "X-Api-Key": invoiceKey },
            next: { revalidate: 0 },
          }).then((r) => (r.ok ? (r.json() as Promise<LNbitsWalletInfo>) : null))
        : Promise.resolve(null),
    ]);

    const payments = paymentsRaw as LNbitsPayment[];

    // Today's payments (inbound only)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartSec = Math.floor(todayStart.getTime() / 1000);

    const todayPayments = payments.filter(
      (p) => p.paid && p.amount > 0 && p.time >= todayStartSec
    );

    const todayTotalMsats = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayTotalSats = Math.floor(todayTotalMsats / 1000);

    // Recent payments (last 5 inbound)
    const recentPaid = payments
      .filter((p) => p.paid && p.amount > 0)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
      .map((p) => ({
        id: p.payment_hash,
        amount: Math.floor(p.amount / 1000),
        amountUsd: satsToUsd(Math.floor(p.amount / 1000), btcPriceUsd),
        memo: p.memo,
        time: p.time,
        date: new Date(p.time * 1000).toISOString(),
      }));

    // Balance
    const balanceMsats = walletInfo?.balance ?? 0;
    const balanceSats = Math.floor(balanceMsats / 1000);

    return NextResponse.json({
      todayTotal: todayTotalSats,
      todayTotalUsd: satsToUsd(todayTotalSats, btcPriceUsd),
      todayCount: todayPayments.length,
      recentPayments: recentPaid,
      balance: balanceSats,
      balanceUsd: satsToUsd(balanceSats, btcPriceUsd),
      btcPriceUsd,
      lnbitsAvailable: true,
    });
  } catch (error) {
    logger.warn("merchant_stats_fetch_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      todayTotal: 0,
      todayTotalUsd: 0,
      todayCount: 0,
      recentPayments: [],
      balance: 0,
      balanceUsd: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }
}
