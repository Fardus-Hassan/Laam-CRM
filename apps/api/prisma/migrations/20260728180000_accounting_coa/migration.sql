-- Org chart of accounts + journal category/paymentMethod for Accounting module

CREATE TABLE IF NOT EXISTS "AccountingAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "cashKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingAccount_organizationId_code_key"
  ON "AccountingAccount"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "AccountingAccount_organizationId_type_idx"
  ON "AccountingAccount"("organizationId", "type");
CREATE INDEX IF NOT EXISTS "AccountingAccount_organizationId_isActive_idx"
  ON "AccountingAccount"("organizationId", "isActive");

DO $$ BEGIN
  ALTER TABLE "AccountingAccount"
    ADD CONSTRAINT "AccountingAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AccountingJournalEntry" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "AccountingJournalEntry" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
CREATE INDEX IF NOT EXISTS "AccountingJournalEntry_organizationId_category_idx"
  ON "AccountingJournalEntry"("organizationId", "category");
