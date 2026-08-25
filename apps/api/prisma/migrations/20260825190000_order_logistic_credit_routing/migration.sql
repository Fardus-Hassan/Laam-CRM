-- KPI / assignment fields present in schema but missing from migrations.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "logisticAssignedUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "logisticAssignedAgentName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderCreditUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderCreditAgentName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderCreditedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "inboundOriginalSnapshot" JSONB;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "incentiveFlags" JSONB;

CREATE INDEX IF NOT EXISTS "Order_organizationId_logisticAssignedUserId_idx"
  ON "Order"("organizationId", "logisticAssignedUserId");
CREATE INDEX IF NOT EXISTS "Order_organizationId_orderCreditUserId_idx"
  ON "Order"("organizationId", "orderCreditUserId");

CREATE TABLE IF NOT EXISTS "OrgRoutingConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderMode" TEXT NOT NULL DEFAULT 'auto_split',
  "orderTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "orderAssigneeUserId" TEXT,
  "courierMode" TEXT NOT NULL DEFAULT 'auto_split',
  "courierTeamIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "courierAssigneeUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrgRoutingConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgRoutingConfig_organizationId_key"
  ON "OrgRoutingConfig"("organizationId");
CREATE INDEX IF NOT EXISTS "OrgRoutingConfig_organizationId_idx"
  ON "OrgRoutingConfig"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrgRoutingConfig_organizationId_fkey'
  ) THEN
    ALTER TABLE "OrgRoutingConfig"
      ADD CONSTRAINT "OrgRoutingConfig_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
