-- Manual marketing spend, monthly performance targets, login audit

CREATE TABLE IF NOT EXISTS "MarketingSpend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "spendBdt" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingSpend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingSpend_organizationId_monthKey_campaignName_key"
  ON "MarketingSpend"("organizationId", "monthKey", "campaignName");
CREATE INDEX IF NOT EXISTS "MarketingSpend_organizationId_monthKey_idx"
  ON "MarketingSpend"("organizationId", "monthKey");

DO $$ BEGIN
  ALTER TABLE "MarketingSpend"
    ADD CONSTRAINT "MarketingSpend_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PerformanceTarget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "subjectLabel" TEXT NOT NULL,
    "targetOrders" INTEGER NOT NULL DEFAULT 0,
    "targetRevenueBdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceTarget_organizationId_monthKey_scope_subjectKey_key"
  ON "PerformanceTarget"("organizationId", "monthKey", "scope", "subjectKey");
CREATE INDEX IF NOT EXISTS "PerformanceTarget_organizationId_monthKey_idx"
  ON "PerformanceTarget"("organizationId", "monthKey");
CREATE INDEX IF NOT EXISTS "PerformanceTarget_organizationId_scope_idx"
  ON "PerformanceTarget"("organizationId", "scope");

DO $$ BEGIN
  ALTER TABLE "PerformanceTarget"
    ADD CONSTRAINT "PerformanceTarget_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LoginAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT 'unknown',
    "device" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginAudit_organizationId_loggedInAt_idx"
  ON "LoginAudit"("organizationId", "loggedInAt");
CREATE INDEX IF NOT EXISTS "LoginAudit_email_loggedInAt_idx"
  ON "LoginAudit"("email", "loggedInAt");
CREATE INDEX IF NOT EXISTS "LoginAudit_userId_loggedInAt_idx"
  ON "LoginAudit"("userId", "loggedInAt");

DO $$ BEGIN
  ALTER TABLE "LoginAudit"
    ADD CONSTRAINT "LoginAudit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoginAudit"
    ADD CONSTRAINT "LoginAudit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
