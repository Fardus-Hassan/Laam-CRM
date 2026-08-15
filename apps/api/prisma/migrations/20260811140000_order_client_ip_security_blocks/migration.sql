-- Client IP on orders + security blocklist (IP/mobile)

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientIp" TEXT;

CREATE INDEX IF NOT EXISTS "Order_organizationId_clientIp_idx" ON "Order"("organizationId", "clientIp");

CREATE TABLE IF NOT EXISTS "SecurityBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueDisplay" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "blockedByUserId" TEXT,
    "blockedByName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastOrderId" TEXT,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SecurityBlock_organizationId_type_value_key"
  ON "SecurityBlock"("organizationId", "type", "value");

CREATE INDEX IF NOT EXISTS "SecurityBlock_organizationId_type_idx"
  ON "SecurityBlock"("organizationId", "type");

CREATE INDEX IF NOT EXISTS "SecurityBlock_organizationId_expiresAt_idx"
  ON "SecurityBlock"("organizationId", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SecurityBlock_organizationId_fkey'
  ) THEN
    ALTER TABLE "SecurityBlock"
      ADD CONSTRAINT "SecurityBlock_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
