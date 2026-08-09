-- Manual Campaign registry (name + budget; Meta later)

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "platform" TEXT NOT NULL DEFAULT 'facebook',
    "budgetBdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "notes" TEXT,
    "landingPageName" TEXT,
    "landingPageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_organizationId_name_key" ON "Campaign"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Campaign_organizationId_platform_idx" ON "Campaign"("organizationId", "platform");
CREATE INDEX IF NOT EXISTS "Campaign_organizationId_startDate_idx" ON "Campaign"("organizationId", "startDate");

DO $$ BEGIN
  ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
