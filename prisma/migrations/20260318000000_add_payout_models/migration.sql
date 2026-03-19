-- ArxMint SPINE-ARX-03: Merchant Payout Automation
-- Adds PayoutConfig and Payout models for automated merchant settlement.

CREATE TABLE "payout_configs" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "thresholdSats" BIGINT,
    "rail" TEXT NOT NULL DEFAULT 'lightning',
    "destination" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amountSats" BIGINT NOT NULL,
    "rail" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txRef" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payout_configs_merchantId_key" ON "payout_configs"("merchantId");
CREATE INDEX "payouts_merchantId_status_idx" ON "payouts"("merchantId", "status");
CREATE INDEX "payouts_merchantId_createdAt_idx" ON "payouts"("merchantId", "createdAt");
