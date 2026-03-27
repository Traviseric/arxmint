// ============================================================
// ArxMint — Merchant Onboarding Status API
// GET /api/merchant/[merchantId]/onboarding-status
// Returns wallet provisioning state so the setup wizard can
// show the correct UI (auto-provisioned vs manual setup).
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  if (!merchantId || typeof merchantId !== "string") {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  try {
    const { supabase } = await import("@/lib/supabase");

    // Fetch merchant + wallet in parallel
    const [pledgeResult, walletResult] = await Promise.all([
      supabase
        .from("merchant_pledges")
        .select("id, business_name, onboarding_status, wallet_provisioned_at, checkout_enabled")
        .eq("id", merchantId)
        .single(),
      supabase
        .from("merchant_wallets")
        .select("id, payout_address, lnbits_wallet_id")
        .eq("merchant_id", merchantId)
        .maybeSingle(),
    ]);

    if (pledgeResult.error || !pledgeResult.data) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const merchant = pledgeResult.data;
    const wallet = walletResult.data;

    const walletProvisioned = !!wallet?.lnbits_wallet_id;
    const payoutConfigured = !!wallet?.payout_address;
    const onboardingComplete = payoutConfigured && merchant.checkout_enabled;

    return NextResponse.json({
      merchantId,
      businessName: merchant.business_name,
      onboardingStatus: merchant.onboarding_status ?? "pending",
      walletProvisioned,
      walletProvisionedAt: merchant.wallet_provisioned_at ?? null,
      payoutConfigured,
      onboardingComplete,
    });
  } catch (error) {
    console.error("[onboarding-status] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
