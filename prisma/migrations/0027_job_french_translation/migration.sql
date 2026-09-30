-- Additive non-destructive migration: Job French Translation fields
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "ExternalJobOpportunity" ADD COLUMN IF NOT EXISTS "translations" JSONB;
