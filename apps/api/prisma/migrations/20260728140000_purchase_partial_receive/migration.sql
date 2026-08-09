-- Partial purchase receive: track qty already booked into stock per line.
ALTER TABLE "InventoryPurchaseLine" ADD COLUMN IF NOT EXISTS "receivedQuantity" INTEGER NOT NULL DEFAULT 0;
