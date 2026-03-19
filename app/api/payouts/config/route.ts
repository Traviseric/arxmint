// GET  /api/payouts/config — read payout config for the authenticated merchant
// POST /api/payouts/config — create or update payout config
import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  getPayoutConfig,
  upsertPayoutConfig,
  isPayoutSchedule,
  isPayoutRail,
  type PayoutSchedule,
  type PayoutRail,
} from "@/lib/payouts";

export async function GET(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId query param is required" }, { status: 400 });
  }

  const config = await getPayoutConfig(merchantId);
  if (!config) {
    return NextResponse.json({ config: null }, { status: 200 });
  }

  return NextResponse.json({
    config: {
      ...config,
      thresholdSats: config.thresholdSats?.toString() ?? null,
    },
  });
}

type PayoutConfigBody = {
  merchantId?: string;
  schedule?: string;
  thresholdSats?: number | string | null;
  rail?: string;
  destination?: string;
  enabled?: boolean;
};

export async function POST(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PayoutConfigBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merchantId = body.merchantId?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  const schedule = body.schedule ?? "daily";
  if (!isPayoutSchedule(schedule)) {
    return NextResponse.json(
      { error: `Invalid schedule. Must be one of: daily, weekly, on_threshold` },
      { status: 400 }
    );
  }

  const rail = body.rail ?? "lightning";
  if (!isPayoutRail(rail)) {
    return NextResponse.json(
      { error: `Invalid rail. Must be one of: lightning, ecash, onchain` },
      { status: 400 }
    );
  }

  const destination = body.destination?.trim();
  if (!destination) {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  let thresholdSats: bigint | null = null;
  if (body.thresholdSats != null) {
    try {
      thresholdSats = BigInt(body.thresholdSats);
    } catch {
      return NextResponse.json({ error: "thresholdSats must be a valid integer" }, { status: 400 });
    }
  }

  try {
    const config = await upsertPayoutConfig(merchantId, {
      schedule: schedule as PayoutSchedule,
      thresholdSats,
      rail: rail as PayoutRail,
      destination,
      enabled: body.enabled ?? true,
    });

    return NextResponse.json({
      config: {
        ...config,
        thresholdSats: config.thresholdSats?.toString() ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
