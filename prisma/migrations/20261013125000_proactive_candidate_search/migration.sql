-- Persist proactive candidate searches separately from job-linked sourcing.
CREATE TABLE "ProactiveSearch" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sectorCode" TEXT NOT NULL,
  "professionCode" TEXT,
  "query" TEXT,
  "country" TEXT,
  "skills" JSONB,
  "criteria" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdByUserId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "sourceSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProactiveSearch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProactiveSearch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProactiveSearchResult" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "sourcedCandidateId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "primarySectorCode" TEXT,
  "primaryProfessionCode" TEXT,
  "secondaryMatches" JSONB,
  "score" INTEGER,
  "confidence" TEXT NOT NULL DEFAULT 'LOW',
  "rationale" TEXT,
  "cvStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
  "status" TEXT NOT NULL DEFAULT 'DETECTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProactiveSearchResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProactiveSearchResult_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "ProactiveSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProactiveSearchResult_sourcedCandidateId_fkey" FOREIGN KEY ("sourcedCandidateId") REFERENCES "SourcedCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProactiveSearchResult_searchId_sourcedCandidateId_key" ON "ProactiveSearchResult"("searchId", "sourcedCandidateId");
CREATE INDEX "ProactiveSearch_status_createdAt_idx" ON "ProactiveSearch"("status", "createdAt");
CREATE INDEX "ProactiveSearch_sectorCode_professionCode_createdAt_idx" ON "ProactiveSearch"("sectorCode", "professionCode", "createdAt");
CREATE INDEX "ProactiveSearch_createdByUserId_createdAt_idx" ON "ProactiveSearch"("createdByUserId", "createdAt");
CREATE INDEX "ProactiveSearchResult_sourcedCandidateId_idx" ON "ProactiveSearchResult"("sourcedCandidateId");
CREATE INDEX "ProactiveSearchResult_searchId_status_idx" ON "ProactiveSearchResult"("searchId", "status");
