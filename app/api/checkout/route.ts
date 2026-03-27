// ============================================================
// ArxMint — Checkout API
// POST /api/checkout — create a Lightning invoice for a merchant
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { validateAmount } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { withIdempotency } from "@/lib/idempotency";
import { apiError } from "@/lib/api-error";
import { getAuthPubkey } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import { buildInvoicePaymentLink } from "@/lib/invoices";

const INVOICE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Demo mode: only in development or when DEMO_MODE=true explicitly set.
// Never auto-enabled in production — production failures return 503, not fake invoices.
const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  // Rate limit: 10 per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`checkout:${ip}`, { windowMs: 3_600_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  return withIdempotency(request, async () => {
    try {
      const body = await request.json();
      const { merchantId: rawMerchantId, memo, shipping, invoiceId, privacyLevel: rawPrivacyLevel, paymentRail: rawPaymentRail } = body;
      const privacyLevel: "standard" | "maximum" =
        rawPrivacyLevel === "maximum" ? "maximum" : "standard";
      const paymentRail: "lightning" | "cashu" | "onchain" =
        rawPaymentRail === "cashu" ? "cashu" : rawPaymentRail === "onchain" ? "onchain" : "lightning";
      let merchantId =
        typeof rawMerchantId === "string" && rawMerchantId.trim().length > 0
          ? rawMerchantId.trim()
          : undefined;
      let invoiceRecord:
        | {
            id: string;
            invoiceNumber: string;
            merchantId: string | null;
            currency: "BTC" | "USD";
            status: "draft" | "sent" | "paid" | "overdue" | "void";
            totalMinor: number;
            paymentRail: "lightning" | "cashu" | "stripe";
          }
        | null = null;

      if (invoiceId !== undefined) {
        if (typeof invoiceId !== "string" || invoiceId.trim().length === 0) {
          return apiError(400, "MISSING_FIELD", "invoiceId must be a non-empty string");
        }

        invoiceRecord = await db.invoice.findUnique({
          where: { id: invoiceId.trim() },
          select: {
            id: true,
            invoiceNumber: true,
            merchantId: true,
            currency: true,
            status: true,
            totalMinor: true,
            paymentRail: true,
          },
        });

        if (!invoiceRecord) {
          return apiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
        }

        if (invoiceRecord.currency !== "BTC") {
          return apiError(
            409,
            "INVOICE_CURRENCY_UNSUPPORTED",
            "Only BTC invoices can be settled through ArxMint checkout"
          );
        }

        if (invoiceRecord.status === "paid") {
          return apiError(409, "INVOICE_ALREADY_PAID", "Invoice is already paid");
        }

        if (invoiceRecord.status === "void") {
          return apiError(409, "INVOICE_VOID", "Void invoices cannot be paid");
        }

        merchantId = merchantId ?? invoiceRecord.merchantId ?? undefined;
      }

      if (!merchantId) {
        return apiError(400, "MISSING_FIELD", "merchantId is required");
      }

      const amountSats = invoiceRecord
        ? invoiceRecord.totalMinor
        : validateAmount(body.amountSats);
      const sanitizedMemo = memo
        ? String(memo).trim().slice(0, 200)
        : invoiceRecord
          ? `Invoice ${invoiceRecord.invoiceNumber}`
          : undefined;

      // Look up merchant
      let merchant: { id: string; businessName: string; checkout_enabled: boolean } | null = null;

      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("merchant_pledges")
          .select("id, businessName, checkout_enabled")
          .eq("id", merchantId)
          .single();

        if (!error && data) merchant = data;
      } catch {
        // DB unavailable — check seed merchants
      }

      // Fallback: allow seed merchants in demo mode
      if (!merchant && merchantId === "seed-glacier") {
        merchant = { id: "seed-glacier", businessName: "The Ice Cream Parlor by Glacier", checkout_enabled: true };
      }
      if (!merchant && merchantId === "seed-teneo") {
        merchant = { id: "seed-teneo", businessName: "Teneo", checkout_enabled: true };
      }
      if (!merchant && merchantId === "arxmint-store") {
        merchant = { id: "arxmint-store", businessName: "ArxMint Store", checkout_enabled: true };
      }
      if (!merchant && merchantId === "seed-black-bear") {
        merchant = { id: "seed-black-bear", businessName: "Black Bear Window Cleaning", checkout_enabled: true };
      }

      if (!merchant) {
        return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
      }
      if (!merchant.checkout_enabled) {
        return apiError(403, "CHECKOUT_DISABLED", "Checkout not enabled for this merchant");
      }

      // Multi-rail: look up Cashu mint URL and on-chain address from merchant_wallets
      let cashuMintUrl: string | null = null;
      let bitcoinAddress: string | null = null;
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase
          .from("merchant_wallets")
          .select("cashu_mint_url, bitcoin_address")
          .eq("merchant_id", merchantId)
          .single();
        cashuMintUrl = data?.cashu_mint_url ?? null;
        bitcoinAddress = data?.bitcoin_address ?? null;
      } catch {
        // DB unavailable — multi-rail config stays null
      }

      // Compute which rails are available for this merchant
      const availableRails: ("lightning" | "cashu" | "onchain")[] = ["lightning"];
      if (cashuMintUrl || DEMO_MODE) availableRails.push("cashu");
      if (bitcoinAddress || DEMO_MODE) availableRails.push("onchain");

      // Validate requested rail is available
      if (paymentRail !== "lightning" && !availableRails.includes(paymentRail)) {
        return apiError(
          400,
          "RAIL_NOT_CONFIGURED",
          `Payment rail '${paymentRail}' is not configured for this merchant`
        );
      }

      const sessionId = randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + INVOICE_TTL_MS);
      let invoice: string;
      let rHash: string | null = null;
      let demoMode = false;

      if (!DEMO_MODE) {
        // Validate payment backend is configured before attempting invoice creation.
        // Fail loudly here rather than silently falling through to a confusing L402/503 chain.
        if (paymentRail === "lightning" && (!process.env.LNBITS_URL || !process.env.LNBITS_INVOICE_KEY)) {
          return apiError(
            503,
            "LNBITS_NOT_CONFIGURED",
            "Payment backend is not configured. Set LNBITS_URL and LNBITS_INVOICE_KEY environment variables."
          );
        }

        // Real mode: create invoice via LNbits (Phoenixd backend) or fall back to LND
        const { createLNbitsInvoice, getMerchantInvoiceKey } = await import("@/lib/lnbits");

        if (paymentRail === "cashu") {
          // Cashu ecash rail: build a payment URI pointing to the merchant's mint
          // Full NUT-24 ecash redemption webhook is a follow-up (SPINE-ARX-01 Phase 3).
          // For now we construct a cashu+mint URI so the customer's Cashu wallet can
          // direct the payment to the correct mint endpoint.
          invoice = buildCashuPaymentUri(cashuMintUrl!, amountSats);
        } else if (paymentRail === "onchain") {
          // On-chain rail: BIP21 URI. No r_hash — on-chain confirmation via webhook
          // (SPINE-ARX-01 Phase 3) will add block-explorer monitoring.
          invoice = buildBip21Uri(bitcoinAddress!, amountSats);
        } else {
          // Lightning rail (default)
          // Wallet isolation: each merchant has their own LNbits invoice key stored in
          // merchant_wallets.lnbits_invoice_key. getMerchantInvoiceKey() looks up the key
          // strictly by merchantId — there is no shared state between merchants.
          // Fallback to LNBITS_INVOICE_KEY is only used for merchants not yet configured
          // (e.g. new sign-ups before their wallet is provisioned). This is intentional
          // and does not cause cross-merchant billing: invoices are created independently,
          // and payment confirmation is keyed to the checkout session's r_hash, not the key.
          const merchantKey = await getMerchantInvoiceKey(merchantId);
          const lnbitsResult = await createLNbitsInvoice({
            amount: amountSats,
            memo: sanitizedMemo || `Payment to ${merchant.businessName}`,
            walletInvoiceKey: merchantKey ?? undefined,
          });

          if (lnbitsResult) {
            invoice = lnbitsResult.paymentRequest;
            rHash = lnbitsResult.paymentHash;
          } else {
            // Fallback to LND via payment-sdk (for L402/agent commerce)
            try {
              const { createL402Challenge } = await import("@/lib/payment-sdk");
              const challenge = await createL402Challenge({
                amount: amountSats,
                resourcePath: `/pay/${merchantId}`,
              });
              invoice = challenge.invoice || "";
              rHash = null;
            } catch {
              return apiError(503, "PAYMENT_BACKEND_UNAVAILABLE", "Payment backend temporarily unavailable. Please try again shortly.");
            }
          }
        }
      } else {
        // Demo mode: generate a realistic-looking placeholder URI for the selected rail
        if (paymentRail === "cashu") {
          invoice = buildCashuPaymentUri("https://demo.arxmint.com/mint", amountSats);
        } else if (paymentRail === "onchain") {
          // bc1q... — well-known signet/demo address (unpayable on mainnet)
          invoice = buildBip21Uri("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", amountSats);
        } else {
          invoice = generateDemoInvoice(amountSats);
        }
        demoMode = true;
      }

      // Extract identity signals now so they can be stored on the session
      // and reused by the payment webhook if linking hasn't fired yet.
      let nostrPubkeySignal: string | null = null;
      let teneoUserIdSignal: string | null = null;
      try {
        nostrPubkeySignal = getAuthPubkey(request) || null;
        const teneoHeader = request.headers.get("X-Teneo-Auth");
        if (teneoHeader) {
          const { parseTeneoAuthUserId } = await import("@/lib/identity");
          teneoUserIdSignal = parseTeneoAuthUserId(teneoHeader);
        }
      } catch {
        // Non-fatal — signals remain null
      }

      // Store session in Supabase
      try {
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("checkout_sessions").insert({
          id: sessionId,
          merchant_id: merchantId,
          amount_sats: amountSats,
          memo: sanitizedMemo || `Payment to ${merchant.businessName}`,
          invoice,
          r_hash: rHash,
          status: "pending",
          demo_mode: demoMode,
          expires_at: expiresAt.toISOString(),
          privacy_level: privacyLevel,
          payment_rail: paymentRail,
          ...(nostrPubkeySignal && { nostr_pubkey: nostrPubkeySignal }),
          ...(teneoUserIdSignal && { teneo_user_id: teneoUserIdSignal }),
          ...(shipping && { shipping_data: shipping }),
        });
      } catch {
        // If DB insert fails, session still works in-memory for demo
      }

      if (invoiceRecord) {
        const invoicePaymentLink = buildInvoicePaymentLink(
          {
            id: invoiceRecord.id,
            merchantId,
            paymentRail: invoiceRecord.paymentRail,
          },
          new URL(request.url).origin
        );

        const updatedInvoice = await db.invoice.update({
          where: { id: invoiceRecord.id },
          data: {
            paymentSessionId: sessionId,
            paymentLink: invoicePaymentLink,
            ...(invoiceRecord.status === "draft"
              ? { status: "sent", sentAt: new Date() }
              : {}),
          },
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        if (invoiceRecord.status === "draft") {
          await emitInvoiceStateChanged({
            invoice: updatedInvoice,
            previousStatus: "draft",
            lineItems: updatedInvoice.lineItems,
          });
        }
      }

      // Best-effort cross-auth identity linking.
      // Skipped when privacyLevel === 'maximum' (customer has opted out of cross-auth tracking).
      // Uses signals extracted above — no duplicate header reads.
      // Fire-and-forget; checkout never fails due to identity linking.
      if (privacyLevel !== "maximum" && nostrPubkeySignal && teneoUserIdSignal) {
        try {
          const { autoLinkCheckoutIdentity } = await import("@/lib/identity");
          await autoLinkCheckoutIdentity(nostrPubkeySignal, teneoUserIdSignal);
          // Mark session as identity-linked (best-effort — ignore if DB update fails)
          try {
            const { supabase } = await import("@/lib/supabase");
            await supabase
              .from("checkout_sessions")
              .update({ identity_linked: true })
              .eq("id", sessionId);
          } catch { /* ignore */ }
        } catch {
          // Silent — identity linking must never affect checkout outcome
        }
      }

      return NextResponse.json({
        sessionId,
        invoice,      // backward compat — always the primary payment URI for the selected rail
        paymentUri: invoice,
        paymentRail,
        availableRails,
        expiresAt: expiresAt.toISOString(),
        demoMode,
        merchantName: merchant.businessName,
        amountSats,
        ...(invoiceRecord
          ? {
              invoiceId: invoiceRecord.id,
              invoiceNumber: invoiceRecord.invoiceNumber,
            }
          : {}),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      return apiError(400, "BAD_REQUEST", message);
    }
  });
}

function generateDemoInvoice(amountSats: number): string {
  // Generate a realistic-looking but unpayable BOLT11 string for demo/dev
  const rand = randomBytes(32).toString("hex");
  return `lnbc${amountSats}n1demo${rand.slice(0, 52)}`;
}

/** Build a Cashu payment URI pointing to the merchant's Cashu mint */
function buildCashuPaymentUri(mintUrl: string, amountSats: number): string {
  // cashu:// scheme allows Cashu wallets to open and pay to a specific mint.
  // Format: cashu://mint?mint=<encoded-url>&amount=<sats>&unit=sat
  // Full NUT-24 ecash payment support (receive ecash tokens directly) is Phase 3.
  const encoded = encodeURIComponent(mintUrl);
  return `cashu://pay?mint=${encoded}&amount=${amountSats}&unit=sat`;
}

/** Build a BIP21 Bitcoin payment URI */
function buildBip21Uri(address: string, amountSats: number): string {
  // BIP21: bitcoin:<address>?amount=<BTC>
  const btcAmount = (amountSats / 100_000_000).toFixed(8);
  return `bitcoin:${address}?amount=${btcAmount}`;
}
