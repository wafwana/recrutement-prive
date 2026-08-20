-- Add international contact fields while keeping existing data nullable
ALTER TABLE "CandidateProfile" ADD COLUMN "country" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN "phonePrefix" TEXT;
ALTER TABLE "Company" ADD COLUMN "country" TEXT;
ALTER TABLE "Company" ADD COLUMN "phonePrefix" TEXT;
ALTER TABLE "Company" ADD COLUMN "phone" TEXT;
