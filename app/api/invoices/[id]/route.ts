import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { emitInvoiceStateChanged } from "@/lib/invoice-events";
import {
  buildInvoicePaymentLink,
  calculateInvoiceSummary,
  isInvoicePaymentRail,
  resolveInvoiceTransition,
  shouldMarkInvoiceOverdue,
  type InvoiceAction,
  type InvoicePaymentRail,
} from "@/lib/invoices";
import { parseTeneoActiveOrg } from "@/lib/teneo-jwt";

type Params = {
  params: Promise<{ id: string }>;
};

type InvoicePatchBody = {
  action?: InvoiceAction;
  toOrgName?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  merchantId?: string | null;
  paymentRail?: InvoicePaymentRail;
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

function hasInvoiceAccess(
  invoice: { fromOrgId: string; toOrgId: string },
  orgId?: string
): boolean {
  if (!orgId) {
    return true;
  }

  return invoice.fromOrgId === orgId || invoice.toOrgId === orgId;
}

function getOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || url.origin;
}

async function loadInvoice(id: string) {
  return db.invoice.findUnique({
    where: { id },
    include: {
      lineItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  const requester = resolveRequester(request);
  if (!requester) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await loadInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!hasInvoiceAccess(invoice, requester.activeOrg?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (shouldMarkInvoiceOverdue(invoice.status, invoice.dueDate)) {
    const updated = await db.invoice.update({
      where: { id },
      data: { status: "overdue" },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    await emitInvoiceStateChanged({
      invoice: updated,
      previousStatus: "sent",
      lineItems: updated.lineItems,
    });

    return NextResponse.json({ invoice: updated });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const requester = resolveRequester(request);
  if (!requester) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: InvoicePatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const invoice = await loadInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!hasInvoiceAccess(invoice, requester.activeOrg?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!body.action) {
    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft invoices can be edited without a state action" },
        { status: 409 }
      );
    }

    const data: {
      toOrgName?: string | null;
      dueDate?: Date | null;
      notes?: string | null;
      merchantId?: string | null;
      paymentRail?: InvoicePaymentRail;
      subtotalMinor?: number;
      totalMinor?: number;
    } = {};

    if (body.toOrgName !== undefined) {
      data.toOrgName = body.toOrgName?.trim() || null;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes?.trim() || null;
    }
    if (body.merchantId !== undefined) {
      data.merchantId = body.merchantId?.trim() || null;
    }
    if (body.paymentRail !== undefined) {
      if (!isInvoicePaymentRail(body.paymentRail)) {
        return NextResponse.json({ error: "Invalid invoice payment rail" }, { status: 400 });
      }
      data.paymentRail = body.paymentRail;
    }
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.lineItems) {
      const summary = calculateInvoiceSummary(body.lineItems);
      data.subtotalMinor = summary.subtotalMinor;
      data.totalMinor = summary.totalMinor;

      const updated = await db.invoice.update({
        where: { id },
        data: {
          ...data,
          lineItems: {
            deleteMany: {},
            create: summary.normalizedLineItems.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmountMinor: item.unitAmountMinor,
              totalAmountMinor: item.totalAmountMinor,
              currency: invoice.currency,
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

      return NextResponse.json({ invoice: updated });
    }

    const updated = await db.invoice.update({
      where: { id },
      data,
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ invoice: updated });
  }

  let transition;
  try {
    transition = resolveInvoiceTransition(invoice.status, body.action);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid invoice action" },
      { status: 409 }
    );
  }

  const data: {
    status: "draft" | "sent" | "paid" | "overdue" | "void";
    sentAt?: Date | null;
    paidAt?: Date | null;
    voidedAt?: Date | null;
    merchantId?: string | null;
    paymentRail?: InvoicePaymentRail;
    paymentLink?: string | null;
  } = {
    status: transition.status,
  };

  if (transition.sentAt) data.sentAt = transition.sentAt;
  if (transition.paidAt) data.paidAt = transition.paidAt;
  if (transition.voidedAt) data.voidedAt = transition.voidedAt;

  if (body.action === "send") {
    const merchantId = body.merchantId?.trim() || invoice.merchantId;
    const paymentRail = body.paymentRail || invoice.paymentRail;
    if (!isInvoicePaymentRail(paymentRail)) {
      return NextResponse.json({ error: "Invalid invoice payment rail" }, { status: 400 });
    }
    data.merchantId = merchantId || null;
    data.paymentRail = paymentRail;
    data.paymentLink = buildInvoicePaymentLink(
      {
        id: invoice.id,
        merchantId,
        paymentRail,
      },
      getOrigin(request)
    );
  }

  const updated = await db.invoice.update({
    where: { id },
    data,
    include: {
      lineItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  await emitInvoiceStateChanged({
    invoice: updated,
    previousStatus: invoice.status,
    lineItems: updated.lineItems,
  });

  return NextResponse.json({ invoice: updated });
}
