-- AlterTable
ALTER TABLE "IncentivePlans" ADD COLUMN "orgTeamId" TEXT;

-- CreateIndex
CREATE INDEX "IncentivePlans_organizationId_orgTeamId_idx" ON "IncentivePlans"("organizationId", "orgTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePlans_organizationId_orgTeamId_key" ON "IncentivePlans"("organizationId", "orgTeamId") WHERE "orgTeamId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "IncentivePlans" ADD CONSTRAINT "IncentivePlans_orgTeamId_fkey" FOREIGN KEY ("orgTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
