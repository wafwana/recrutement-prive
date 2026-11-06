-- Explicit authorization gate for CV intake before sourcing/matching use.
ALTER TABLE "CvIntake"
  ADD COLUMN "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "consentEvidence" TEXT,
  ADD COLUMN "consentVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "consentVerifiedByUserId" TEXT;

CREATE INDEX "CvIntake_consentStatus_status_createdAt_idx"
  ON "CvIntake"("consentStatus", "status", "createdAt");