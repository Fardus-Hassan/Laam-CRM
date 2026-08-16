-- Soft-delete restock flag so restore can re-hold inventory.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockRestockedOnDelete" BOOLEAN NOT NULL DEFAULT false;
