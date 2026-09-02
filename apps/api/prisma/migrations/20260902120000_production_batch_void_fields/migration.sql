-- ProductionBatch void audit fields (present in schema.prisma, missing from prior migrations).
ALTER TABLE "ProductionBatch" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "ProductionBatch" ADD COLUMN IF NOT EXISTS "voidedByUserId" TEXT;
ALTER TABLE "ProductionBatch" ADD COLUMN IF NOT EXISTS "voidedByName" TEXT;
