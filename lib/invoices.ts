export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
] as const;

export const INVOICE_CURRENCIES = ["BTC", "USD"] as const;

export const INVOICE_PAYMENT_RAILS = [
  "lightning",
  "cashu",
  "stripe",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number];
export type InvoicePaymentRail = (typeof INVOICE_PAYMENT_RAILS)[number];
export type InvoiceAction = "send" | "mark_paid" | "mark_overdue" | "void";

export function isInvoiceCurrency(value: string): value is InvoiceCurrency {
  return (INVOICE_CURRENCIES as readonly string[]).includes(value);
}

export function isInvoicePaymentRail(value: string): value is InvoicePaymentRail {
  return (INVOICE_PAYMENT_RAILS as readonly string[]).includes(value);
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(value);
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  metadata?: Record<string, unknown>;
}

export interface InvoiceSummary {
  subtotalMinor: number;
  totalMinor: number;
  normalizedLineItems: Array<InvoiceLineItemInput & { totalAmountMinor: number }>;
}

export interface InvoiceRecordLike {
  id: string;
  invoiceNumber: string;
  fromOrgId: string;
  fromOrgName?: string | null;
  toOrgId: string;
  toOrgName?: string | null;
  merchantId?: string | null;
  status: InvoiceStatus;
  currency: InvoiceCurrency;
  paymentRail: InvoicePaymentRail;
  subtotalMinor: number;
  totalMinor: number;
  dueDate?: Date | string | null;
  sentAt?: Date | string | null;
  paidAt?: Date | string | null;
  voidedAt?: Date | string | null;
  paymentSessionId?: string | null;
  paymentLink?: string | null;
}

export interface InvoiceEventPayload {
  id: string;
  event: "invoice.state_changed";
  created: number;
  data: {
    invoiceId: string;
    invoiceNumber: string;
    previousStatus: InvoiceStatus;
    status: InvoiceStatus;
    fromOrgId: string;
    fromOrgName?: string | null;
    toOrgId: string;
    toOrgName?: string | null;
    merchantId?: string | null;
    currency: InvoiceCurrency;
    subtotalMinor: number;
    totalMinor: number;
    dueDate?: string | null;
    sentAt?: string | null;
    paidAt?: string | null;
    paymentSessionId?: string | null;
    paymentLink?: string | null;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitAmountMinor: number;
      totalAmountMinor: number;
    }>;
  };
}

function isValidMinorAmount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function normalizeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function calculateInvoiceSummary(
  lineItems: InvoiceLineItemInput[]
): InvoiceSummary {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error("At least one invoice line item is required");
  }

  let subtotalMinor = 0;
  const normalizedLineItems = lineItems.map((item) => {
    if (!item.description || !item.description.trim()) {
      throw new Error("Invoice line item description is required");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invoice line item quantity must be a positive integer");
    }

    if (!isValidMinorAmount(item.unitAmountMinor)) {
      throw new Error("Invoice line item unitAmountMinor must be a non-negative integer");
    }

    const totalAmountMinor = item.quantity * item.unitAmountMinor;
    subtotalMinor += totalAmountMinor;

    return {
      description: item.description.trim(),
      quantity: item.quantity,
      unitAmountMinor: item.unitAmountMinor,
      totalAmountMinor,
      metadata: item.metadata,
    };
  });

  return {
    subtotalMinor,
    totalMinor: subtotalMinor,
    normalizedLineItems,
  };
}

export function generateInvoiceNumber(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ARX-${year}${month}${day}-${suffix}`;
}

export function resolveInvoiceTransition(
  currentStatus: InvoiceStatus,
  action: InvoiceAction
): { status: InvoiceStatus; sentAt?: Date; paidAt?: Date; voidedAt?: Date } {
  const now = new Date();

  switch (action) {
    case "send":
      if (currentStatus !== "draft") {
        throw new Error("Only draft invoices can be sent");
      }
      return { status: "sent", sentAt: now };
    case "mark_paid":
      if (currentStatus !== "sent" && currentStatus !== "overdue") {
        throw new Error("Only sent or overdue invoices can be marked paid");
      }
      return { status: "paid", paidAt: now };
    case "mark_overdue":
      if (currentStatus !== "sent") {
        throw new Error("Only sent invoices can be marked overdue");
      }
      return { status: "overdue" };
    case "void":
      if (currentStatus === "paid" || currentStatus === "void") {
        throw new Error("Paid or void invoices cannot be voided");
      }
      return { status: "void", voidedAt: now };
    default:
      throw new Error("Unsupported invoice action");
  }
}

export function shouldMarkInvoiceOverdue(
  status: InvoiceStatus,
  dueDate?: Date | string | null,
  now = new Date()
): boolean {
  if (status !== "sent" || !dueDate) {
    return false;
  }

  return new Date(dueDate).getTime() < now.getTime();
}

export function buildInvoicePdfUrl(invoiceId: string, origin: string): string {
  const baseOrigin = origin.replace(/\/$/, "");
  return `${baseOrigin}/api/invoices/${invoiceId}/pdf`;
}

export function buildInvoicePaymentLink(
  invoice: Pick<InvoiceRecordLike, "id" | "merchantId" | "paymentRail">,
  origin: string
): string {
  const baseOrigin = origin.replace(/\/$/, "");
  if (invoice.merchantId) {
    const search = new URLSearchParams({ invoiceId: invoice.id });
    if (invoice.paymentRail === "stripe") {
      search.set("rail", "stripe");
    }
    return `${baseOrigin}/pay/${invoice.merchantId}?${search.toString()}`;
  }

  return `${baseOrigin}/api/invoices/${invoice.id}/checkout`;
}

export function buildInvoiceStateChangedPayload(
  invoice: InvoiceRecordLike,
  previousStatus: InvoiceStatus,
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmountMinor: number;
    totalAmountMinor: number;
  }>
): InvoiceEventPayload {
  return {
    id: `inv_evt_${invoice.id}_${Date.now()}`,
    event: "invoice.state_changed",
    created: Math.floor(Date.now() / 1000),
    data: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      previousStatus,
      status: invoice.status,
      fromOrgId: invoice.fromOrgId,
      fromOrgName: invoice.fromOrgName ?? null,
      toOrgId: invoice.toOrgId,
      toOrgName: invoice.toOrgName ?? null,
      merchantId: invoice.merchantId ?? null,
      currency: invoice.currency,
      subtotalMinor: invoice.subtotalMinor,
      totalMinor: invoice.totalMinor,
      dueDate: normalizeDate(invoice.dueDate),
      sentAt: normalizeDate(invoice.sentAt),
      paidAt: normalizeDate(invoice.paidAt),
      paymentSessionId: invoice.paymentSessionId ?? null,
      paymentLink: invoice.paymentLink ?? null,
      lineItems,
    },
  };
}
