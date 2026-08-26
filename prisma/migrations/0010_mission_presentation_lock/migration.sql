CREATE TYPE "MissionPresentationState" AS ENUM ('MISSION_ACTIVE', 'CANDIDAT_ANONYME', 'CONDITION_FINANCIERE_EN_ATTENTE', 'PAIEMENT_OU_CONDITION_CONFIRME', 'IDENTITE_DEBLOQUEE', 'MISSION_TERMINEE');

CREATE TYPE "FinancialConditionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED');

ALTER TABLE "Job"
  ADD COLUMN "missionType" TEXT,
  ADD COLUMN "financialCondition" JSONB,
  ADD COLUMN "financialConditionStatus" "FinancialConditionStatus" NOT NULL DEFAULT 'PENDING';

CREATE TABLE "MissionPresentation" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "state" "MissionPresentationState" NOT NULL DEFAULT 'MISSION_ACTIVE',
  "financialConditionStatus" "FinancialConditionStatus" NOT NULL DEFAULT 'PENDING',
  "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conditionConfirmedAt" TIMESTAMP(3),
  "unlockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "securityDetails" JSONB,
  CONSTRAINT "MissionPresentation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionPresentation_applicationId_companyId_key" ON "MissionPresentation"("applicationId", "companyId");
CREATE INDEX "MissionPresentation_missionId_companyId_state_idx" ON "MissionPresentation"("missionId", "companyId", "state");
CREATE INDEX "MissionPresentation_candidateId_companyId_idx" ON "MissionPresentation"("candidateId", "companyId");

ALTER TABLE "MissionPresentation"
  ADD CONSTRAINT "MissionPresentation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MissionPresentation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MissionPresentation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MissionPresentation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
