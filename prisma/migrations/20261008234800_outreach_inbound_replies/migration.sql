ALTER TABLE "OutreachContact"
  ADD COLUMN "replyFromEmail" TEXT,
  ADD COLUMN "replySubject" TEXT,
  ADD COLUMN "replyBody" TEXT,
  ADD COLUMN "replyProviderMessageId" TEXT,
  ADD COLUMN "replyReceivedAt" TIMESTAMP(3);

CREATE INDEX "OutreachContact_replyReceivedAt_idx" ON "OutreachContact"("replyReceivedAt");