-- Per-tenant courier integrations + status maps + order courier status fields

CREATE TABLE IF NOT EXISTS "CourierIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "storeId" TEXT,
    "credentialsEnc" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "syncIntervalSec" INTEGER NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourierIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourierIntegration_organizationId_provider_key"
  ON "CourierIntegration"("organizationId", "provider");
CREATE INDEX IF NOT EXISTS "CourierIntegration_organizationId_enabled_idx"
  ON "CourierIntegration"("organizationId", "enabled");

ALTER TABLE "CourierIntegration"
  DROP CONSTRAINT IF EXISTS "CourierIntegration_organizationId_fkey";
ALTER TABLE "CourierIntegration"
  ADD CONSTRAINT "CourierIntegration_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CourierStatusMap" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "crmStatus" TEXT,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourierStatusMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourierStatusMap_organizationId_provider_slug_key"
  ON "CourierStatusMap"("organizationId", "provider", "slug");
CREATE INDEX IF NOT EXISTS "CourierStatusMap_organizationId_provider_isActive_idx"
  ON "CourierStatusMap"("organizationId", "provider", "isActive");

ALTER TABLE "CourierStatusMap"
  DROP CONSTRAINT IF EXISTS "CourierStatusMap_organizationId_fkey";
ALTER TABLE "CourierStatusMap"
  ADD CONSTRAINT "CourierStatusMap_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierStatusSlug" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierStatusSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_organizationId_courierStatusSlug_idx"
  ON "Order"("organizationId", "courierStatusSlug");
CREATE INDEX IF NOT EXISTS "Order_organizationId_courierProvider_courierConsignmentId_idx"
  ON "Order"("organizationId", "courierProvider", "courierConsignmentId");
CREATE INDEX IF NOT EXISTS "Order_courierProvider_courierStatusSyncedAt_idx"
  ON "Order"("courierProvider", "courierStatusSyncedAt");
