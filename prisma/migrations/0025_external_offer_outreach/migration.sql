ALTER TABLE "EnterpriseSourcedOffer"
  ADD COLUMN "outreachRecipient" TEXT,
  ADD COLUMN "outreachSubject" TEXT,
  ADD COLUMN "outreachBody" TEXT,
  ADD COLUMN "outreachStatus" TEXT NOT NULL DEFAULT 'NOT_PREPARED',
  ADD COLUMN "outreachSentAt" TIMESTAMP(3),
  ADD COLUMN "outreachMessageId" TEXT;
