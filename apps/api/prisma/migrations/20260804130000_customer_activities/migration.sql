-- Persist customer note / timeline events (mirrors Followup.activities).
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "activities" JSONB NOT NULL DEFAULT '[]';
