-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'REJECTED');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN "photoMimeType" TEXT, ADD COLUMN "photoData" BYTEA;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "logoMimeType" TEXT, ADD COLUMN "logoData" BYTEA;

-- CreateTable
CREATE TABLE "FinancialPayoutRequest" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryEmail" TEXT NOT NULL,
    "beneficiaryIban" TEXT,
    "reason" TEXT NOT NULL,
    "jobId" TEXT,
    "invoiceRef" TEXT,
    "amountHt" DOUBLE PRECISION NOT NULL,
    "amountTva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountTtc" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "decisionAt" TIMESTAMP(3),
    "decisionByUserId" TEXT,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPayoutRequest_idempotencyKey_key" ON "FinancialPayoutRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialPayoutRequest_status_createdAt_idx" ON "FinancialPayoutRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialPayoutRequest_beneficiaryEmail_idx" ON "FinancialPayoutRequest"("beneficiaryEmail");
