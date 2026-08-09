-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cod',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "collectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "collectedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPayment_organizationId_status_idx" ON "OrderPayment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrderPayment_organizationId_method_idx" ON "OrderPayment"("organizationId", "method");

-- CreateIndex
CREATE INDEX "OrderPayment_organizationId_createdAt_idx" ON "OrderPayment"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPayment_organizationId_orderId_key" ON "OrderPayment"("organizationId", "orderId");

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one payment row per existing order
INSERT INTO "OrderPayment" (
  "id",
  "organizationId",
  "orderId",
  "method",
  "status",
  "collectedAmount",
  "collectedAt",
  "reconciledAt",
  "createdAt",
  "updatedAt"
)
SELECT
  (o."id" || '-pay'),
  o."organizationId",
  o."id",
  CASE
    WHEN lower(COALESCE(o."paymentMethod", '')) IN ('bkash', 'nagad', 'bank', 'cash', 'cod')
      THEN lower(o."paymentMethod")
    ELSE 'cod'
  END,
  CASE
    WHEN o."paymentStatus" = 'paid' OR (o."amount" > 0 AND o."paidAmount" >= o."amount")
      THEN 'reconciled'
    WHEN o."paidAmount" > 0 THEN 'collected'
    ELSE 'pending'
  END,
  COALESCE(o."paidAmount", 0),
  CASE WHEN COALESCE(o."paidAmount", 0) > 0 THEN o."createdAt" ELSE NULL END,
  CASE
    WHEN o."paymentStatus" = 'paid' OR (o."amount" > 0 AND o."paidAmount" >= o."amount")
      THEN o."updatedAt"
    ELSE NULL
  END,
  o."createdAt",
  NOW()
FROM "Order" o
ON CONFLICT ("organizationId", "orderId") DO NOTHING;
