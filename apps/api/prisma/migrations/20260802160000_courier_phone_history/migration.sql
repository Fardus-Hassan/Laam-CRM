-- Cache for phone-based courier network history (Pathao / Carrybee).
CREATE TABLE IF NOT EXISTS "CourierPhoneHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "aggregateJson" JSONB NOT NULL,
    "providersJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierPhoneHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourierPhoneHistory_organizationId_phoneNormalized_key"
  ON "CourierPhoneHistory"("organizationId", "phoneNormalized");

CREATE INDEX IF NOT EXISTS "CourierPhoneHistory_organizationId_expiresAt_idx"
  ON "CourierPhoneHistory"("organizationId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourierPhoneHistory_organizationId_fkey'
  ) THEN
    ALTER TABLE "CourierPhoneHistory"
      ADD CONSTRAINT "CourierPhoneHistory_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
