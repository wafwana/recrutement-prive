import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calculateQualificationScore,
  detectDuplicateProspect,
  CommercialSignal,
} from "../lib/tech/sourcing";

test("Pole 2 Brique 4 Sourcing: Qualification score calculation is explainable and deterministic", () => {
  const highPrioritySignals: CommercialSignal[] = [
    "APPEL_OFFRE_PRESTATAIRE",
    "DEVELOPPEMENT_INTERNATIONAL",
  ];

  const company = {
    sector: "Technologie & SaaS",
    country: "France",
    website: "https://innovtech-solutions.com",
  };

  const qualification = calculateQualificationScore(highPrioritySignals, company);

  // Score élevé attendu (>= 80 pour prioritaire)
  assert.equal(qualification.score >= 80, true);
  assert.equal(qualification.qualificationLevel, "PRIORITAIRE");
  assert.equal(qualification.criteriaDetails.length >= 3, true);
  assert.equal(qualification.recommendations.length > 0, true);

  // Cas faible priorité
  const lowPrioritySignals: CommercialSignal[] = ["CREATION_RECENTE"];
  const lowCompany = {
    sector: "Artisanat",
    country: "France",
    website: null,
  };

  const lowQualif = calculateQualificationScore(lowPrioritySignals, lowCompany);
  assert.equal(lowQualif.score < qualification.score, true);
  assert.equal(lowQualif.qualificationLevel === "FAIBLE" || lowQualif.qualificationLevel === "MOYEN", true);
});

test("Pole 2 Brique 4 Sourcing: Anti-duplicate logic by SIRET/SIREN and Domain/Country", () => {
  const existingProspects = [
    {
      siren: "123456789",
      siret: "12345678900012",
      website: "https://acme-corp.com",
      country: "France",
    },
    {
      siren: null,
      siret: null,
      website: "https://global-trade.ch",
      country: "Suisse",
    },
  ];

  // 1. Détection par SIRET exact
  assert.equal(
    detectDuplicateProspect(existingProspects, {
      siret: "12345678900012",
      country: "France",
    }),
    true
  );

  // 2. Détection par Domaine normalisé et Pays
  assert.equal(
    detectDuplicateProspect(existingProspects, {
      website: "http://www.acme-corp.com/fr",
      country: "France",
    }),
    true
  );

  // 3. Différent pays avec même domaine ou nouveau prospect => Pas doublon
  assert.equal(
    detectDuplicateProspect(existingProspects, {
      website: "https://acme-corp.com",
      country: "Canada",
    }),
    false
  );

  assert.equal(
    detectDuplicateProspect(existingProspects, {
      siren: "987654321",
      website: "https://new-ventures.fr",
      country: "France",
    }),
    false
  );
});

test("Pole 2 Brique 4 Sourcing: API routes and security contracts exist", () => {
  const sourcingRoute = "app/api/tech/sourcing/route.ts";
  const transferRoute = "app/api/tech/sourcing/transfer/route.ts";
  const sourcingPage = "app/espace/tech/sourcing/page.tsx";

  assert.equal(fs.existsSync(sourcingRoute), true);
  assert.equal(fs.existsSync(transferRoute), true);
  assert.equal(fs.existsSync(sourcingPage), true);

  const sourcingContent = fs.readFileSync(sourcingRoute, "utf8");
  assert.match(sourcingContent, /hasPermission\(session\.user\.id,\s*role,\s*"TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(sourcingContent, /calculateQualificationScore/);
  assert.match(sourcingContent, /status:\s*"A_QUALIFIER"/);

  const transferContent = fs.readFileSync(transferRoute, "utf8");
  assert.match(transferContent, /detectDuplicateProspect/);
  assert.match(transferContent, /TECH_PROSPECT_TRANSFER_TO_CRM/);
});
