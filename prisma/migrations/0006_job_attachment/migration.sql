ALTER TABLE "Job"
ADD COLUMN "attachmentName" TEXT,
ADD COLUMN "attachmentMimeType" TEXT,
ADD COLUMN "attachmentData" BYTEA;
