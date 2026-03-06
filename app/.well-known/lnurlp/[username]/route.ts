// ============================================================
// ArxMint — LNURL-pay Metadata Endpoint (LUD-06 / LUD-16)
// GET /.well-known/lnurlp/:username
//
// Lightning Address spec (LUD-16): username@arxmint.com resolves to
// GET https://arxmint.com/.well-known/lnurlp/username
// Returns LUD-06 payRequest JSON consumed by Lightning wallets.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { lookupLnurlMerchant } from "@/lib/lnurl-merchant-registry";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://arxmint.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const merchant = await lookupLnurlMerchant(username);
  if (!merchant) {
    return NextResponse.json({ status: "ERROR", reason: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    tag: "payRequest",
    callback: `${BASE_URL}/api/lnurlp/${username}/invoice`,
    minSendable: 1000,           // 1 sat in millisats
    maxSendable: 10_000_000_000, // 10,000 sats in millisats
    metadata: JSON.stringify([
      ["text/plain", `Pay ${merchant.displayName} via ArxMint`],
      ["text/identifier", `${username}@arxmint.com`],
    ]),
    commentAllowed: 255,
  });
}
