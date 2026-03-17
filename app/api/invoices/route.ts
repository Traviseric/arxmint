import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  calculateInvoiceSummary,
  generateInvoiceNumber,
  isInvoiceCurrency,
  isInvoicePaymentRail,
  isInvoiceStatus,
  type InvoiceCurrency,
  type InvoicePaymentRail,
} from "@/lib/invoices";
import { parseTeneoActiveOrg } from "@/lib/teneo-jwt";

type InvoiceCreateBody = {
  fromOrgId?: string;
  fromOrgName?: string;
  toOrgId?: string;
  toOrgName?: string;
  merchantId?: string;
  currency?: InvoiceCurrency;
  paymentRail?: InvoicePaymentRail;
  dueDate?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitAmountMinor: number;
    metadata?: Record<string, unknown>;
  }>;
};

function resolveRequester(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  const activeOrg = parseTeneoActiveOrg(
    request.headers.get("X-Teneo-Auth") ?? "",
    "arxmint"
  );

  if (!caller && !activeOrg) {
    return null;
  }

  return { caller, activeOrg };
}

export async function GET(request: NextRequest) {
  const requester = resolveRequester(request);
  if (!requester) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") ?? "any";
  const requestedOrgId = searchParams.get("orgId") ?? undefined;
  const rawStatus = searchParams.get("status") ?? undefined;
  if (rawStatus && !isInvoiceStatus(rawStatus)) {
    return NextResponse.json({ error: "Invalid invoice status filter" }, { status: 400 });
  }
  const status = rawStatus && isInvoiceStatus(rawStatus) ? rawStatus : undefined;

  if (requester.activeOrg && requestedOrgId && requestedOrgId !== requester.activeOrg.id) {
    return NextResponse.json(
      { error: "TENEO org does not match requested invoice scope" },
      { status: 403 }
    );
  }

  const orgId = requester.activeOrg?.id ?? requestedOrgId;
  if (!orgId) {
    return NextResponse.json(
      { error: "orgId query param or X-Teneo-Auth org context is required" },
      { status: 400 }
    );
  }

  const where =
    direction === "from"
      ? { fromOrgId: orgId, ...(status ? { status } : {}) }
      : direction === "to"
        ? { toOrgId: orgId, ...(status ? { status } : {}) }
        : {
            OR: [{ fromOrgId: orgId }, { toOrgId: orgId }],
            ...(status ? { status } : {}),
          };

  const invoices = await db.invoice.findMany({
    where,
    include: {
      lineItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invoices, count: invoices.length });
}

export async function POST(request: NextRequest) {
  const requester = resolveRequester(request);
  if (!requester) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InvoiceCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const activeOrg = requester.activeOrg;
  const fromOrgId = activeOrg?.id ?? body.fromOrgId?.trim();
  const fromOrgName = activeOrg?.name ?? body.fromOrgName?.trim() ?? null;
  const toOrgId = body.toOrgId?.trim();
  const toOrgName = body.toOrgName?.trim() ?? null;

  if (!fromOrgId) {
    return NextResponse.json({ error: "fromOrgId is required" }, { status: 400 });
  }

  if (activeOrg && body.fromOrgId && body.fromOrgId.trim() !== activeOrg.id) {
    return NextResponse.json(
      { error: "TENEO org does not match fromOrgId" },
      { status: 403 }
    );
  }

  if (!toOrgId) {
    return NextResponse.json({ error: "toOrgId is required" }, { status: 400 });
  }

  const currency = body.currency ?? "BTC";
  if (!isInvoiceCurrency(currency)) {
    return NextResponse.json({ error: "Invalid invoice currency" }, { status: 400 });
  }

  const paymentRail = body.paymentRail ?? "lightning";
  if (!isInvoicePaymentRail(paymentRail)) {
    return NextResponse.json({ error: "Invalid invoice payment rail" }, { status: 400 });
  }

  const summary = calculateInvoiceSummary(body.lineItems ?? []);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      fromOrgId,
      fromOrgName,
      toOrgId,
      toOrgName,
      merchantId: body.merchantId?.trim() || null,
      currency,
      paymentRail,
      subtotalMinor: summary.subtotalMinor,
      totalMinor: summary.totalMinor,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes?.trim() || null,
      metadata: body.metadata
        ? (body.metadata as Prisma.InputJsonObject)
        : Prisma.DbNull,
      createdByNostrPubkey: requester.caller ?? null,
      lineItems: {
        create: summary.normalizedLineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmountMinor: item.unitAmountMinor,
          totalAmountMinor: item.totalAmountMinor,
          currency,
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

  return NextResponse.json({ invoice }, { status: 201 });
}
