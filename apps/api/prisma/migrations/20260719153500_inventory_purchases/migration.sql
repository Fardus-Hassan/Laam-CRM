-- CreateTable
CREATE TABLE "InventorySupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "stockStatus" TEXT NOT NULL DEFAULT 'pending',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receivedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchaseLine" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventorySupplier_organizationId_name_key"
ON "InventorySupplier"("organizationId", "name");

-- CreateIndex
CREATE INDEX "InventorySupplier_organizationId_status_idx"
ON "InventorySupplier"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPurchase_organizationId_purchaseNumber_key"
ON "InventoryPurchase"("organizationId", "purchaseNumber");

-- CreateIndex
CREATE INDEX "InventoryPurchase_organizationId_purchaseDate_idx"
ON "InventoryPurchase"("organizationId", "purchaseDate");

-- CreateIndex
CREATE INDEX "InventoryPurchase_organizationId_stockStatus_idx"
ON "InventoryPurchase"("organizationId", "stockStatus");

-- CreateIndex
CREATE INDEX "InventoryPurchase_supplierId_idx"
ON "InventoryPurchase"("supplierId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseLine_purchaseId_idx"
ON "InventoryPurchaseLine"("purchaseId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseLine_productId_idx"
ON "InventoryPurchaseLine"("productId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseLine_variantId_idx"
ON "InventoryPurchaseLine"("variantId");

-- AddForeignKey
ALTER TABLE "InventorySupplier"
ADD CONSTRAINT "InventorySupplier_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase"
ADD CONSTRAINT "InventoryPurchase_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase"
ADD CONSTRAINT "InventoryPurchase_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "InventorySupplier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseLine"
ADD CONSTRAINT "InventoryPurchaseLine_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "InventoryPurchase"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseLine"
ADD CONSTRAINT "InventoryPurchaseLine_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchaseLine"
ADD CONSTRAINT "InventoryPurchaseLine_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
