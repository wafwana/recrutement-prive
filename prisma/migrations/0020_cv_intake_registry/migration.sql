CREATE TABLE "CvIntake" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileData" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "originalSha256" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "candidateName" TEXT,
  "candidateEmail" TEXT,
  "docType" TEXT NOT NULL DEFAULT 'CV',
  "folderPath" TEXT NOT NULL DEFAULT 'CANDIDATS/A_CLASSER/CV',
  "analysis" JSONB,
  "matching" JSONB,
  "analyzedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'A_ANALYSER',
  "candidateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CvIntake_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CvIntake_folderPath_idx" ON "CvIntake"("folderPath");
CREATE INDEX "CvIntake_candidateId_idx" ON "CvIntake"("candidateId");
CREATE INDEX "CvIntake_status_createdAt_idx" ON "CvIntake"("status", "createdAt");
CREATE INDEX "CvIntake_originalSha256_idx" ON "CvIntake"("originalSha256");
ALTER TABLE "CvIntake" ADD CONSTRAINT "CvIntake_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
