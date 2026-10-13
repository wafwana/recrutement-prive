-- Add explicit VAT rate and secure receipt storage for Owner outflows.
ALTER TABLE "FinancialOutflow"
  ADD COLUMN "amountTvaRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "documentName" TEXT,
  ADD COLUMN "documentMimeType" TEXT,
  ADD COLUMN "documentData" BYTEA;
