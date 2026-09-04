-- CreateTable
CREATE TABLE "JobCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCategory_code_key" ON "JobCategory"("code");

-- CreateIndex
CREATE INDEX "JobCategory_parentId_idx" ON "JobCategory"("parentId");

-- CreateIndex
CREATE INDEX "JobCategory_code_idx" ON "JobCategory"("code");

-- AddForeignKey
ALTER TABLE "JobCategory" ADD CONSTRAINT "JobCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "JobCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
