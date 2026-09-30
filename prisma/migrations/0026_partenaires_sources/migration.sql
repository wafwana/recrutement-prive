-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "usualName" TEXT,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "partnerType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "website" TEXT,
    "institutionalAddress" TEXT,
    "publicContactEmail" TEXT,
    "publicContactPhone" TEXT,
    "languages" JSONB,
    "sectors" JSONB,
    "professions" JSONB,
    "targetAudience" JSONB,
    "skills" JSONB,
    "collaborationTypes" JSONB,
    "potentialNeed" TEXT,
    "interest" TEXT,
    "coveredZones" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedOwner" TEXT,
    "lastQualifiedAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerContact" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAgreement" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROJECT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "clauses" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerHistory" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_category_subCategory_idx" ON "Partner"("category", "subCategory");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_country_city_idx" ON "Partner"("country", "city");

-- CreateIndex
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

-- CreateIndex
CREATE INDEX "PartnerContact_partnerId_idx" ON "PartnerContact"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerContact_email_idx" ON "PartnerContact"("email");

-- CreateIndex
CREATE INDEX "PartnerAgreement_partnerId_status_idx" ON "PartnerAgreement"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerHistory_partnerId_createdAt_idx" ON "PartnerHistory"("partnerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PartnerContact" ADD CONSTRAINT "PartnerContact_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAgreement" ADD CONSTRAINT "PartnerAgreement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerHistory" ADD CONSTRAINT "PartnerHistory_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
