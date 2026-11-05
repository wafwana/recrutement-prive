import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { analyzeRequirementsLocally } from "../lib/tech/analyzer";

test("Pole 2 deterministic requirements analyzer extracts categories and estimates", () => {
  const title = "Plateforme SaaS RH et Matching Candidats";
  const description =
    "Nous souhaitons créer un espace sécurisé avec connexion utilisateur, gestion des profils et documents, moteur de matching pondéré et facturation par abonnement mensuel Stripe.";

  const analysis = analyzeRequirementsLocally(title, description);

  // Vérifier la détection fonctionnelle
  assert.equal(analysis.functionalCategories.length >= 4, true);
  const categoryNames = analysis.functionalCategories.map((c) => c.name);
  assert.equal(categoryNames.some((n) => n.includes("Authentification")), true);
  assert.equal(categoryNames.some((n) => n.includes("Entités Métier")), true);
  assert.equal(categoryNames.some((n) => n.includes("Rapprochement")), true);
  assert.equal(categoryNames.some((n) => n.includes("Paiement")), true);

  // Vérifier les scores et dépendances
  assert.equal(analysis.globalReusabilityPercentage >= 70, true);
  assert.equal(analysis.technicalDependencies.includes("Stripe API"), true);
  assert.equal(analysis.estimatedEffortDays.totalDays > 0, true);
  assert.equal(analysis.pricingRecommendation.setupMin > 0, true);
  assert.equal(analysis.pricingRecommendation.monthlySubscriptionMin > 0, true);
});

test("Pole 2 requirements API security and OWNER validation contract", () => {
  const reqRoute = "app/api/tech/requirements/route.ts";
  const reqDetailRoute = "app/api/tech/requirements/[id]/route.ts";

  assert.equal(fs.existsSync(reqRoute), true);
  assert.equal(fs.existsSync(reqDetailRoute), true);

  const reqRouteContent = fs.readFileSync(reqRoute, "utf8");
  assert.match(reqRouteContent, /hasPermission\(session\.user\.id,\s*role,\s*"TECH_SOLUTIONS_MANAGE"\)/);
  assert.match(reqRouteContent, /analyzeRequirementsLocally/);

  const reqDetailContent = fs.readFileSync(reqDetailRoute, "utf8");
  // Seul l'OWNER peut valider ou rejeter un cahier des charges
  assert.match(reqDetailContent, /session\.user\.role\s*!==\s*"OWNER"/);
  assert.match(reqDetailContent, /Seul l'OWNER peut valider ou rejeter un cahier des charges/);
});
