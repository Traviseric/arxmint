-- CreateTable: escrows
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "payeeId" TEXT NOT NULL,
    "amountSats" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BTC',
    "releaseCondition" TEXT NOT NULL,
    "releasesAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending_funding',
    "invoiceId" TEXT,
    "paymentSessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: escrow_events
CREATE TABLE "escrow_events" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escrows_payerId_status_idx" ON "escrows"("payerId", "status");
CREATE INDEX "escrows_payeeId_status_idx" ON "escrows"("payeeId", "status");
CREATE INDEX "escrows_status_releasesAt_idx" ON "escrows"("status", "releasesAt");
CREATE INDEX "escrow_events_escrowId_idx" ON "escrow_events"("escrowId");

-- AddForeignKey
ALTER TABLE "escrow_events" ADD CONSTRAINT "escrow_events_escrowId_fkey"
    FOREIGN KEY ("escrowId") REFERENCES "escrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
