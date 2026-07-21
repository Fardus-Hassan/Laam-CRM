-- Units of measure for multi-business SaaS inventory

CREATE TABLE IF NOT EXISTS "UnitOfMeasure" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dimension" TEXT NOT NULL DEFAULT 'count',
  "factorToDimensionBase" DECIMAL(18,6) NOT NULL DEFAULT 1,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UnitOfMeasure_organizationId_code_key"
  ON "UnitOfMeasure"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "UnitOfMeasure_organizationId_dimension_idx"
  ON "UnitOfMeasure"("organizationId", "dimension");

ALTER TABLE "UnitOfMeasure"
  DROP CONSTRAINT IF EXISTS "UnitOfMeasure_organizationId_fkey";
ALTER TABLE "UnitOfMeasure"
  ADD CONSTRAINT "UnitOfMeasure_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "VariantUomConversion" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "uomId" TEXT NOT NULL,
  "factorToVariantBase" DECIMAL(18,6) NOT NULL,
  CONSTRAINT "VariantUomConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VariantUomConversion_variantId_uomId_key"
  ON "VariantUomConversion"("variantId", "uomId");
CREATE INDEX IF NOT EXISTS "VariantUomConversion_uomId_idx"
  ON "VariantUomConversion"("uomId");

ALTER TABLE "VariantUomConversion"
  DROP CONSTRAINT IF EXISTS "VariantUomConversion_variantId_fkey";
ALTER TABLE "VariantUomConversion"
  ADD CONSTRAINT "VariantUomConversion_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantUomConversion"
  DROP CONSTRAINT IF EXISTS "VariantUomConversion_uomId_fkey";
ALTER TABLE "VariantUomConversion"
  ADD CONSTRAINT "VariantUomConversion_uomId_fkey"
  FOREIGN KEY ("uomId") REFERENCES "UnitOfMeasure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "baseUomId" TEXT;
CREATE INDEX IF NOT EXISTS "ProductVariant_baseUomId_idx" ON "ProductVariant"("baseUomId");

ALTER TABLE "ProductVariant"
  DROP CONSTRAINT IF EXISTS "ProductVariant_baseUomId_fkey";
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_baseUomId_fkey"
  FOREIGN KEY ("baseUomId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default units per org and assign pcs to existing variants
INSERT INTO "UnitOfMeasure" ("id", "organizationId", "code", "name", "dimension", "factorToDimensionBase", "isSystem", "createdAt")
SELECT gen_random_uuid()::text, o."id", u.code, u.name, u.dimension, u.factor, true, CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (
  VALUES
    ('pcs', 'Pieces', 'count', 1),
    ('box', 'Box', 'count', 1),
    ('dozen', 'Dozen', 'count', 12),
    ('g', 'Gram', 'mass', 1),
    ('kg', 'Kilogram', 'mass', 1000),
    ('mg', 'Milligram', 'mass', 0.001),
    ('ml', 'Millilitre', 'volume', 1),
    ('L', 'Litre', 'volume', 1000),
    ('m', 'Metre', 'length', 1),
    ('cm', 'Centimetre', 'length', 0.01)
) AS u(code, name, dimension, factor)
WHERE NOT EXISTS (
  SELECT 1 FROM "UnitOfMeasure" x
  WHERE x."organizationId" = o."id" AND x."code" = u.code
);

UPDATE "ProductVariant" v
SET "baseUomId" = u."id"
FROM "UnitOfMeasure" u
WHERE v."baseUomId" IS NULL
  AND u."organizationId" = v."organizationId"
  AND u."code" = 'pcs';
