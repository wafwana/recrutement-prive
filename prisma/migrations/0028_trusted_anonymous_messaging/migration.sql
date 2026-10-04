ALTER TABLE "MissionPresentation"
  ADD COLUMN "anonymousMessagingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "candidateAlias" TEXT,
  ADD COLUMN "companyAlias" TEXT,
  ADD COLUMN "candidateUserId" TEXT,
  ADD COLUMN "companyUserId" TEXT;

ALTER TABLE "Conversation"
  ADD COLUMN "presentationId" TEXT,
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Message"
  ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'ALLOWED',
  ADD COLUMN "moderationReason" TEXT;

CREATE INDEX "Conversation_presentationId_mode_status_idx"
  ON "Conversation" ("presentationId", "mode", "status");

CREATE INDEX "MissionPresentation_candidateUserId_idx"
  ON "MissionPresentation" ("candidateUserId");

CREATE INDEX "MissionPresentation_companyUserId_idx"
  ON "MissionPresentation" ("companyUserId");

ALTER TABLE "MissionPresentation"
  ADD CONSTRAINT "MissionPresentation_candidateUserId_fkey"
  FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MissionPresentation"
  ADD CONSTRAINT "MissionPresentation_companyUserId_fkey"
  FOREIGN KEY ("companyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_presentationId_fkey"
  FOREIGN KEY ("presentationId") REFERENCES "MissionPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;