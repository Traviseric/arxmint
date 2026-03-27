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
    const res = await fetch(`${baseUrl}/api/v1/wallet`, {
      method: "POST",
      headers: {
        "X-Api-Key": adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `ArxMint - ${params.merchantName}` }),
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
