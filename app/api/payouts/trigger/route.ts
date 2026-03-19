// POST /api/payouts/trigger — manually trigger an immediate payout for a merchant
import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { triggerPayout } from "@/lib/payouts";

export async function POST(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { merchantId?: string; amountSats?: number | string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merchantId = body.merchantId?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  let amountSats: bigint | undefined;
  if (body.amountSats != null) {
    try {
      amountSats = BigInt(body.amountSats);
    } catch {
      return NextResponse.json({ error: "amountSats must be a valid integer" }, { status: 400 });
    }
  }

  const result = await triggerPayout(merchantId, { amountSats });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        payout: result.payout.id
          ? {
              ...result.payout,
              amountSats: result.payout.amountSats.toString(),
            }
          : null,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    success: true,
    payout: {
      ...result.payout,
      amountSats: result.payout.amountSats.toString(),
    },
  });
}
