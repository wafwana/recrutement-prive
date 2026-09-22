CREATE TABLE "EnterpriseSourcedOffer" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "externalJobId" TEXT NOT NULL,
  "selectedCountry" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUALIFIED',
  "analysis" JSONB,
  "matching" JSONB,
  "analyzedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseSourcedOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseSourcedOffer_companyId_externalJobId_key" ON "EnterpriseSourcedOffer"("companyId", "externalJobId");
CREATE INDEX "EnterpriseSourcedOffer_companyId_status_idx" ON "EnterpriseSourcedOffer"("companyId", "status");
CREATE INDEX "EnterpriseSourcedOffer_selectedCountry_idx" ON "EnterpriseSourcedOffer"("selectedCountry");

ALTER TABLE "EnterpriseSourcedOffer" ADD CONSTRAINT "EnterpriseSourcedOffer_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnterpriseSourcedOffer" ADD CONSTRAINT "EnterpriseSourcedOffer_externalJobId_fkey"
  FOREIGN KEY ("externalJobId") REFERENCES "ExternalJobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;