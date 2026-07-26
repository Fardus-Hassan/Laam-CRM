-- Carrybee location IDs (city/zone/area) for courier booking
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeCity" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeZone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeArea" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeCityId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeZoneId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrybeeAreaId" INTEGER;
