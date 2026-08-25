-- CreateTable
CREATE TABLE "OrgCustomerPurchaseSegment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "op" TEXT NOT NULL DEFAULT 'eq',
    "threshold" INTEGER NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'deliveredCount',
    "displayMode" TEXT NOT NULL DEFAULT 'sidebar_and_tab',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgCustomerPurchaseSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgCustomerPurchaseSegment_organizationId_isActive_idx" ON "OrgCustomerPurchaseSegment"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "OrgCustomerPurchaseSegment_organizationId_deletedAt_idx" ON "OrgCustomerPurchaseSegment"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgCustomerPurchaseSegment_organizationId_slug_key" ON "OrgCustomerPurchaseSegment"("organizationId", "slug");

-- AddForeignKey
ALTER TABLE "OrgCustomerPurchaseSegment" ADD CONSTRAINT "OrgCustomerPurchaseSegment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
