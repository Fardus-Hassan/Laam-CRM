-- Drop leftover global unique index on leadNumber (constraint drop did not remove it)
DROP INDEX IF EXISTS "Lead_leadNumber_key";
