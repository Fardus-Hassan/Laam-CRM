-- SMS gateway + templates + audit log (per organization)
CREATE TABLE IF NOT EXISTS "SmsIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsEnc" TEXT,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmsIntegration_organizationId_key" ON "SmsIntegration"("organizationId");
CREATE INDEX IF NOT EXISTS "SmsIntegration_organizationId_enabled_idx" ON "SmsIntegration"("organizationId", "enabled");

ALTER TABLE "SmsIntegration"
  DROP CONSTRAINT IF EXISTS "SmsIntegration_organizationId_fkey";
ALTER TABLE "SmsIntegration"
  ADD CONSTRAINT "SmsIntegration_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SmsTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmsTemplate_organizationId_slug_key" ON "SmsTemplate"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "SmsTemplate_organizationId_sortOrder_idx" ON "SmsTemplate"("organizationId", "sortOrder");

ALTER TABLE "SmsTemplate"
  DROP CONSTRAINT IF EXISTS "SmsTemplate_organizationId_fkey";
ALTER TABLE "SmsTemplate"
  ADD CONSTRAINT "SmsTemplate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SmsLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT,
    "toPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerRef" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SmsLog_organizationId_createdAt_idx" ON "SmsLog"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SmsLog_organizationId_orderId_idx" ON "SmsLog"("organizationId", "orderId");

ALTER TABLE "SmsLog"
  DROP CONSTRAINT IF EXISTS "SmsLog_organizationId_fkey";
ALTER TABLE "SmsLog"
  ADD CONSTRAINT "SmsLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
