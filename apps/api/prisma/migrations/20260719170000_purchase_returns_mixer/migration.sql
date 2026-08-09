-- CreateTable
CREATE TABLE "InventoryPurchaseReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "returnNumber" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchaseReturnLine" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPurchaseReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixerRecipe" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputProductId" TEXT NOT NULL,
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "inputs" JSONB NOT NULL,
    "lastMixedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MixerRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "outputProductId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPurchaseReturn_organizationId_returnNumber_key"
ON "InventoryPurchaseReturn"("organizationId", "returnNumber");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturn_organizationId_returnDate_idx"
ON "InventoryPurchaseReturn"("organizationId", "returnDate");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturn_organizationId_status_idx"
ON "InventoryPurchaseReturn"("organizationId", "status");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturn_purchaseId_idx"
ON "InventoryPurchaseReturn"("purchaseId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturnLine_returnId_idx"
ON "InventoryPurchaseReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturnLine_productId_idx"
ON "InventoryPurchaseReturnLine"("productId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseReturnLine_variantId_idx"
ON "InventoryPurchaseReturnLine"("variantId");

-- CreateIndex
CREATE INDEX "MixerRecipe_organizationId_status_idx"
ON "MixerRecipe"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MixerRecipe_outputProductId_idx"
ON "MixerRecipe"("outputProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_organizationId_batchNumber_key"
ON "ProductionBatch"("organizationId", "batchNumber");

-- CreateIndex
CREATE INDEX "ProductionBatch_organizationId_createdAt_idx"
ON "ProductionBatch"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductionBatch_outputProductId_idx"
ON "ProductionBatch"("outputProductId");

-- AddForeignKey
ALTER TABLE "InventoryPurchaseReturn"
ADD CONSTRAINT "InventoryPurchaseReturn_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseReturn"
ADD CONSTRAINT "InventoryPurchaseReturn_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "InventoryPurchase"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseReturnLine"
ADD CONSTRAINT "InventoryPurchaseReturnLine_returnId_fkey"
FOREIGN KEY ("returnId") REFERENCES "InventoryPurchaseReturn"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseReturnLine"
ADD CONSTRAINT "InventoryPurchaseReturnLine_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseReturnLine"
ADD CONSTRAINT "InventoryPurchaseReturnLine_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixerRecipe"
ADD CONSTRAINT "MixerRecipe_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixerRecipe"
ADD CONSTRAINT "MixerRecipe_outputProductId_fkey"
FOREIGN KEY ("outputProductId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_outputProductId_fkey"
FOREIGN KEY ("outputProductId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
