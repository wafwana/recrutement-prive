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
CREATE TABLE "AnonymousDisclosureRequest" (
  "id" TEXT NOT NULL,
  "presentationId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "decidedByUserId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "AnonymousDisclosureRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnonymousDisclosureRequest_presentationId_status_requestedAt_idx"
  ON "AnonymousDisclosureRequest" ("presentationId", "status", "requestedAt");

ALTER TABLE "AnonymousDisclosureRequest"
  ADD CONSTRAINT "AnonymousDisclosureRequest_presentationId_fkey"
  FOREIGN KEY ("presentationId") REFERENCES "MissionPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnonymousDisclosureRequest"
  ADD CONSTRAINT "AnonymousDisclosureRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnonymousDisclosureRequest"
  ADD CONSTRAINT "AnonymousDisclosureRequest_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
