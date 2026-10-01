-- CreateEnum
CREATE TYPE "InternalTransferStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "archivedDocumentId" TEXT;

-- CreateTable
CREATE TABLE "InternalTransfer" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "collaboratorUserId" TEXT NOT NULL,
    "scope" TEXT,
    "status" "InternalTransferStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalTransfer_collaboratorUserId_status_idx" ON "InternalTransfer"("collaboratorUserId", "status");

-- CreateIndex
CREATE INDEX "InternalTransfer_targetType_targetId_status_idx" ON "InternalTransfer"("targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "InternalTransfer_grantedByUserId_idx" ON "InternalTransfer"("grantedByUserId");

-- CreateIndex
CREATE INDEX "Message_archivedDocumentId_idx" ON "Message"("archivedDocumentId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_archivedDocumentId_fkey" FOREIGN KEY ("archivedDocumentId") REFERENCES "ArchivedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_collaboratorUserId_fkey" FOREIGN KEY ("collaboratorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
