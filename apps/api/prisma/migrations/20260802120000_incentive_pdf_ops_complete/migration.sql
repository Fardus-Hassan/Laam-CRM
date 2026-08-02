-- AlterTable
ALTER TABLE "IncentiveAssignments" ADD COLUMN "hrStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "IncentiveAssignments" ADD COLUMN "consecutiveMissMonths" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IncentivePeriodRuns" ADD COLUMN "totalSpecialBonusBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IncentivePeriodRuns" ADD COLUMN "totalAttendanceBonusBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IncentivePeriodRuns" ADD COLUMN "totalPayBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IncentivePayoutLines" ADD COLUMN "specialBonusBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IncentivePayoutLines" ADD COLUMN "attendanceBonusBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IncentivePayoutLines" ADD COLUMN "totalPayBdt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IncentivePayoutLines" ADD COLUMN "hrStatus" TEXT;

-- CreateIndex
CREATE INDEX "IncentiveAssignments_organizationId_hrStatus_idx" ON "IncentiveAssignments"("organizationId", "hrStatus");

-- CreateTable
CREATE TABLE "IncentiveAttendances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "userId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "presentDays" DOUBLE PRECISION NOT NULL,
    "workingDays" DOUBLE PRECISION NOT NULL,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveCount" INTEGER NOT NULL DEFAULT 0,
    "unapprovedAbsence" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveAttendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveSurveyLogs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "agentName" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "surveyCount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveSurveyLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveChannelLogs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "agentName" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "activityCount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveChannelLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveSpecialBonuses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "amountBdt" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncentiveSpecialBonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveAttendances_organizationId_agentName_yearMonth_key" ON "IncentiveAttendances"("organizationId", "agentName", "yearMonth");
CREATE INDEX "IncentiveAttendances_organizationId_yearMonth_idx" ON "IncentiveAttendances"("organizationId", "yearMonth");

CREATE UNIQUE INDEX "IncentiveSurveyLogs_organizationId_agentName_yearMonth_key" ON "IncentiveSurveyLogs"("organizationId", "agentName", "yearMonth");
CREATE INDEX "IncentiveSurveyLogs_organizationId_yearMonth_idx" ON "IncentiveSurveyLogs"("organizationId", "yearMonth");

CREATE UNIQUE INDEX "IncentiveChannelLogs_organizationId_agentName_yearMonth_channel_key" ON "IncentiveChannelLogs"("organizationId", "agentName", "yearMonth", "channel");
CREATE INDEX "IncentiveChannelLogs_organizationId_yearMonth_idx" ON "IncentiveChannelLogs"("organizationId", "yearMonth");

CREATE INDEX "IncentiveSpecialBonuses_organizationId_yearMonth_idx" ON "IncentiveSpecialBonuses"("organizationId", "yearMonth");
CREATE INDEX "IncentiveSpecialBonuses_organizationId_agentName_idx" ON "IncentiveSpecialBonuses"("organizationId", "agentName");

-- AddForeignKey
ALTER TABLE "IncentiveAttendances" ADD CONSTRAINT "IncentiveAttendances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncentiveSurveyLogs" ADD CONSTRAINT "IncentiveSurveyLogs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncentiveSurveyLogs" ADD CONSTRAINT "IncentiveSurveyLogs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "IncentiveAssignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncentiveChannelLogs" ADD CONSTRAINT "IncentiveChannelLogs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncentiveChannelLogs" ADD CONSTRAINT "IncentiveChannelLogs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "IncentiveAssignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncentiveSpecialBonuses" ADD CONSTRAINT "IncentiveSpecialBonuses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncentiveSpecialBonuses" ADD CONSTRAINT "IncentiveSpecialBonuses_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "IncentiveAssignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
