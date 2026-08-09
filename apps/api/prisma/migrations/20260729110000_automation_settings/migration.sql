-- Org follow-up reminder automation settings

CREATE TABLE IF NOT EXISTS "AutomationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoFollowupOnStatusChange" BOOLEAN NOT NULL DEFAULT false,
    "statusFollowupMap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationSettings_organizationId_key" ON "AutomationSettings"("organizationId");

DO $$ BEGIN
  ALTER TABLE "AutomationSettings"
    ADD CONSTRAINT "AutomationSettings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
