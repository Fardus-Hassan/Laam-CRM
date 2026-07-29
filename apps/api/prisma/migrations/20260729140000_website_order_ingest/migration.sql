-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "websiteStoreId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebsiteStore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "storeUrl" TEXT,
    "ingestTokenHash" TEXT NOT NULL,
    "credentialsEnc" TEXT,
    "lastIngestAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteStore_ingestTokenHash_key" ON "WebsiteStore"("ingestTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteStore_organizationId_slug_key" ON "WebsiteStore"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "WebsiteStore_organizationId_enabled_idx" ON "WebsiteStore"("organizationId", "enabled");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_organizationId_websiteStoreId_externalOrderId_key"
  ON "Order"("organizationId", "websiteStoreId", "externalOrderId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_websiteStoreId_idx" ON "Order"("organizationId", "websiteStoreId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WebsiteStore" ADD CONSTRAINT "WebsiteStore_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_websiteStoreId_fkey"
    FOREIGN KEY ("websiteStoreId") REFERENCES "WebsiteStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
