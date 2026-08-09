-- Coupons + order attachment URLs + stock deduction marker

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrderBdt" DOUBLE PRECISION,
    "maxDiscountBdt" DOUBLE PRECISION,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_organizationId_code_key" ON "Coupon"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_isActive_idx" ON "Coupon"("organizationId", "isActive");

ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_organizationId_fkey";
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockDeductedAt" TIMESTAMP(3);
