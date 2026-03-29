// ============================================================
// ArxMint — Merchant Session: GET /api/merchant-auth/session
// Returns current merchant session info for dashboard auth checks.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getMerchantFromRequest } from "@/lib/merchant-session";

export async function GET(request: NextRequest) {
  const session = getMerchantFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  // Look up merchant details for the session
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: merchant, error } = await supabase
      .from("merchant_pledges")
      .select("id, business_name, email")
      .eq("id", session.merchantId)
      .single();

    if (error || !merchant) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      merchantId: merchant.id,
      email: merchant.email,
      businessName: merchant.business_name,
    });
  } catch {
    // Supabase unavailable — return minimal session info
    return NextResponse.json({
      authenticated: true,
      merchantId: session.merchantId,
    });
  }
}
