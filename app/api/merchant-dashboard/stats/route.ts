// ============================================================
// ArxMint — Merchant Dashboard Stats API
// GET /api/merchant-dashboard/stats
// Returns today's payment summary from LNbits
// ============================================================

import { NextRequest, NextResponse } from "next/server";

interface LNbitsPayment {
  payment_hash: string;
  amount: number; // millisats (negative = outbound)
  memo: string | null;
  time: number; // unix timestamp
  paid: boolean;
  pending: boolean;
  checking_id: string;
}

async function fetchLNbitsPayments(invoiceKey: string, baseUrl: string): Promise<LNbitsPayment[]> {
  const res = await fetch(`${baseUrl}/api/v1/payments?limit=100`, {
    headers: { "X-Api-Key": invoiceKey },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function GET(_request: NextRequest) {
  const baseUrl = process.env.LNBITS_URL;
  const invoiceKey = process.env.LNBITS_INVOICE_KEY;

  if (!baseUrl || !invoiceKey) {
    return NextResponse.json({
      todayTotal: 0,
      todayCount: 0,
      recentPayment: null,
      lnbitsAvailable: false,
    });
  }

  try {
    const payments = await fetchLNbitsPayments(invoiceKey, baseUrl);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartSec = Math.floor(todayStart.getTime() / 1000);

    const todayPayments = payments.filter(
      (p) => p.paid && p.amount > 0 && p.time >= todayStartSec
    );

    const todayTotalMsats = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    const todayTotalSats = Math.floor(todayTotalMsats / 1000);

    const recentPaid = payments
      .filter((p) => p.paid && p.amount > 0)
      .sort((a, b) => b.time - a.time)[0];

    return NextResponse.json({
      todayTotal: todayTotalSats,
      todayCount: todayPayments.length,
      recentPayment: recentPaid
        ? {
            amount: Math.floor(recentPaid.amount / 1000),
            memo: recentPaid.memo,
            time: recentPaid.time,
          }
        : null,
      lnbitsAvailable: true,
    });
  } catch {
    return NextResponse.json({
      todayTotal: 0,
      todayCount: 0,
      recentPayment: null,
      lnbitsAvailable: false,
    });
  }
}
