CREATE TABLE "RecruitmentBillingRule" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "billingType" TEXT NOT NULL DEFAULT 'PERCENTAGE_SALARY',
  "fixedAmountHt" DOUBLE PRECISION,
  "percentage" DOUBLE PRECISION,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paymentTerms" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruitmentBillingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruitmentInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "jobId" TEXT,
  "presentationId" TEXT,
  "billingRuleId" TEXT,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "amountHt" DOUBLE PRECISION NOT NULL,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "amountTva" DOUBLE PRECISION NOT NULL,
  "amountTtc" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "issuedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruitmentInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecruitmentInvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruitmentInvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecruitmentInvoice_invoiceNumber_key" ON "RecruitmentInvoice"("invoiceNumber");
CREATE INDEX "RecruitmentBillingRule_jobId_active_idx" ON "RecruitmentBillingRule"("jobId", "active");
CREATE INDEX "RecruitmentInvoice_companyId_status_idx" ON "RecruitmentInvoice"("companyId", "status");
CREATE INDEX "RecruitmentInvoice_jobId_status_idx" ON "RecruitmentInvoice"("jobId", "status");
CREATE INDEX "RecruitmentInvoice_presentationId_idx" ON "RecruitmentInvoice"("presentationId");
CREATE INDEX "RecruitmentInvoice_dueAt_status_idx" ON "RecruitmentInvoice"("dueAt", "status");
CREATE INDEX "RecruitmentInvoicePayment_invoiceId_paidAt_idx" ON "RecruitmentInvoicePayment"("invoiceId", "paidAt");

ALTER TABLE "RecruitmentBillingRule" ADD CONSTRAINT "RecruitmentBillingRule_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInvoice" ADD CONSTRAINT "RecruitmentInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInvoice" ADD CONSTRAINT "RecruitmentInvoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInvoice" ADD CONSTRAINT "RecruitmentInvoice_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "MissionPresentation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInvoice" ADD CONSTRAINT "RecruitmentInvoice_billingRuleId_fkey" FOREIGN KEY ("billingRuleId") REFERENCES "RecruitmentBillingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInvoicePayment" ADD CONSTRAINT "RecruitmentInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "RecruitmentInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;