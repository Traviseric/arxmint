// ============================================================
// ArxMint — Merchant Dashboard Invoices API
// GET /api/merchant-dashboard/invoices?merchantId=xxx
// Returns canonical Prisma invoices for the merchant dashboard.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isInvoiceStatus, type InvoiceStatus } from "@/lib/invoices";
import { requireMerchantDashboardAccess } from "@/lib/merchant-dashboard-auth";

type InvoiceMetadata = {
  customerEmail?: string;
  customerName?: string;
  serviceAddress?: string;
  serviceDate?: string;
};

function readMetadata(value: unknown): InvoiceMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const metadata = value as Record<string, unknown>;
  return {
    customerEmail:
      typeof metadata.customerEmail === "string" ? metadata.customerEmail : undefined,
    customerName:
      typeof metadata.customerName === "string" ? metadata.customerName : undefined,
    serviceAddress:
      typeof metadata.serviceAddress === "string" ? metadata.serviceAddress : undefined,
    serviceDate:
      typeof metadata.serviceDate === "string" ? metadata.serviceDate : undefined,
  };
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`rl:merchant-invoices:ip:${ip}`, RATE_LIMITS.public);
  if (!rl.allowed) {
    return apiError(429, "RATE_LIMITED", `Too many requests. Retry after ${rl.retryAfter} seconds.`);
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId")?.trim();
  const statusParam = searchParams.get("status")?.trim();
  const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10)));

  if (!merchantId) {
    return apiError(400, "MISSING_MERCHANT_ID", "merchantId query param is required.");
  }

  const authError = await requireMerchantDashboardAccess(request, merchantId, "read");
  if (authError) return authError;

  let status: InvoiceStatus | undefined;
  if (statusParam) {
    if (!isInvoiceStatus(statusParam)) {
      return apiError(400, "INVALID_STATUS", "Invalid invoice status filter.");
    }
    status = statusParam;
  }

  try {
    const invoices = await db.invoice.findMany({
      where: {
        merchantId,
        ...(status ? { status } : {}),
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      invoices: invoices.map((invoice) => {
        const metadata = readMetadata(invoice.metadata);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          currency: invoice.currency,
          paymentRail: invoice.paymentRail,
          totalMinor: invoice.totalMinor,
          dueDate: invoice.dueDate?.toISOString() ?? null,
          sentAt: invoice.sentAt?.toISOString() ?? null,
          paidAt: invoice.paidAt?.toISOString() ?? null,
          createdAt: invoice.createdAt.toISOString(),
          toOrgName: invoice.toOrgName,
          customerEmail: metadata.customerEmail ?? null,
          customerName: metadata.customerName ?? invoice.toOrgName ?? null,
          serviceAddress: metadata.serviceAddress ?? null,
          serviceDate: metadata.serviceDate ?? null,
          paymentLink: invoice.paymentLink,
          lineItems: invoice.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitAmountMinor: item.unitAmountMinor,
            totalAmountMinor: item.totalAmountMinor,
          })),
        };
      }),
      count: invoices.length,
      invoicesAvailable: true,
    });
  } catch {
    return NextResponse.json({
      invoices: [],
      count: 0,
      invoicesAvailable: false,
    });
  }
}
