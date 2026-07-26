-- Live leads: org scope + convert fields
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "productSummary" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "itemCount" INTEGER;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpDue" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lineItems" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "activities" JSONB NOT NULL DEFAULT '[]';

-- Drop global unique on leadNumber if present; use org-scoped unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Lead_leadNumber_key'
  ) THEN
    ALTER TABLE "Lead" DROP CONSTRAINT "Lead_leadNumber_key";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_organizationId_leadNumber_key"
  ON "Lead"("organizationId", "leadNumber");

CREATE INDEX IF NOT EXISTS "Lead_organizationId_status_idx"
  ON "Lead"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "Lead_organizationId_phone_idx"
  ON "Lead"("organizationId", "phone");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lead_organizationId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
