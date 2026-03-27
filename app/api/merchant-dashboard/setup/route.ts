// ============================================================
// ArxMint — Merchant Dashboard Setup API
// POST /api/merchant-dashboard/setup
// Creates an LNbits wallet for the merchant, stores credentials
// in Supabase merchant_wallets, and enables checkout.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

interface SetupBody {
  merchantId: string;
  payoutAddress: string;
  payoutType: "lightning_address" | "onchain";
  telegramHandle?: string;
}

interface LNbitsWalletResponse {
  id: string;
  adminkey: string;
  inkey: string;
  name: string;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-setup:ip:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  let body: SetupBody;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const { merchantId, payoutAddress, payoutType, telegramHandle } = body;

  if (!merchantId || typeof merchantId !== "string") {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId is required.");
  }
  if (!payoutAddress || typeof payoutAddress !== "string") {
    return apiError(400, "MISSING_PAYOUT_ADDRESS", "payoutAddress is required.");
  }
  if (payoutType !== "lightning_address" && payoutType !== "onchain") {
    return apiError(400, "INVALID_PAYOUT_TYPE", "payoutType must be 'lightning_address' or 'onchain'.");
  }

  const LNBITS_URL = process.env.LNBITS_URL;
  const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;

  if (!LNBITS_URL || !LNBITS_ADMIN_KEY) {
    logger.warn("merchant_setup_not_configured", {
      hasUrl: !!LNBITS_URL,
      hasAdminKey: !!LNBITS_ADMIN_KEY,
    });
    return apiError(503, "LNBITS_NOT_CONFIGURED", "Payment system is not configured.");
  }

  const { supabase } = await import("@/lib/supabase");

  // Verify merchant exists
  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_pledges")
    .select("id, business_name")
    .eq("id", merchantId)
    .single();

  if (merchantError || !merchant) {
    return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found.");
  }

  // Check if wallet already exists
  const { data: existingWallet } = await supabase
    .from("merchant_wallets")
    .select("id")
    .eq("merchant_id", merchantId)
    .single();

  if (existingWallet) {
    return apiError(409, "WALLET_EXISTS", "Merchant wallet already set up.");
  }

  // Create LNbits wallet via API
  let walletData: LNbitsWalletResponse;
  try {
    const res = await fetch(`${LNBITS_URL}/api/v1/wallet`, {
      method: "POST",
      headers: {
        "X-Api-Key": LNBITS_ADMIN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: merchant.business_name }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn("lnbits_create_wallet_failed", {
        status: res.status,
        body: text.slice(0, 200),
        merchantId,
      });
      return apiError(502, "LNBITS_ERROR", "Failed to create payment wallet.");
    }

    walletData = await res.json();
  } catch (error) {
    logger.warn("lnbits_create_wallet_error", {
      error: error instanceof Error ? error.message : String(error),
      merchantId,
    });
    return apiError(502, "LNBITS_ERROR", "Failed to connect to payment system.");
  }

  // Store wallet credentials in Supabase
  const { error: insertError } = await supabase
    .from("merchant_wallets")
    .insert({
      merchant_id: merchantId,
      lnbits_wallet_id: walletData.id,
      lnbits_invoice_key: walletData.inkey,
      lnbits_admin_key: walletData.adminkey,
      payout_address: payoutAddress,
      payout_type: payoutType,
      telegram_handle: telegramHandle || null,
      email_notifications: true,
      auto_forward_enabled: true,
    });

  if (insertError) {
    logger.warn("merchant_wallet_insert_failed", {
      error: insertError.message,
      merchantId,
    });
    return apiError(500, "DB_ERROR", "Failed to save wallet configuration.");
  }

  // Enable checkout on the merchant's pledge record
  const { error: updateError } = await supabase
    .from("merchant_pledges")
    .update({ checkout_enabled: true })
    .eq("id", merchantId);

  if (updateError) {
    logger.warn("merchant_checkout_enable_failed", {
      error: updateError.message,
      merchantId,
    });
    // Non-fatal: wallet was created, checkout flag can be set later
  }

  logger.info("merchant_wallet_created", {
    merchantId,
    walletId: walletData.id,
    payoutType,
  });

  return NextResponse.json({
    success: true,
    paymentLink: `https://www.arxmint.com/pay/${merchantId}`,
    walletId: walletData.id,
  });
}
