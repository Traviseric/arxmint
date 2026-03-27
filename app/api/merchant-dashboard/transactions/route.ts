// ============================================================
// ArxMint — Merchant Dashboard Transactions API
// GET /api/merchant-dashboard/transactions
// Query params: page (default 1), limit (default 10, max 50)
//               from (ISO date), to (ISO date)
// Returns paginated LNbits payment history with USD conversion
// ============================================================

import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const baseUrl = process.env.LNBITS_URL;
  const invoiceKey = process.env.LNBITS_INVOICE_KEY;

  if (!baseUrl || !invoiceKey) {
    return NextResponse.json({
      transactions: [],
      total: 0,
      page: 1,
      pages: 0,
      btcPriceUsd: 0,
      lnbitsAvailable: false,
    });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromSec = fromParam ? Math.floor(new Date(fromParam).getTime() / 1000) : null;
  const toSec = toParam ? Math.floor(new Date(toParam + "T23:59:59").getTime() / 1000) : null;

  try {
    const [raw, btcPriceUsd] = await Promise.all([
      fetch(`${baseUrl}/api/v1/payments?limit=200`, {
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

    const transactions: TransactionRow[] = slice.map((p) => ({
      id: p.payment_hash,
      amountSats: Math.floor(p.amount / 1000),
      memo: p.memo || null,
      status: p.paid ? "paid" : p.pending ? "pending" : "expired",
      time: p.time,
      date: new Date(p.time * 1000).toISOString(),
    }));

    return NextResponse.json({
      transactions,
      total,
      page,
      pages,
      btcPriceUsd,
      lnbitsAvailable: true,
    });
  } catch {
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
