// ============================================================
// ArxMint — Send Invoice API
// POST /api/merchant-dashboard/send-invoice
// Sends a payment request email to a customer on behalf of a merchant.
//
// Persists invoices through the canonical Prisma Invoice model.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { sendInvoiceEmail } from "@/lib/email";
import { db } from "@/lib/db";
import {
  buildInvoicePaymentLink,
  calculateInvoiceSummary,
  generateInvoiceNumber,
} from "@/lib/invoices";
import { requireMerchantDashboardAccess } from "@/lib/merchant-dashboard-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SATS = 1;
const MAX_SATS = 1_000_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantId,
      customerEmail,
      customerName: rawCustomerName,
      serviceAddress: rawServiceAddress,
      serviceDate: rawServiceDate,
      amountSats: rawAmount,
      memo: rawMemo,
    } = body;

    // --- Validate merchantId ---
    if (typeof merchantId !== "string" || merchantId.trim().length === 0) {
      return apiError(400, "MISSING_FIELD", "merchantId is required");
    }
    const mid = merchantId.trim();

    const authError = await requireMerchantDashboardAccess(request, mid, "write");
    if (authError) return authError;

    // --- Rate limit: 20 per hour per merchant ---
    const rl = checkRateLimit(`send-invoice:${mid}`, {
      windowMs: 3_600_000,
      maxRequests: 20,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Too many invoices sent. Try again later." } },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
      );
    }

    // --- Validate email ---
    if (typeof customerEmail !== "string" || !EMAIL_RE.test(customerEmail.trim())) {
      return apiError(400, "INVALID_EMAIL", "A valid customer email is required");
    }
    const email = customerEmail.trim().toLowerCase().slice(0, 254);

    // --- Validate amount ---
    const amountSats = Number(rawAmount);
    if (!Number.isFinite(amountSats) || !Number.isInteger(amountSats) || amountSats < MIN_SATS || amountSats > MAX_SATS) {
      return apiError(400, "INVALID_AMOUNT", `Amount must be an integer between ${MIN_SATS} and ${MAX_SATS} sats`);
    }

    // --- Sanitize memo ---
    const memo = typeof rawMemo === "string" && rawMemo.trim().length > 0
      ? rawMemo.trim().slice(0, 200)
      : null;
    const customerName = typeof rawCustomerName === "string" && rawCustomerName.trim().length > 0
      ? rawCustomerName.trim().slice(0, 120)
      : null;
    const serviceAddress = typeof rawServiceAddress === "string" && rawServiceAddress.trim().length > 0
      ? rawServiceAddress.trim().slice(0, 180)
      : null;
    const serviceDate = typeof rawServiceDate === "string" && rawServiceDate.trim().length > 0
      ? rawServiceDate.trim().slice(0, 10)
      : null;
    const parsedServiceDate = serviceDate ? new Date(`${serviceDate}T00:00:00.000Z`) : null;
    if (serviceDate && Number.isNaN(parsedServiceDate?.getTime())) {
      return apiError(400, "INVALID_SERVICE_DATE", "serviceDate must be a valid YYYY-MM-DD date.");
    }

    // --- Look up merchant ---
    let merchant: { id: string; businessName: string; checkout_enabled: boolean } | null = null;

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("merchant_pledges")
        .select("id, business_name, checkout_enabled")
        .eq("id", mid)
        .single();
      if (!error && data) {
        merchant = {
          id: data.id,
          businessName: data.business_name,
          checkout_enabled: data.checkout_enabled,
        };
      }
    } catch {
      // DB unavailable — check seed merchants
    }

    // Seed merchant fallbacks
    const SEED_MERCHANTS: Record<string, { id: string; businessName: string; checkout_enabled: boolean }> = {
      "seed-black-bear": { id: "seed-black-bear", businessName: "Black Bear Window Cleaning", checkout_enabled: true },
      "seed-glacier": { id: "seed-glacier", businessName: "The Ice Cream Parlor by Glacier", checkout_enabled: true },
      "seed-teneo": { id: "seed-teneo", businessName: "Teneo", checkout_enabled: true },
      "arxmint-store": { id: "arxmint-store", businessName: "ArxMint Store", checkout_enabled: true },
    };
    if (!merchant && SEED_MERCHANTS[mid]) {
      merchant = SEED_MERCHANTS[mid];
    }

    if (!merchant) {
      return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found");
    }
    if (!merchant.checkout_enabled) {
      return apiError(403, "CHECKOUT_DISABLED", "Checkout not enabled for this merchant");
    }

    // --- Fetch BTC price for USD conversion ---
    let amountUsd: string | null = null;
    try {
      const priceRes = await fetch("https://mempool.space/api/v1/prices", {
        signal: AbortSignal.timeout(5000),
      });
      if (priceRes.ok) {
        const priceData = await priceRes.json() as { USD?: number };
        if (priceData.USD) {
          const usd = (amountSats / 100_000_000) * priceData.USD;
          amountUsd = usd.toFixed(2);
        }
      }
    } catch {
      // Non-fatal — USD conversion will be null
    }

    // --- Create a real invoice record ---
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;
    const summary = calculateInvoiceSummary([
      {
        description: memo || "Window cleaning service",
        quantity: 1,
        unitAmountMinor: amountSats,
        metadata: {
          customerEmail: email,
          ...(customerName && { customerName }),
          ...(serviceAddress && { serviceAddress }),
          ...(serviceDate && { serviceDate }),
          source: "merchant-dashboard",
        },
      },
    ]);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        fromOrgId: `merchant:${mid}`,
        fromOrgName: merchant.businessName,
        toOrgId: `customer:${email}`,
        toOrgName: customerName || email,
        merchantId: mid,
        status: "sent",
        currency: "BTC",
        paymentRail: "lightning",
        subtotalMinor: summary.subtotalMinor,
        totalMinor: summary.totalMinor,
        sentAt: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        notes: memo,
        metadata: {
          customerEmail: email,
          ...(customerName && { customerName }),
          ...(serviceAddress && { serviceAddress }),
          ...(serviceDate && { serviceDate }),
          source: "merchant-dashboard-send-invoice",
        } as Prisma.InputJsonObject,
        lineItems: {
          create: summary.normalizedLineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitAmountMinor: item.unitAmountMinor,
            totalAmountMinor: item.totalAmountMinor,
            currency: "BTC",
            sortOrder: index,
            metadata: item.metadata
              ? (item.metadata as Prisma.InputJsonObject)
              : undefined,
          })),
        },
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const paymentUrl = buildInvoicePaymentLink(
      {
        id: invoice.id,
        merchantId: mid,
        paymentRail: "lightning",
      },
      origin
    );

    await db.invoice.update({
      where: { id: invoice.id },
      data: { paymentLink: paymentUrl },
    });

    // --- Send the email ---
    const sent = await sendInvoiceEmail({
      to: email,
      merchantName: merchant.businessName,
      amountSats,
      amountUsd,
      paymentUrl,
      sessionId: invoice.id,
      memo: [
        memo,
        serviceDate ? `Service date: ${serviceDate}` : null,
        serviceAddress ? `Service address: ${serviceAddress}` : null,
      ].filter(Boolean).join(" | ") || null,
    });

    if (!sent) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_FAILED",
            message: "Invoice was created, but email delivery failed. Check RESEND_API_KEY configuration.",
          },
          invoiceId: invoice.id,
          paymentUrl,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentUrl,
      amountSats,
      amountUsd,
      customerEmail: email,
      customerName,
      serviceAddress,
      serviceDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return apiError(400, "BAD_REQUEST", message);
  }
}
