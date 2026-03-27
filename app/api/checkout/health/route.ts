// ============================================================
// ArxMint — Checkout Health Endpoint
// GET /api/checkout/health — verify payment backend config
// Returns config status without exposing secret values.
// ============================================================

import { NextResponse } from "next/server";

export async function GET() {
  const lnbitsUrl = process.env.LNBITS_URL;
  const lnbitsInvoiceKey = process.env.LNBITS_INVOICE_KEY;
  const demoMode = process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development";

  const lnbitsConfigured = Boolean(lnbitsUrl && lnbitsInvoiceKey);

  // Attempt a lightweight connectivity check against LNbits if configured
  let lnbitsReachable: boolean | null = null;
  if (lnbitsConfigured && lnbitsUrl) {
    try {
      const res = await fetch(`${lnbitsUrl}/api/v1/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      });
      lnbitsReachable = res.ok;
    } catch {
      lnbitsReachable = false;
    }
  }

  const status = demoMode
    ? "demo"
    : lnbitsConfigured && lnbitsReachable
      ? "ok"
      : lnbitsConfigured
        ? "degraded"
        : "misconfigured";

  return NextResponse.json(
    {
      status,
      demoMode,
      lnbits: {
        urlConfigured: Boolean(lnbitsUrl),
        invoiceKeyConfigured: Boolean(lnbitsInvoiceKey),
        reachable: lnbitsReachable,
      },
    },
    { status: status === "ok" || status === "demo" ? 200 : 503 }
  );
}
