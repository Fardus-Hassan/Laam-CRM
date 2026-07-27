-- Soft-delete orders
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Order_organizationId_deletedAt_idx" ON "Order"("organizationId", "deletedAt");

-- Auto SMS on status change
ALTER TABLE "SmsIntegration" ADD COLUMN IF NOT EXISTS "autoSmsOnStatusChange" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SmsIntegration" ADD COLUMN IF NOT EXISTS "statusSmsMap" JSONB;

-- Org order queue folders
CREATE TABLE IF NOT EXISTS "OrgOrderQueue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'list',
    "href" TEXT NOT NULL,
    "sidebarOrder" INTEGER NOT NULL DEFAULT 10,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "defaultChildSlug" TEXT,
    "followUpDue" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgOrderQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgOrderQueue_organizationId_slug_key" ON "OrgOrderQueue"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "OrgOrderQueue_organizationId_isActive_idx" ON "OrgOrderQueue"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "OrgOrderQueue_organizationId_showInNav_idx" ON "OrgOrderQueue"("organizationId", "showInNav");

DO $$ BEGIN
  ALTER TABLE "OrgOrderQueue" ADD CONSTRAINT "OrgOrderQueue_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
