// ============================================================
// ArxMint — Merchant Dashboard Settings API
// GET  /api/merchant-dashboard/settings?merchantId=xxx
//   Returns merchant's current settings from merchant_wallets + merchant_pledges
// PUT  /api/merchant-dashboard/settings
//   Updates payout_address, telegram_handle, email_notifications,
//   webhook_url, default_amount_sats
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { requireMerchantDashboardAccess } from "@/lib/merchant-dashboard-auth";

export async function GET(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-settings:ip:${ip}`, RATE_LIMITS.public);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");

  if (!merchantId) {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId query param is required.");
  }

  const authError = await requireMerchantDashboardAccess(request, merchantId, "read");
  if (authError) return authError;

  const { supabase } = await import("@/lib/supabase");

  // Fetch merchant pledge data
  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_pledges")
    .select("id, business_name, location, category, website, logo_url, reason, featured, checkout_enabled, default_amount_sats")
    .eq("id", merchantId)
    .single();

  if (merchantError || !merchant) {
    return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found.");
  }

  // Fetch wallet settings
  const { data: wallet } = await supabase
    .from("merchant_wallets")
    .select("payout_address, payout_type, telegram_handle, email_notifications, webhook_url, auto_forward_enabled, lnbits_invoice_key, created_at, updated_at")
    .eq("merchant_id", merchantId)
    .single();

  const merchantSettings = {
    businessName: merchant.business_name,
    location: merchant.location,
    category: merchant.category,
    website: merchant.website,
    payoutAddress: wallet?.payout_address ?? null,
    payoutType: wallet?.payout_type ?? null,
    defaultAmountSats: merchant.default_amount_sats ?? null,
    customMemo: null,
    telegramHandle: wallet?.telegram_handle ?? null,
    emailNotifications: wallet?.email_notifications ?? true,
    webhookUrl: wallet?.webhook_url ?? null,
    invoiceKey: wallet?.lnbits_invoice_key ?? null,
  };

  return NextResponse.json({
    ...merchantSettings,
    merchant: {
      id: merchant.id,
      businessName: merchantSettings.businessName,
      location: merchantSettings.location,
      category: merchantSettings.category,
      website: merchantSettings.website,
      logoUrl: merchant.logo_url,
      reason: merchant.reason,
      featured: merchant.featured,
      checkoutEnabled: merchant.checkout_enabled ?? false,
      defaultAmountSats: merchantSettings.defaultAmountSats,
    },
    wallet: wallet
      ? {
          payoutAddress: merchantSettings.payoutAddress,
          payoutType: merchantSettings.payoutType,
          telegramHandle: merchantSettings.telegramHandle,
          emailNotifications: merchantSettings.emailNotifications,
          webhookUrl: merchantSettings.webhookUrl,
          autoForwardEnabled: wallet.auto_forward_enabled,
          invoiceKey: merchantSettings.invoiceKey,
          createdAt: wallet.created_at,
          updatedAt: wallet.updated_at,
        }
      : null,
    paymentLink: `https://www.arxmint.com/pay/${merchantId}`,
  });
}

interface SettingsUpdateBody {
  merchantId: string;
  payoutAddress?: string;
  payoutType?: "lightning_address" | "onchain";
  telegramHandle?: string | null;
  emailNotifications?: boolean;
  webhookUrl?: string | null;
  defaultAmountSats?: number | null;
}

export async function PUT(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-settings:ip:${ip}`, RATE_LIMITS.paymentWrite);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  let body: SettingsUpdateBody;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const { merchantId } = body;
  if (!merchantId || typeof merchantId !== "string") {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId is required.");
  }

  const authError = await requireMerchantDashboardAccess(request, merchantId, "write");
  if (authError) return authError;

  const { supabase } = await import("@/lib/supabase");

  // Verify merchant exists
  const { data: merchant, error: merchantError } = await supabase
    .from("merchant_pledges")
    .select("id")
    .eq("id", merchantId)
    .single();

  if (merchantError || !merchant) {
    return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found.");
  }

  // Update wallet settings (if wallet exists)
  const walletUpdates: Record<string, unknown> = {};
  if (body.payoutAddress !== undefined) walletUpdates.payout_address = body.payoutAddress;
  if (body.payoutType !== undefined) {
    if (body.payoutType !== "lightning_address" && body.payoutType !== "onchain") {
      return apiError(400, "INVALID_PAYOUT_TYPE", "payoutType must be 'lightning_address' or 'onchain'.");
    }
    walletUpdates.payout_type = body.payoutType;
  }
  if (body.telegramHandle !== undefined) walletUpdates.telegram_handle = body.telegramHandle;
  if (body.emailNotifications !== undefined) walletUpdates.email_notifications = body.emailNotifications;
  if (body.webhookUrl !== undefined) walletUpdates.webhook_url = body.webhookUrl;

  if (Object.keys(walletUpdates).length > 0) {
    walletUpdates.updated_at = new Date().toISOString();

    const { error: walletError } = await supabase
      .from("merchant_wallets")
      .update(walletUpdates)
      .eq("merchant_id", merchantId);

    if (walletError) {
      logger.warn("merchant_settings_wallet_update_failed", {
        error: walletError.message,
        merchantId,
      });
      return apiError(500, "DB_ERROR", "Failed to update wallet settings.");
    }
  }

  // Update pledge settings (default amount)
  if (body.defaultAmountSats !== undefined) {
    const { error: pledgeError } = await supabase
      .from("merchant_pledges")
      .update({ default_amount_sats: body.defaultAmountSats })
      .eq("id", merchantId);

    if (pledgeError) {
      logger.warn("merchant_settings_pledge_update_failed", {
        error: pledgeError.message,
        merchantId,
      });
      return apiError(500, "DB_ERROR", "Failed to update merchant settings.");
    }
  }

  logger.info("merchant_settings_updated", {
    merchantId,
    fields: Object.keys({ ...walletUpdates, ...(body.defaultAmountSats !== undefined ? { defaultAmountSats: true } : {}) }),
  });

  return NextResponse.json({ success: true });
}
