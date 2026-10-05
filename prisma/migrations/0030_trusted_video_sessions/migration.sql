-- Trusted controlled video sessions: authorization, expiry and server-side signaling metadata.
CREATE TABLE "VideoSession" (
  "id" TEXT NOT NULL,
  "presentationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "offer" JSONB,
  "answer" JSONB,
  "candidateA" JSONB,
  "candidateB" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoSession_presentationId_status_expiresAt_idx" ON "VideoSession"("presentationId", "status", "expiresAt");
CREATE INDEX "VideoSession_createdByUserId_createdAt_idx" ON "VideoSession"("createdByUserId", "createdAt");
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "MissionPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoSession" ADD CONSTRAINT "VideoSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
