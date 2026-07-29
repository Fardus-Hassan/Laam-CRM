-- Tenant SaaS billing (record only)

CREATE TABLE IF NOT EXISTS "OrgBillingSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "currentPeriodStart" DATE NOT NULL,
    "currentPeriodEnd" DATE NOT NULL,
    "nextBillingDate" DATE NOT NULL,
    "amountBdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "smsCredits" INTEGER NOT NULL DEFAULT 2000,
    "smsCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "orderQuota" INTEGER NOT NULL DEFAULT 3000,
    "userSeats" INTEGER NOT NULL DEFAULT 5,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgBillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgBillingSubscription_organizationId_key" ON "OrgBillingSubscription"("organizationId");

DO $$ BEGIN
  ALTER TABLE "OrgBillingSubscription"
    ADD CONSTRAINT "OrgBillingSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BillingInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountBdt" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "plan" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_organizationId_number_key" ON "BillingInvoice"("organizationId", "number");
CREATE INDEX IF NOT EXISTS "BillingInvoice_organizationId_status_idx" ON "BillingInvoice"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "BillingInvoice_organizationId_date_idx" ON "BillingInvoice"("organizationId", "date");

DO $$ BEGIN
  ALTER TABLE "BillingInvoice"
    ADD CONSTRAINT "BillingInvoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BillingPaymentMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lastFour" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_organizationId_idx" ON "BillingPaymentMethod"("organizationId");

DO $$ BEGIN
  ALTER TABLE "BillingPaymentMethod"
    ADD CONSTRAINT "BillingPaymentMethod_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
