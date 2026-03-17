import { logger } from "@/lib/logger";
import {
  buildInvoiceStateChangedPayload,
  type InvoiceRecordLike,
  type InvoiceStatus,
} from "@/lib/invoices";

type InvoiceEventLineItem = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  totalAmountMinor: number;
};

export async function emitInvoiceStateChanged(args: {
  invoice: InvoiceRecordLike;
  previousStatus: InvoiceStatus;
  lineItems: InvoiceEventLineItem[];
}): Promise<void> {
  const payload = buildInvoiceStateChangedPayload(
    args.invoice,
    args.previousStatus,
    args.lineItems
  );

  logger.info("invoice_state_changed", {
    action: "invoice_state_changed",
    invoiceId: args.invoice.id,
    invoiceNumber: args.invoice.invoiceNumber,
    previousStatus: args.previousStatus,
    status: args.invoice.status,
    fromOrgId: args.invoice.fromOrgId,
    toOrgId: args.invoice.toOrgId,
    totalMinor: args.invoice.totalMinor,
    currency: args.invoice.currency,
  });

  const webhookUrl = process.env.INVOICE_EVENTS_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ArxMint-Event": payload.event,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn("invoice_event_webhook_failed", {
        action: "invoice_event_webhook_failed",
        invoiceId: args.invoice.id,
        status: response.status,
      });
    }
  } catch (error: unknown) {
    logger.warn("invoice_event_webhook_error", {
      action: "invoice_event_webhook_error",
      invoiceId: args.invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
