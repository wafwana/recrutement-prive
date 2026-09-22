ALTER TABLE "CandidateDocument"
  ADD COLUMN "docType" TEXT NOT NULL DEFAULT 'AUTRE',
  ADD COLUMN "folderPath" TEXT NOT NULL DEFAULT 'CANDIDATS/A_CLASSER',
  ADD COLUMN "analysis" JSONB,
  ADD COLUMN "analyzedAt" TIMESTAMP(3),
  ADD COLUMN "isPrimaryCv" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "CandidateDocument_candidateId_docType_idx" ON "CandidateDocument"("candidateId", "docType");
CREATE INDEX "CandidateDocument_folderPath_idx" ON "CandidateDocument"("folderPath");
