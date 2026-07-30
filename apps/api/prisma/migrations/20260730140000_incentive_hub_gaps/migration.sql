-- AlterTable
ALTER TABLE "IncentivePlans" ADD COLUMN "teamMonthlyTarget" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "IncentiveAssignments" ADD COLUMN "shift" TEXT;

-- AlterTable
ALTER TABLE "IncentiveOrgSettings" ADD COLUMN "shiftTemplates" JSONB;

-- CreateTable
CREATE TABLE "IncentiveManualActuals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "updatedByUserId" TEXT,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveManualActuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivePeriodRuns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalIncentiveBdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "paidByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentivePeriodRuns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivePayoutLines" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "agentName" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "teamName" TEXT,
    "metricType" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "incentiveBdt" DOUBLE PRECISION NOT NULL,
    "matchedSlabLabel" TEXT,
    "warning" TEXT,
    "notes" TEXT,

    CONSTRAINT "IncentivePayoutLines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveManualActuals_assignmentId_yearMonth_key" ON "IncentiveManualActuals"("assignmentId", "yearMonth");

-- CreateIndex
CREATE INDEX "IncentiveManualActuals_organizationId_yearMonth_idx" ON "IncentiveManualActuals"("organizationId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePeriodRuns_organizationId_yearMonth_key" ON "IncentivePeriodRuns"("organizationId", "yearMonth");

-- CreateIndex
CREATE INDEX "IncentivePeriodRuns_organizationId_status_idx" ON "IncentivePeriodRuns"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IncentivePayoutLines_runId_idx" ON "IncentivePayoutLines"("runId");

-- AddForeignKey
ALTER TABLE "IncentiveManualActuals" ADD CONSTRAINT "IncentiveManualActuals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveManualActuals" ADD CONSTRAINT "IncentiveManualActuals_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "IncentiveAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePeriodRuns" ADD CONSTRAINT "IncentivePeriodRuns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePayoutLines" ADD CONSTRAINT "IncentivePayoutLines_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IncentivePeriodRuns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
