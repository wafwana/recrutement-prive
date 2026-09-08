-- AlterTable CandidateProfile
ALTER TABLE "CandidateProfile" ADD COLUMN "primaryCategoryId" TEXT;

-- AlterTable Job
ALTER TABLE "Job" ADD COLUMN "jobCategoryId" TEXT,
ADD COLUMN "subCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "CandidateProfile_primaryCategoryId_idx" ON "CandidateProfile"("primaryCategoryId");

-- CreateIndex
CREATE INDEX "Job_jobCategoryId_idx" ON "Job"("jobCategoryId");

-- CreateIndex
CREATE INDEX "Job_subCategoryId_idx" ON "Job"("subCategoryId");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_jobCategoryId_fkey" FOREIGN KEY ("jobCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
