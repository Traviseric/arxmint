// ============================================================
// ArxMint — QuickBooks CSV Export
// GET /api/merchant/export/csv
// Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
// Returns QuickBooks-compatible 4-column CSV with historical USD rates
// ============================================================

import { NextRequest, NextResponse } from "next/server";

interface LNbitsPayment {
  payment_hash: string;
  amount: number; // millisats (positive = inbound)
  memo: string | null;
  time: number; // unix timestamp
  paid: boolean;
  pending: boolean;
}

async function fetchHistoricalBtcPrice(timestampSec: number): Promise<number> {
  try {
    const res = await fetch(
      `https://mempool.space/api/v1/historical-price?currency=USD&timestamp=${timestampSec}`,
      { next: { revalidate: 86400 } } // cache 24h — historical prices don't change
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { prices: Array<{ time: number; USD: number }> };
    return data.prices?.[0]?.USD ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.LNBITS_URL;
  const invoiceKey = process.env.LNBITS_INVOICE_KEY;

  if (!baseUrl || !invoiceKey) {
    return NextResponse.json({ error: "LNbits not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from"); // YYYY-MM-DD
  const toParam = searchParams.get("to");     // YYYY-MM-DD

  // Default: last 30 days
  const toDate = toParam ? new Date(toParam + "T23:59:59Z") : new Date();
  const fromDate = fromParam
    ? new Date(fromParam + "T00:00:00Z")
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const fromSec = Math.floor(fromDate.getTime() / 1000);
  const toSec = Math.floor(toDate.getTime() / 1000);

  let rawPayments: LNbitsPayment[] = [];

  try {
    const res = await fetch(`${baseUrl}/api/v1/payments?limit=500`, {
      headers: { "X-Api-Key": invoiceKey },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "LNbits request failed" }, { status: 502 });
    }
    rawPayments = (await res.json()) as LNbitsPayment[];
  } catch {
    return NextResponse.json({ error: "Failed to reach LNbits" }, { status: 502 });
  }

  // Paid inbound payments only, within date range
  const payments = rawPayments.filter(
    (p) => p.paid && p.amount > 0 && p.time >= fromSec && p.time <= toSec
  );

  // Sort ascending (oldest first — standard for accounting exports)
  payments.sort((a, b) => a.time - b.time);

  // Collect unique dates → noon-UTC timestamp for price lookup
  const dayTimestamps = new Map<string, number>(); // "YYYY-MM-DD" → noon unix sec
  for (const p of payments) {
    const key = new Date(p.time * 1000).toISOString().slice(0, 10);
    if (!dayTimestamps.has(key)) {
      dayTimestamps.set(key, Math.floor(new Date(key + "T12:00:00Z").getTime() / 1000));
    }
  }

  // Fetch historical BTC/USD prices in parallel (one request per unique day)
  const priceByDay = new Map<string, number>();
  await Promise.all(
    Array.from(dayTimestamps.entries()).map(async ([day, ts]) => {
      const price = await fetchHistoricalBtcPrice(ts);
      priceByDay.set(day, price);
    })
  );

  // Build QuickBooks-compatible rows: Date, Description, Amount (USD), Memo
  const header = ["Date", "Description", "Amount (USD)", "Memo"];
  const dataRows = payments.map((p) => {
    const dt = new Date(p.time * 1000);
    const day = dt.toISOString().slice(0, 10);
    const amountSats = Math.floor(p.amount / 1000);
    const btcUsd = priceByDay.get(day) ?? 0;
    const amountUsd =
      btcUsd > 0
        ? ((amountSats / 100_000_000) * btcUsd).toFixed(2)
        : "0.00";

    const txRef = p.payment_hash ? `tx: ${p.payment_hash.slice(0, 16)}...` : "";
    const rateNote = btcUsd > 0 ? ` | BTC/USD: $${btcUsd.toLocaleString("en-US")}` : "";

    return [
      dt.toLocaleDateString("en-US"),
      "ArxMint Lightning Payment",
      amountUsd,
      `${amountSats} sats${txRef ? " | " + txRef : ""}${rateNote}`,
    ];
  });

  const allRows = [header, ...dataRows];
  const csv = allRows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = toDate.toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arxmint-payments-${fromStr}-${toStr}.csv"`,
    },
  });
}
