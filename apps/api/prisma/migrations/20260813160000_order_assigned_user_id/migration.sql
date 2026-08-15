-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_organizationId_assignedUserId_idx" ON "Order"("organizationId", "assignedUserId");

-- CreateIndex (ensure name index exists for KPI fallback)
CREATE INDEX IF NOT EXISTS "Order_organizationId_assignedAgentName_idx" ON "Order"("organizationId", "assignedAgentName");
