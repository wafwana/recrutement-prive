-- CreateTable
CREATE TABLE IF NOT EXISTS "TelephonyConfig" (
    "id" TEXT NOT NULL,
    "centralPhoneNumber" TEXT NOT NULL DEFAULT '',
    "ownerPhone" TEXT NOT NULL DEFAULT '',
    "secondaryPhone" TEXT,
    "ringMode" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "transferDelaySeconds" INTEGER NOT NULL DEFAULT 15,
    "businessHours" JSONB,
    "offHoursBehavior" TEXT NOT NULL DEFAULT 'VOICEMAIL',
    "customIvrGreeting" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelephonyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelephonyPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canMakeOutboundCalls" BOOLEAN NOT NULL DEFAULT false,
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelephonyPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CallLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "callerNumber" TEXT NOT NULL,
    "callerName" TEXT,
    "callerType" TEXT,
    "ivrChoice" TEXT,
    "destinationPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MISSED',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "linkedEntityId" TEXT,
    "linkedEntityType" TEXT,
    "initiatorUserId" TEXT,
    "notes" TEXT,
    "treatmentState" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VoicemailMessage" (
    "id" TEXT NOT NULL,
    "callLogId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "audioData" BYTEA,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "transcription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoicemailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelephonyPermission_userId_key" ON "TelephonyPermission"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CallLog_direction_createdAt_idx" ON "CallLog"("direction", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CallLog_callerNumber_idx" ON "CallLog"("callerNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CallLog_treatmentState_idx" ON "CallLog"("treatmentState");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VoicemailMessage_callLogId_key" ON "VoicemailMessage"("callLogId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoicemailMessage_status_createdAt_idx" ON "VoicemailMessage"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TelephonyPermission" DROP CONSTRAINT IF EXISTS "TelephonyPermission_userId_fkey";
ALTER TABLE "TelephonyPermission" ADD CONSTRAINT "TelephonyPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT IF EXISTS "CallLog_initiatorUserId_fkey";
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_initiatorUserId_fkey" FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoicemailMessage" DROP CONSTRAINT IF EXISTS "VoicemailMessage_callLogId_fkey";
ALTER TABLE "VoicemailMessage" ADD CONSTRAINT "VoicemailMessage_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
