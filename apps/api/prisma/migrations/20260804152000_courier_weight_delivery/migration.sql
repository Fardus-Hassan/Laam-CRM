-- Variant shipping weight (kg) + order-level courier package overrides.
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierWeightKg" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierDeliveryType" TEXT;
