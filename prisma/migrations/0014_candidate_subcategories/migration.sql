-- AlterTable CandidateProfile
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "subCategoryIds" JSONB;
