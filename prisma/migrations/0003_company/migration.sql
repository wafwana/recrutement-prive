-- CreateEnum
CREATE TYPE "CompanyMemberRole" AS ENUM ('OWNER', 'RECRUITER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'INTERVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CompanyMemberRole" NOT NULL DEFAULT 'RECRUITER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruitmentHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitmentHistory_pkey" PRIMARY KEY ("id")
);

-- Convert existing string statuses to enums
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatus" USING (
  CASE UPPER("status")
    WHEN 'OPEN' THEN 'OPEN'::"JobStatus"
    WHEN 'PAUSED' THEN 'PAUSED'::"JobStatus"
    WHEN 'CLOSED' THEN 'CLOSED'::"JobStatus"
    WHEN 'ARCHIVED' THEN 'ARCHIVED'::"JobStatus"
    ELSE 'DRAFT'::"JobStatus"
  END
);
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "Application" ALTER COLUMN "status" TYPE "ApplicationStatus" USING (
  CASE UPPER("status")
    WHEN 'REVIEWING' THEN 'REVIEWING'::"ApplicationStatus"
    WHEN 'INTERVIEW' THEN 'INTERVIEW'::"ApplicationStatus"
    WHEN 'SHORTLISTED' THEN 'SHORTLISTED'::"ApplicationStatus"
    WHEN 'REJECTED' THEN 'REJECTED'::"ApplicationStatus"
    WHEN 'HIRED' THEN 'HIRED'::"ApplicationStatus"
    ELSE 'SUBMITTED'::"ApplicationStatus"
  END
);
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- Indexes
CREATE UNIQUE INDEX "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");
CREATE INDEX "CompanyMember_userId_idx" ON "CompanyMember"("userId");
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");
CREATE INDEX "RecruitmentHistory_applicationId_createdAt_idx" ON "RecruitmentHistory"("applicationId", "createdAt");
CREATE INDEX "RecruitmentHistory_jobId_createdAt_idx" ON "RecruitmentHistory"("jobId", "createdAt");

-- Foreign keys
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentHistory" ADD CONSTRAINT "RecruitmentHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentHistory" ADD CONSTRAINT "RecruitmentHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentHistory" ADD CONSTRAINT "RecruitmentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
