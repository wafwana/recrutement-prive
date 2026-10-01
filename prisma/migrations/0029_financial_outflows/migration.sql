-- CreateTable
CREATE TABLE "FinancialOutflow" (
    "id" TEXT NOT NULL,
    "outflowNumber" TEXT NOT NULL,
    "operationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentDate" TIMESTAMP(3),
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryEmail" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "originModule" TEXT NOT NULL DEFAULT 'AUTRE',
    "amountHt" DOUBLE PRECISION NOT NULL,
    "amountTva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountTtc" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentMethod" TEXT,
    "paymentSource" TEXT,
    "referenceNumber" TEXT,
    "documentUrl" TEXT,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "authorizedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A_COMPLETER',
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'NON_RAPPROCHE',
    "isPrivateOwnerExpense" BOOLEAN NOT NULL DEFAULT false,
    "payoutRequestId" TEXT,
    "auditHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialOutflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialOutflow_outflowNumber_key" ON "FinancialOutflow"("outflowNumber");
CREATE UNIQUE INDEX "FinancialOutflow_payoutRequestId_key" ON "FinancialOutflow"("payoutRequestId");
CREATE INDEX "FinancialOutflow_status_createdAt_idx" ON "FinancialOutflow"("status", "createdAt");
CREATE INDEX "FinancialOutflow_category_idx" ON "FinancialOutflow"("category");
CREATE INDEX "FinancialOutflow_originModule_idx" ON "FinancialOutflow"("originModule");
CREATE INDEX "FinancialOutflow_beneficiaryName_idx" ON "FinancialOutflow"("beneficiaryName");
CREATE INDEX "FinancialOutflow_operationDate_idx" ON "FinancialOutflow"("operationDate");
