-- Migration Pôle 2 : Solutions technologiques & Plateformes sur mesure (Brique 1)
-- Création des tables étanches TechProspect, TechRequirementDoc, TechProject

CREATE TABLE IF NOT EXISTS "TechProspect" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "siren" TEXT,
    "siret" TEXT,
    "country" TEXT,
    "city" TEXT,
    "sector" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactRole" TEXT,
    "decisionMakers" JSONB,
    "detectionSignals" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NOUVEAU',
    "priority" TEXT NOT NULL DEFAULT 'MOYENNE',
    "estimatedBudget" DOUBLE PRECISION,
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechProspect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TechRequirementDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DEPOSE',
    "featuresAnalysis" JSONB,
    "estimatedQuote" JSONB,
    "techProspectId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechRequirementDoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TechProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CADRAGE',
    "setupPrice" DOUBLE PRECISION,
    "monthlySubscriptionPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startDate" TIMESTAMP(3),
    "estimatedDeliveryDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "repositoryUrl" TEXT,
    "projectManagerUserId" TEXT,
    "techProspectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechProject_pkey" PRIMARY KEY ("id")
);

-- Index pour requêtes performantes
CREATE INDEX IF NOT EXISTS "TechProspect_status_createdAt_idx" ON "TechProspect"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "TechProspect_sector_country_idx" ON "TechProspect"("sector", "country");
CREATE INDEX IF NOT EXISTS "TechProspect_assignedToUserId_idx" ON "TechProspect"("assignedToUserId");

CREATE INDEX IF NOT EXISTS "TechRequirementDoc_techProspectId_idx" ON "TechRequirementDoc"("techProspectId");
CREATE INDEX IF NOT EXISTS "TechRequirementDoc_status_idx" ON "TechRequirementDoc"("status");

CREATE INDEX IF NOT EXISTS "TechProject_techProspectId_idx" ON "TechProject"("techProspectId");
CREATE INDEX IF NOT EXISTS "TechProject_status_idx" ON "TechProject"("status");
CREATE INDEX IF NOT EXISTS "TechProject_projectManagerUserId_idx" ON "TechProject"("projectManagerUserId");

-- Contraintes de clés étrangères
ALTER TABLE "TechRequirementDoc" DROP CONSTRAINT IF EXISTS "TechRequirementDoc_techProspectId_fkey";
ALTER TABLE "TechRequirementDoc" ADD CONSTRAINT "TechRequirementDoc_techProspectId_fkey" FOREIGN KEY ("techProspectId") REFERENCES "TechProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TechProject" DROP CONSTRAINT IF EXISTS "TechProject_techProspectId_fkey";
ALTER TABLE "TechProject" ADD CONSTRAINT "TechProject_techProspectId_fkey" FOREIGN KEY ("techProspectId") REFERENCES "TechProspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
