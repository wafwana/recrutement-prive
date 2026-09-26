ALTER TABLE "Company" ADD COLUMN "siren" TEXT;
ALTER TABLE "Company" ADD COLUMN "siret" TEXT;
ALTER TABLE "Company" ADD COLUMN "legalForm" TEXT;
ALTER TABLE "Company" ADD COLUMN "apeCode" TEXT;
ALTER TABLE "Company" ADD COLUMN "address" TEXT;
ALTER TABLE "Company" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "Company" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "sourceCollectedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "contactEmailSourceUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "contactEmailCollectedAt" TIMESTAMP(3);

ALTER TABLE "ExternalJobOpportunity" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "ExternalJobOpportunity" ADD COLUMN "sourceCollectedAt" TIMESTAMP(3);

ALTER TABLE "SourcedCandidate" ADD COLUMN "sourceCollectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Company_siren_key" ON "Company"("siren");
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");
