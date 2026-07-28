-- People module: phone-unique Customer + live Contacts + Order.customerId

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerNumber" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "altMobile" TEXT,
    "district" TEXT,
    "area" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'none',
    "source" TEXT,
    "assignedAgentName" TEXT,
    "hasFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDue" TIMESTAMP(3),
    "firstOrderAt" TIMESTAMP(3),
    "lastOrderAt" TIMESTAMP(3),
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_organizationId_phoneNormalized_key"
  ON "Customer"("organizationId", "phoneNormalized");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_organizationId_customerNumber_key"
  ON "Customer"("organizationId", "customerNumber");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_lastOrderAt_idx"
  ON "Customer"("organizationId", "lastOrderAt");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_name_idx"
  ON "Customer"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_status_idx"
  ON "Customer"("organizationId", "status");

DO $$ BEGIN
  ALTER TABLE "Customer"
    ADD CONSTRAINT "Customer_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_organizationId_customerId_idx"
  ON "Order"("organizationId", "customerId");

DO $$ BEGIN
  ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Contacts: make org-required and add CRM fields (safe for empty/fixture-only tables)
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "contactType" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "inventorySupplierId" TEXT;

-- Backfill orphan contacts into a placeholder org is skipped; delete rows without org if any
DELETE FROM "Contact" WHERE "organizationId" IS NULL;

-- organizationId was optional; enforce NOT NULL after cleanup
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Contact"
    ADD CONSTRAINT "Contact_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Contact_organizationId_contactType_idx"
  ON "Contact"("organizationId", "contactType");
CREATE INDEX IF NOT EXISTS "Contact_organizationId_phoneNormalized_idx"
  ON "Contact"("organizationId", "phoneNormalized");
CREATE INDEX IF NOT EXISTS "Contact_organizationId_name_idx"
  ON "Contact"("organizationId", "name");
