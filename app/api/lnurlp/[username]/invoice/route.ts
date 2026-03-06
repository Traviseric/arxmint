// ============================================================
// ArxMint — LNURL-pay Invoice Callback (LUD-06)
// GET /api/lnurlp/:username/invoice?amount=<millisats>[&comment=<string>]
//
// Called by wallets after receiving the payRequest from /.well-known/lnurlp/:username.
// Returns a real BOLT11 invoice if LND is configured, or a structured error otherwise.
//
// Env vars required for real invoices:
//   LND_REST_URL      — LND REST endpoint, e.g. https://localhost:8080
//   LND_MACAROON_HEX  — Hex-encoded LND invoice macaroon
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { lookupLnurlMerchant } from "@/lib/lnurl-merchant-registry";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

async function createLNDInvoice(
  amountSats: number,
  memo: string
): Promise<{ paymentRequest: string } | null> {
  const lndRestUrl = process.env.LND_REST_URL;
  const lndMacaroon = process.env.LND_MACAROON_HEX;

  if (!lndRestUrl || !lndMacaroon) return null;

  try {
    const res = await fetch(`${lndRestUrl}/v1/invoices`, {
      method: "POST",
      headers: {
        "Grpc-Metadata-Macaroon": lndMacaroon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: String(amountSats), memo }),
    });

    if (!res.ok) {
      logger.warn("lnurlp_lnd_create_failed", {
        status: res.status,
        action: "lnurlp_lnd_create_failed",
      });
      return null;
    }

    const data = await res.json();
    if (!data.payment_request) return null;
    return { paymentRequest: data.payment_request as string };
  } catch (e: unknown) {
    logger.warn("lnurlp_lnd_create_error", {
      error: e instanceof Error ? e.message : String(e),
      action: "lnurlp_lnd_create_error",
    });
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const merchant = lookupLnurlMerchant(username);
  if (!merchant) {
    return NextResponse.json(
      { status: "ERROR", reason: "Unknown username" },
      { status: 404 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(`lnurlp:${ip}`, RATE_LIMITS.payment);
  if (!rl.allowed) {
    return NextResponse.json(
      { status: "ERROR", reason: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const url = new URL(request.url);
  const amountMs = Number(url.searchParams.get("amount") ?? 0);

  if (!amountMs || amountMs < 1000 || amountMs > 10_000_000_000) {
    return NextResponse.json(
      { status: "ERROR", reason: "amount must be between 1000 and 10000000000 millisats" },
      { status: 400 }
    );
  }

  const amountSats = Math.floor(amountMs / 1000);
  const comment = url.searchParams.get("comment") ?? "";
  const memo = comment
    ? `ArxMint → ${merchant.displayName}: ${comment.slice(0, 100)}`
    : `ArxMint → ${merchant.displayName}`;

  const lndResult = await createLNDInvoice(amountSats, memo);
  if (lndResult) {
    logger.info("lnurlp_invoice_created", {
      username,
      amountSats,
      action: "lnurlp_invoice_created",
    });
    // LUD-06 success response: pr = BOLT11 invoice, routes = [] (routing hints)
    return NextResponse.json({ pr: lndResult.paymentRequest, routes: [] });
  }

  // LND not configured — structured error per LUD-06 spec
  logger.warn("lnurlp_lnd_not_configured", {
    username,
    action: "lnurlp_lnd_not_configured",
  });
  return NextResponse.json(
    {
      status: "ERROR",
      reason:
        "Lightning node not configured. Set LND_REST_URL and LND_MACAROON_HEX to enable invoice generation.",
    },
    { status: 503 }
  );
}
