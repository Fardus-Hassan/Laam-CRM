-- Live follow-ups for order create + Skip Followup
CREATE TABLE IF NOT EXISTS "Followup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "queue" INTEGER NOT NULL DEFAULT 1,
  "orderId" TEXT,
  "orderNumber" TEXT,
  "customerId" TEXT NOT NULL,
  "customerNumber" TEXT NOT NULL,
  "scheduleDate" DATE,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "area" TEXT,
  "district" TEXT,
  "followupNotes" TEXT,
  "customerNotes" TEXT,
  "followupStatus" TEXT NOT NULL DEFAULT 'no_status',
  "type" TEXT NOT NULL DEFAULT 'listed',
  "recentProducts" JSONB NOT NULL DEFAULT '[]',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "smsStatus" TEXT NOT NULL DEFAULT 'not_sent',
  "assignedAgentName" TEXT,
  "source" TEXT NOT NULL,
  "activities" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Followup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Followup_organizationId_orderId_key"
  ON "Followup"("organizationId", "orderId");

CREATE INDEX IF NOT EXISTS "Followup_organizationId_queue_idx"
  ON "Followup"("organizationId", "queue");

CREATE INDEX IF NOT EXISTS "Followup_organizationId_phone_idx"
  ON "Followup"("organizationId", "phone");

CREATE INDEX IF NOT EXISTS "Followup_organizationId_scheduleDate_idx"
  ON "Followup"("organizationId", "scheduleDate");

CREATE INDEX IF NOT EXISTS "Followup_organizationId_followupStatus_idx"
  ON "Followup"("organizationId", "followupStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Followup_organizationId_fkey'
  ) THEN
    ALTER TABLE "Followup"
      ADD CONSTRAINT "Followup_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
