-- Pôle 2 CRM — extension additive des fondations existantes.
-- Ne supprime et ne recrée aucune table Pôle 1 ou Pôle 2.
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "leadSource" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "projectNeed" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "projectSize" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "projectMaturity" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "urgency" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "nextActionAt" TIMESTAMP(3);
ALTER TABLE "TechProspect" ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);
ALTER TABLE "TechRequirementDoc" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "TechRequirementDoc" ADD COLUMN IF NOT EXISTS "fileSha256" TEXT;
ALTER TABLE "TechRequirementDoc" ADD COLUMN IF NOT EXISTS "fileData" BYTEA;
ALTER TABLE "TechRequirementDoc" ADD COLUMN IF NOT EXISTS "extractedText" TEXT;
ALTER TABLE "TechProject" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "TechProject" ADD COLUMN IF NOT EXISTS "budgetPlanned" DOUBLE PRECISION;
ALTER TABLE "TechProject" ADD COLUMN IF NOT EXISTS "budgetPlannedCertainty" TEXT NOT NULL DEFAULT 'INCONNU';
ALTER TABLE "TechProject" ADD COLUMN IF NOT EXISTS "budgetActual" DOUBLE PRECISION;
UPDATE "TechProject" SET "reference" = 'TECH-' || upper(substr(md5("id"), 1, 10)) WHERE "reference" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "TechProject_reference_key" ON "TechProject"("reference");
CREATE INDEX IF NOT EXISTS "TechProspect_nextActionAt_idx" ON "TechProspect"("nextActionAt");

CREATE TABLE IF NOT EXISTS "TechProspectEvent" (
  "id" TEXT NOT NULL, "eventType" TEXT NOT NULL, "fromValue" TEXT, "toValue" TEXT, "note" TEXT,
  "actorUserId" TEXT NOT NULL, "actorRole" TEXT NOT NULL, "techProspectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechProspectEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechProspectEvent_techProspectId_fkey" FOREIGN KEY ("techProspectId") REFERENCES "TechProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TechProspectEvent_techProspectId_createdAt_idx" ON "TechProspectEvent"("techProspectId","createdAt");
CREATE INDEX IF NOT EXISTS "TechProspectEvent_actorUserId_createdAt_idx" ON "TechProspectEvent"("actorUserId","createdAt");

CREATE TABLE IF NOT EXISTS "TechProposal" (
  "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "title" TEXT NOT NULL, "problem" TEXT, "solution" TEXT,
  "deliverables" JSONB, "milestones" JSONB, "assumptions" JSONB, "conditions" TEXT, "maintenance" TEXT,
  "options" JSONB, "estimate" JSONB, "currency" TEXT NOT NULL DEFAULT 'EUR', "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3), "approvedByUserId" TEXT, "decisionNote" TEXT, "techProspectId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechProposal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechProposal_techProspectId_fkey" FOREIGN KEY ("techProspectId") REFERENCES "TechProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TechProposal_reference_key" ON "TechProposal"("reference");
CREATE INDEX IF NOT EXISTS "TechProposal_techProspectId_status_idx" ON "TechProposal"("techProspectId","status");
CREATE INDEX IF NOT EXISTS "TechProposal_createdAt_idx" ON "TechProposal"("createdAt");

ALTER TABLE "TechProject" ADD COLUMN IF NOT EXISTS "proposalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "TechProject_proposalId_key" ON "TechProject"("proposalId");
ALTER TABLE "TechProject" DROP CONSTRAINT IF EXISTS "TechProject_proposalId_fkey";
ALTER TABLE "TechProject" ADD CONSTRAINT "TechProject_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TechProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TechProjectEvent" (
  "id" TEXT NOT NULL, "eventType" TEXT NOT NULL, "fromValue" TEXT, "toValue" TEXT, "note" TEXT,
  "actorUserId" TEXT NOT NULL, "actorRole" TEXT NOT NULL, "techProjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TechProjectEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechProjectEvent_techProjectId_fkey" FOREIGN KEY ("techProjectId") REFERENCES "TechProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TechProjectEvent_techProjectId_createdAt_idx" ON "TechProjectEvent"("techProjectId","createdAt");
CREATE INDEX IF NOT EXISTS "TechProjectEvent_actorUserId_createdAt_idx" ON "TechProjectEvent"("actorUserId","createdAt");

CREATE TABLE IF NOT EXISTS "TechProjectMilestone" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'A_FAIRE', "techProjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechProjectMilestone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechProjectMilestone_techProjectId_fkey" FOREIGN KEY ("techProjectId") REFERENCES "TechProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TechProjectMilestone_techProjectId_dueAt_idx" ON "TechProjectMilestone"("techProjectId","dueAt");

CREATE TABLE IF NOT EXISTS "TechProjectTask" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "assigneeUserId" TEXT, "dueAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'A_FAIRE', "techProjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TechProjectTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TechProjectTask_techProjectId_fkey" FOREIGN KEY ("techProjectId") REFERENCES "TechProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TechProjectTask_techProjectId_status_idx" ON "TechProjectTask"("techProjectId","status");
CREATE INDEX IF NOT EXISTS "TechProjectTask_assigneeUserId_idx" ON "TechProjectTask"("assigneeUserId");
