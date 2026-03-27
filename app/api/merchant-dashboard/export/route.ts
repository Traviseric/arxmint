// ============================================================
// ArxMint — Merchant Dashboard CSV Export API
// GET /api/merchant-dashboard/export?merchantId=xxx&from=2026-03-01&to=2026-03-27&format=csv
// Returns a QuickBooks-compatible 4-column CSV download:
//   Date, Description, Credit (USD), Debit (USD)
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

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices", {
      next: { revalidate: 300 },
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

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-export:ip:${ip}`, RATE_LIMITS.payment);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!merchantId) {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId query param is required.");
  }

  const LNBITS_URL = process.env.LNBITS_URL;
  if (!LNBITS_URL) {
    return apiError(503, "LNBITS_NOT_CONFIGURED", "Payment system is not configured.");
  }

  // Look up merchant's LNbits invoice key from Supabase
  const { supabase } = await import("@/lib/supabase");
  const { data: wallet } = await supabase
    .from("merchant_wallets")
    .select("lnbits_invoice_key")
    .eq("merchant_id", merchantId)
    .single();

  const invoiceKey = wallet?.lnbits_invoice_key || process.env.LNBITS_INVOICE_KEY;
  if (!invoiceKey) {
    return apiError(404, "WALLET_NOT_FOUND", "Merchant wallet not found.");
  }

  const fromSec = fromParam ? Math.floor(new Date(fromParam).getTime() / 1000) : null;
  const toSec = toParam ? Math.floor(new Date(toParam + "T23:59:59").getTime() / 1000) : null;

  try {
    const [raw, btcPriceUsd] = await Promise.all([
      fetch(`${LNBITS_URL}/api/v1/payments?limit=1000`, {
        headers: { "X-Api-Key": invoiceKey },
        next: { revalidate: 0 },
      }).then((r) => (r.ok ? (r.json() as Promise<LNbitsPayment[]>) : [])),
      fetchBtcPrice(),
    ]);

    const payments = raw as LNbitsPayment[];

    // Filter by date range and paid status
    let filtered = payments.filter((p) => p.paid);
    if (fromSec !== null) filtered = filtered.filter((p) => p.time >= fromSec);
    if (toSec !== null) filtered = filtered.filter((p) => p.time <= toSec);

    // Sort oldest first for accounting
    filtered.sort((a, b) => a.time - b.time);

    // Build CSV
    const rows: string[] = ["Date,Description,Credit (USD),Debit (USD)"];

    for (const p of filtered) {
      const date = new Date(p.time * 1000).toISOString().split("T")[0];
      const sats = Math.floor(Math.abs(p.amount) / 1000);
      const usd = satsToUsd(sats, btcPriceUsd).toFixed(2);
      const description = escapeCsv(
        p.memo || `Lightning payment (${sats} sats)`
      );

      if (p.amount > 0) {
        // Inbound = credit
        rows.push(`${date},${description},${usd},`);
      } else {
        // Outbound = debit
        rows.push(`${date},${description},,${usd}`);
      }
    }

    const csv = rows.join("\n");
    const fromLabel = fromParam || "all";
    const toLabel = toParam || "now";
    const filename = `arxmint-transactions-${merchantId}-${fromLabel}-${toLabel}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.warn("merchant_export_error", {
      error: error instanceof Error ? error.message : String(error),
      merchantId,
    });
    return apiError(500, "EXPORT_FAILED", "Failed to generate export.");
  }
}
