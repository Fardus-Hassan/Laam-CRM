-- CreateTable
CREATE TABLE "IncentiveTeams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveTeams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivePlans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "metricConfig" JSONB,
    "periodType" TEXT NOT NULL DEFAULT 'monthly',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prorataAboveTop" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentivePlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveSlabs" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT,
    "dailyTarget" DOUBLE PRECISION,
    "monthlyTarget" DOUBLE PRECISION NOT NULL,
    "incentiveBdt" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IncentiveSlabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveAssignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "userId" TEXT,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveAssignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveOrgSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "salaryTemplate" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveOrgSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncentiveTeams_organizationId_isActive_idx" ON "IncentiveTeams"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveTeams_organizationId_slug_key" ON "IncentiveTeams"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "IncentivePlans_organizationId_isActive_idx" ON "IncentivePlans"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "IncentivePlans_organizationId_teamId_idx" ON "IncentivePlans"("organizationId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePlans_organizationId_slug_key" ON "IncentivePlans"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "IncentiveSlabs_planId_sortOrder_idx" ON "IncentiveSlabs"("planId", "sortOrder");

-- CreateIndex
CREATE INDEX "IncentiveAssignments_organizationId_agentName_idx" ON "IncentiveAssignments"("organizationId", "agentName");

-- CreateIndex
CREATE INDEX "IncentiveAssignments_organizationId_planId_idx" ON "IncentiveAssignments"("organizationId", "planId");

-- CreateIndex
CREATE INDEX "IncentiveAssignments_organizationId_isActive_idx" ON "IncentiveAssignments"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveOrgSettings_organizationId_key" ON "IncentiveOrgSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "IncentiveTeams" ADD CONSTRAINT "IncentiveTeams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePlans" ADD CONSTRAINT "IncentivePlans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentivePlans" ADD CONSTRAINT "IncentivePlans_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "IncentiveTeams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveSlabs" ADD CONSTRAINT "IncentiveSlabs_planId_fkey" FOREIGN KEY ("planId") REFERENCES "IncentivePlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveAssignments" ADD CONSTRAINT "IncentiveAssignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveAssignments" ADD CONSTRAINT "IncentiveAssignments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "IncentivePlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveOrgSettings" ADD CONSTRAINT "IncentiveOrgSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
