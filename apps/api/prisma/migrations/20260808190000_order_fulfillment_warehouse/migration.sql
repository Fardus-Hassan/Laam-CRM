-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fulfillmentWarehouseId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_fulfillmentWarehouseId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_fulfillmentWarehouseId_fkey"
      FOREIGN KEY ("fulfillmentWarehouseId")
      REFERENCES "Warehouse"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Order_organizationId_fulfillmentWarehouseId_idx"
  ON "Order"("organizationId", "fulfillmentWarehouseId");
