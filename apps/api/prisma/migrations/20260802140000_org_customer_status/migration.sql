-- CreateTable
CREATE TABLE "OrgCustomerStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgCustomerStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgCustomerStatus_organizationId_isActive_idx" ON "OrgCustomerStatus"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "OrgCustomerStatus_organizationId_deletedAt_idx" ON "OrgCustomerStatus"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgCustomerStatus_organizationId_slug_key" ON "OrgCustomerStatus"("organizationId", "slug");

-- AddForeignKey
ALTER TABLE "OrgCustomerStatus" ADD CONSTRAINT "OrgCustomerStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;