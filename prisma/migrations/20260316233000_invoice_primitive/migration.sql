CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE "InvoiceCurrency" AS ENUM ('BTC', 'USD');
CREATE TYPE "InvoicePaymentRail" AS ENUM ('lightning', 'cashu', 'stripe');

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "fromOrgId" TEXT NOT NULL,
    "fromOrgName" TEXT,
    "toOrgId" TEXT NOT NULL,
    "toOrgName" TEXT,
    "merchantId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "currency" "InvoiceCurrency" NOT NULL,
    "paymentRail" "InvoicePaymentRail" NOT NULL DEFAULT 'lightning',
    "subtotalMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "paymentSessionId" TEXT,
    "paymentLink" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdByNostrPubkey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountMinor" INTEGER NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "currency" "InvoiceCurrency" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_paymentSessionId_key" ON "invoices"("paymentSessionId");
CREATE INDEX "invoices_fromOrgId_status_idx" ON "invoices"("fromOrgId", "status");
CREATE INDEX "invoices_toOrgId_status_idx" ON "invoices"("toOrgId", "status");
CREATE INDEX "invoices_merchantId_status_idx" ON "invoices"("merchantId", "status");
CREATE INDEX "invoices_dueDate_status_idx" ON "invoices"("dueDate", "status");
CREATE INDEX "invoice_line_items_invoiceId_sortOrder_idx" ON "invoice_line_items"("invoiceId", "sortOrder");

ALTER TABLE "invoice_line_items"
ADD CONSTRAINT "invoice_line_items_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
