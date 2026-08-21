CREATE TYPE "SourcingStatus" AS ENUM ('DETECTED', 'REVIEWING', 'MATCHED', 'VALIDATED', 'CONTACTED', 'REJECTED');

CREATE TABLE "SourcedCandidate" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceProfileUrl" TEXT,
  "name" TEXT,
  "headline" TEXT,
  "location" TEXT,
  "skills" JSONB,
  "experienceYears" INTEGER,
  "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "status" "SourcingStatus" NOT NULL DEFAULT 'DETECTED',
  "matchingScore" INTEGER,
  "matchingDetails" JSONB,
  "notes" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourcedCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourcedCandidate_status_createdAt_idx" ON "SourcedCandidate"("status", "createdAt");
CREATE INDEX "SourcedCandidate_source_idx" ON "SourcedCandidate"("source");
ALTER TABLE "SourcedCandidate" ADD CONSTRAINT "SourcedCandidate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
