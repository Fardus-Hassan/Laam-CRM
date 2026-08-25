-- Org profile extras for Settings → Organization (email, address, defaults).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "settings" JSONB;
