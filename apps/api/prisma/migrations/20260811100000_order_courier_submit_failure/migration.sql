-- Order: persist last courier book/submit failure for list-row highlights.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierSubmitError" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierSubmitFailedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_organizationId_courierSubmitFailedAt_idx"
  ON "Order"("organizationId", "courierSubmitFailedAt");
