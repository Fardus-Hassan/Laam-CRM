-- CreateTable
CREATE TABLE "FailedOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "queueStatus" TEXT NOT NULL DEFAULT 'pending',
    "failedType" TEXT NOT NULL,
    "website" TEXT,
    "lastUpdateNote" TEXT,
    "payload" JSONB NOT NULL,
    "recoveredOrderId" TEXT,
    "recoveredAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedOrder_organizationId_queueStatus_createdAt_idx" ON "FailedOrder"("organizationId", "queueStatus", "createdAt");

-- CreateIndex
CREATE INDEX "FailedOrder_organizationId_failedType_idx" ON "FailedOrder"("organizationId", "failedType");

-- CreateIndex
CREATE INDEX "FailedOrder_organizationId_website_idx" ON "FailedOrder"("organizationId", "website");

-- CreateIndex
CREATE INDEX "FailedOrder_organizationId_createdAt_idx" ON "FailedOrder"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "FailedOrder" ADD CONSTRAINT "FailedOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
