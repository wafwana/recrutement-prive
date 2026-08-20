ALTER TABLE "CandidateProfile" ADD COLUMN "skills" JSONB;
ALTER TABLE "CandidateProfile" ADD COLUMN "experienceYears" INTEGER;
ALTER TABLE "Job" ADD COLUMN "requiredSkills" JSONB;
ALTER TABLE "Job" ADD COLUMN "requiredExperienceYears" INTEGER;
