-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'EXCLUDED', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentArchiveStatus" AS ENUM ('A_VERIFIER', 'VERIFIE', 'RECLASSE', 'ANOMALIE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "ArchivedDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "fileData" BYTEA,
    "size" INTEGER,
    "senderUserId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "categoryPath" TEXT NOT NULL,
    "status" "DocumentArchiveStatus" NOT NULL DEFAULT 'A_VERIFIER',
    "docType" TEXT,
    "companyId" TEXT,
    "candidateId" TEXT,
    "jobId" TEXT,
    "amountHt" DOUBLE PRECISION,
    "amountTva" DOUBLE PRECISION,
    "amountTtc" DOUBLE PRECISION,
    "year" INTEGER,
    "month" INTEGER,
    "quarter" INTEGER,
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "documentId" TEXT,
    "senderName" TEXT,
    "senderRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "quarter" INTEGER,
    "periodType" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" TEXT,
    "summaryData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchivedDocument_categoryPath_idx" ON "ArchivedDocument"("categoryPath");

-- CreateIndex
CREATE INDEX "ArchivedDocument_senderUserId_idx" ON "ArchivedDocument"("senderUserId");

-- CreateIndex
CREATE INDEX "ArchivedDocument_companyId_idx" ON "ArchivedDocument"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedDocument_candidateId_idx" ON "ArchivedDocument"("candidateId");

-- CreateIndex
CREATE INDEX "ArchivedDocument_year_month_idx" ON "ArchivedDocument"("year", "month");

-- CreateIndex
CREATE INDEX "ArchivedDocument_year_quarter_idx" ON "ArchivedDocument"("year", "quarter");

-- CreateIndex
CREATE INDEX "OwnerNotification_status_createdAt_idx" ON "OwnerNotification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AccountingPeriod_year_quarter_periodType_idx" ON "AccountingPeriod"("year", "quarter", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_year_month_periodType_key" ON "AccountingPeriod"("year", "month", "periodType");
