CREATE TABLE "CollaboratorActivitySession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "lastPath" TEXT,
  "ipAddress" TEXT,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "userAgent" TEXT,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CollaboratorActivitySession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaboratorActivitySession_sessionKey_key" ON "CollaboratorActivitySession"("sessionKey");
CREATE INDEX "CollaboratorActivitySession_userId_lastSeenAt_idx" ON "CollaboratorActivitySession"("userId","lastSeenAt");
CREATE INDEX "CollaboratorActivitySession_role_lastSeenAt_idx" ON "CollaboratorActivitySession"("role","lastSeenAt");
CREATE INDEX "CollaboratorActivitySession_startedAt_idx" ON "CollaboratorActivitySession"("startedAt");

ALTER TABLE "CollaboratorActivitySession"
  ADD CONSTRAINT "CollaboratorActivitySession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
