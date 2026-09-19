CREATE TABLE "ExternalJobOpportunity" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "title" TEXT NOT NULL,
  "companyName" TEXT,
  "country" TEXT,
  "city" TEXT,
  "categoryCode" TEXT,
  "subCategoryCode" TEXT,
  "skills" JSONB,
  "experienceYears" INTEGER,
  "language" TEXT,
  "salary" TEXT,
  "publishedAt" TIMESTAMP(3),
  "closingAt" TIMESTAMP(3),
  "description" TEXT,
  "rawData" JSONB,
  "status" TEXT NOT NULL DEFAULT 'DETECTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExternalJobOpportunity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExternalJobOpportunity_source_externalId_key" ON "ExternalJobOpportunity"("source", "externalId");
CREATE INDEX "ExternalJobOpportunity_status_createdAt_idx" ON "ExternalJobOpportunity"("status", "createdAt");
CREATE INDEX "ExternalJobOpportunity_source_idx" ON "ExternalJobOpportunity"("source");
