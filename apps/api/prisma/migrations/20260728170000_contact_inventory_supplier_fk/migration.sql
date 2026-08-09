-- Link CRM contacts to inventory purchase suppliers
CREATE INDEX IF NOT EXISTS "Contact_organizationId_inventorySupplierId_idx"
  ON "Contact"("organizationId", "inventorySupplierId");

DO $$ BEGIN
  ALTER TABLE "Contact"
    ADD CONSTRAINT "Contact_inventorySupplierId_fkey"
    FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
