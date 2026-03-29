// ============================================================
// ArxMint — LNbits Client
// Creates invoices and checks payment status via LNbits API.
// Used by the checkout flow for merchant payments.
// ============================================================

import { logger } from "./logger";

/**
 * Look up a merchant's LNbits invoice key from the merchant_wallets table.
 * Returns null if the merchant doesn't have a wallet configured yet.
 */
export async function getMerchantInvoiceKey(
  merchantId: string
): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("merchant_wallets")
      .select("lnbits_invoice_key")
      .eq("merchant_id", merchantId)
      .single();
    return data?.lnbits_invoice_key ?? null;
  } catch {
    return null;
  }
}

export interface LNbitsInvoice {
  paymentHash: string;
  paymentRequest: string;
  checkingId: string;
}

export interface LNbitsPaymentStatus {
  paid: boolean;
  preimage: string | null;
}

/**
 * Create a Lightning invoice via LNbits.
 * Uses the invoice/read key for the merchant's wallet.
 */
export async function createLNbitsInvoice(params: {
  amount: number;
  memo: string;
  walletInvoiceKey?: string;
}): Promise<LNbitsInvoice | null> {
  const baseUrl = process.env.LNBITS_URL;
  const invoiceKey = params.walletInvoiceKey || process.env.LNBITS_INVOICE_KEY;

  if (!baseUrl || !invoiceKey) {
    logger.warn("lnbits_not_configured", {
      hasUrl: !!baseUrl,
      hasKey: !!invoiceKey,
    });
    return null;
  }

  try {
    const res = await fetch(`${baseUrl}/api/v1/payments`, {
      method: "POST",
      headers: {
        "X-Api-Key": invoiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        out: false,
        amount: params.amount,
        memo: params.memo,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn("lnbits_create_invoice_failed", {
        status: res.status,
        body: text.slice(0, 200),
      });
      return null;
    }

    const data = await res.json();
    return {
      paymentHash: data.payment_hash,
      paymentRequest: data.payment_request,
      checkingId: data.checking_id,
    };
  } catch (error) {
    logger.warn("lnbits_create_invoice_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface LNbitsWalletCredentials {
  walletId: string;
  invoiceKey: string;
  adminKey: string;
}

/**
 * Provision a new LNbits wallet for a merchant.
 * Called at merchant creation time for zero-touch onboarding.
 * Returns null (graceful fallback) if LNbits is unavailable.
 */
export async function provisionMerchantWallet(params: {
  merchantId: string;
  merchantName: string;
}): Promise<LNbitsWalletCredentials | null> {
  const baseUrl = process.env.LNBITS_URL;
  const adminKey = process.env.LNBITS_ADMIN_KEY;

  if (!baseUrl || !adminKey) {
    logger.warn("lnbits_provision_not_configured", {
      hasUrl: !!baseUrl,
      hasAdminKey: !!adminKey,
      merchantId: params.merchantId,
    });
    return null;
  }

  try {
    // LNbits: POST /api/v1/account with super-user key creates a new user + wallet.
    // The username is the merchant ID (unique), password is auto-generated.
    const merchantPassword = `arx-${params.merchantId}-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/v1/account`, {
      method: "POST",
      headers: {
        "X-Api-Key": adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: params.merchantId,
        password: merchantPassword,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn("lnbits_provision_wallet_failed", {
        status: res.status,
        body: text.slice(0, 200),
        merchantId: params.merchantId,
      });
      return null;
    }

    const data = await res.json();
    return {
      walletId: data.id,
      invoiceKey: data.inkey,
      adminKey: data.adminkey,
    };
  } catch (error) {
    logger.warn("lnbits_provision_wallet_error", {
      error: error instanceof Error ? error.message : String(error),
      merchantId: params.merchantId,
    });
    return null;
  }
}

/**
 * Auto-forward payment to merchant's Lightning Address.
 * Called after payment confirmation to implement "hot potato" custody.
 * Uses the merchant's LNbits admin key to pay out.
 */
export async function forwardPaymentToMerchant(params: {
  amountSats: number;
  lightningAddress: string;
  walletAdminKey: string;
  memo?: string;
}): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.LNBITS_URL;
  if (!baseUrl) return { success: false, error: "LNBITS_URL not configured" };

  try {
    // Step 1: Resolve Lightning Address to LNURL pay endpoint
    const [user, domain] = params.lightningAddress.split("@");
    if (!user || !domain) {
      return { success: false, error: "Invalid Lightning Address format" };
    }

    const lnurlRes = await fetch(`https://${domain}/.well-known/lnurlp/${user}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!lnurlRes.ok) {
      return { success: false, error: `LNURL resolve failed: ${lnurlRes.status}` };
    }

    const lnurlData = await lnurlRes.json();
    const callback = lnurlData.callback;
    if (!callback) {
      return { success: false, error: "No callback in LNURL response" };
    }

    // Step 2: Request invoice from merchant's LNURL endpoint
    const amountMsat = params.amountSats * 1000;
    const sep = callback.includes("?") ? "&" : "?";
    const invoiceRes = await fetch(`${callback}${sep}amount=${amountMsat}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!invoiceRes.ok) {
      return { success: false, error: `Invoice request failed: ${invoiceRes.status}` };
    }

    const invoiceData = await invoiceRes.json();
    const bolt11 = invoiceData.pr;
    if (!bolt11) {
      return { success: false, error: "No invoice in LNURL callback response" };
    }

    // Step 3: Pay the invoice via LNbits using merchant's admin key
    const payRes = await fetch(`${baseUrl}/api/v1/payments`, {
      method: "POST",
      headers: {
        "X-Api-Key": params.walletAdminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        out: true,
        bolt11,
        memo: params.memo || "ArxMint auto-forward",
      }),
    });

    if (!payRes.ok) {
      const text = await payRes.text();
      logger.warn("lnbits_forward_payment_failed", {
        status: payRes.status,
        body: text.slice(0, 200),
      });
      return { success: false, error: `LNbits pay failed: ${payRes.status}` };
    }

    logger.info("lnbits_payment_forwarded", {
      amountSats: params.amountSats,
      lightningAddress: params.lightningAddress,
    });
    return { success: true };
  } catch (error) {
    logger.warn("lnbits_forward_payment_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Check if a Lightning invoice has been paid via Phoenixd directly.
 * Handles fee-credit payments that LNbits can't detect.
 */
export async function checkPhoenixdPayment(paymentHash: string): Promise<boolean> {
  const baseUrl = process.env.LNBITS_URL;
  if (!baseUrl) return false;

  // Derive Phoenixd URL from LNbits URL (same host, port 9740)
  const phoenixdPassword = process.env.PHOENIXD_API_PASSWORD;
  const phoenixdUrl = process.env.PHOENIXD_URL;
  if (!phoenixdPassword || !phoenixdUrl) return false;

  try {
    const res = await fetch(`${phoenixdUrl}/payments/incoming/${paymentHash}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${phoenixdPassword}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isPaid === true;
  } catch {
    return false;
  }
}

/**
 * Check if a Lightning invoice has been paid via LNbits.
 */
export async function checkLNbitsPayment(params: {
  paymentHash: string;
  walletInvoiceKey?: string;
}): Promise<LNbitsPaymentStatus> {
  const baseUrl = process.env.LNBITS_URL;
  const invoiceKey = params.walletInvoiceKey || process.env.LNBITS_INVOICE_KEY;

  if (!baseUrl || !invoiceKey) {
    return { paid: false, preimage: null };
  }

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/payments/${params.paymentHash}`,
      {
        headers: { "X-Api-Key": invoiceKey },
      }
    );

    if (!res.ok) return { paid: false, preimage: null };

    const data = await res.json();
    return {
      paid: data.paid === true,
      preimage: data.preimage || null,
    };
  } catch {
    return { paid: false, preimage: null };
  }
}
