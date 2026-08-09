-- Inventory advanced: barcode, warehouses, lots, movement costing, accounting journals

ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "barcode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_organizationId_barcode_key"
  ON "ProductVariant"("organizationId", "barcode");

CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_organizationId_code_key"
  ON "Warehouse"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "Warehouse_organizationId_isActive_idx"
  ON "Warehouse"("organizationId", "isActive");

ALTER TABLE "Warehouse"
  DROP CONSTRAINT IF EXISTS "Warehouse_organizationId_fkey";
ALTER TABLE "Warehouse"
  ADD CONSTRAINT "Warehouse_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "InventoryStockLevel" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryStockLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryStockLevel_warehouseId_variantId_key"
  ON "InventoryStockLevel"("warehouseId", "variantId");
CREATE INDEX IF NOT EXISTS "InventoryStockLevel_organizationId_variantId_idx"
  ON "InventoryStockLevel"("organizationId", "variantId");

ALTER TABLE "InventoryStockLevel"
  DROP CONSTRAINT IF EXISTS "InventoryStockLevel_warehouseId_fkey";
ALTER TABLE "InventoryStockLevel"
  ADD CONSTRAINT "InventoryStockLevel_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryStockLevel"
  DROP CONSTRAINT IF EXISTS "InventoryStockLevel_variantId_fkey";
ALTER TABLE "InventoryStockLevel"
  ADD CONSTRAINT "InventoryStockLevel_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "InventoryLot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "lotNumber" TEXT NOT NULL,
  "barcode" TEXT,
  "manufacturedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLot_organizationId_variantId_lotNumber_key"
  ON "InventoryLot"("organizationId", "variantId", "lotNumber");
CREATE INDEX IF NOT EXISTS "InventoryLot_organizationId_expiresAt_idx"
  ON "InventoryLot"("organizationId", "expiresAt");
CREATE INDEX IF NOT EXISTS "InventoryLot_variantId_expiresAt_idx"
  ON "InventoryLot"("variantId", "expiresAt");
CREATE INDEX IF NOT EXISTS "InventoryLot_warehouseId_idx"
  ON "InventoryLot"("warehouseId");

ALTER TABLE "InventoryLot"
  DROP CONSTRAINT IF EXISTS "InventoryLot_organizationId_fkey";
ALTER TABLE "InventoryLot"
  ADD CONSTRAINT "InventoryLot_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryLot"
  DROP CONSTRAINT IF EXISTS "InventoryLot_variantId_fkey";
ALTER TABLE "InventoryLot"
  ADD CONSTRAINT "InventoryLot_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLot"
  DROP CONSTRAINT IF EXISTS "InventoryLot_warehouseId_fkey";
ALTER TABLE "InventoryLot"
  ADD CONSTRAINT "InventoryLot_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "lotId" TEXT;
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(12,2);
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "valueDelta" DECIMAL(14,2);
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "InventoryStockMovement" ADD COLUMN IF NOT EXISTS "transferGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "InventoryStockMovement_organizationId_reason_createdAt_idx"
  ON "InventoryStockMovement"("organizationId", "reason", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryStockMovement_organizationId_warehouseId_createdAt_idx"
  ON "InventoryStockMovement"("organizationId", "warehouseId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryStockMovement_organizationId_sourceType_sourceId_idx"
  ON "InventoryStockMovement"("organizationId", "sourceType", "sourceId");

ALTER TABLE "InventoryStockMovement"
  DROP CONSTRAINT IF EXISTS "InventoryStockMovement_warehouseId_fkey";
ALTER TABLE "InventoryStockMovement"
  ADD CONSTRAINT "InventoryStockMovement_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryStockMovement"
  DROP CONSTRAINT IF EXISTS "InventoryStockMovement_lotId_fkey";
ALTER TABLE "InventoryStockMovement"
  ADD CONSTRAINT "InventoryStockMovement_lotId_fkey"
  FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AccountingJournalEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingJournalEntry_organizationId_eventKey_key"
  ON "AccountingJournalEntry"("organizationId", "eventKey");
CREATE INDEX IF NOT EXISTS "AccountingJournalEntry_organizationId_entryDate_idx"
  ON "AccountingJournalEntry"("organizationId", "entryDate");
CREATE INDEX IF NOT EXISTS "AccountingJournalEntry_organizationId_sourceType_sourceId_idx"
  ON "AccountingJournalEntry"("organizationId", "sourceType", "sourceId");

ALTER TABLE "AccountingJournalEntry"
  DROP CONSTRAINT IF EXISTS "AccountingJournalEntry_organizationId_fkey";
ALTER TABLE "AccountingJournalEntry"
  ADD CONSTRAINT "AccountingJournalEntry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AccountingJournalLine" (
  "id" TEXT NOT NULL,
  "journalEntryId" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT "AccountingJournalLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AccountingJournalLine_journalEntryId_idx"
  ON "AccountingJournalLine"("journalEntryId");
CREATE INDEX IF NOT EXISTS "AccountingJournalLine_accountCode_idx"
  ON "AccountingJournalLine"("accountCode");

ALTER TABLE "AccountingJournalLine"
  DROP CONSTRAINT IF EXISTS "AccountingJournalLine_journalEntryId_fkey";
ALTER TABLE "AccountingJournalLine"
  ADD CONSTRAINT "AccountingJournalLine_journalEntryId_fkey"
  FOREIGN KEY ("journalEntryId") REFERENCES "AccountingJournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default warehouse per org + backfill stock levels from variant.stock
INSERT INTO "Warehouse" ("id", "organizationId", "code", "name", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", 'MAIN', 'Main warehouse', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "Warehouse" w WHERE w."organizationId" = o."id" AND w."isDefault" = true
);

INSERT INTO "InventoryStockLevel" ("id", "organizationId", "warehouseId", "variantId", "quantity", "updatedAt")
SELECT gen_random_uuid()::text, v."organizationId", w."id", v."id", v."stock", CURRENT_TIMESTAMP
FROM "ProductVariant" v
JOIN "Warehouse" w ON w."organizationId" = v."organizationId" AND w."isDefault" = true
WHERE NOT EXISTS (
  SELECT 1 FROM "InventoryStockLevel" s
  WHERE s."warehouseId" = w."id" AND s."variantId" = v."id"
);
