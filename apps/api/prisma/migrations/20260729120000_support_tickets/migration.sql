-- Internal staff SupportTicket table

CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "assigneeName" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_priority_idx" ON "SupportTicket"("organizationId", "priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_customerMobile_idx" ON "SupportTicket"("organizationId", "customerMobile");
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_createdAt_idx" ON "SupportTicket"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_orderNumber_idx" ON "SupportTicket"("organizationId", "orderNumber");

DO $$ BEGIN
  ALTER TABLE "SupportTicket"
    ADD CONSTRAINT "SupportTicket_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
