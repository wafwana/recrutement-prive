CREATE TABLE "OfferSourcingSearch" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "country" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceSummary" JSONB,
  "resultIds" JSONB,
  "lastError" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfferSourcingSearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfferSourcingSearch_createdByUserId_createdAt_idx"
  ON "OfferSourcingSearch"("createdByUserId", "createdAt");
CREATE INDEX "OfferSourcingSearch_status_createdAt_idx"
  ON "OfferSourcingSearch"("status", "createdAt");

ALTER TABLE "OfferSourcingSearch"
  ADD CONSTRAINT "OfferSourcingSearch_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
