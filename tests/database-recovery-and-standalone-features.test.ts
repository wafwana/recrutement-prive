import assert from "node:assert/strict";
import { test } from "node:test";
import { HELP_GUIDES, getTaxonomyHelpGuides } from "../lib/help/help-center-data";
import { MAILING_TEMPLATES, interpolateMailingTemplate } from "../lib/mailings/mailings-data";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

test("Database recovery guide exists in Help Center dataset", () => {
  const recoveryGuide = HELP_GUIDES.find((g) => g.id === "guide-database-offline-recovery");
  assert.ok(recoveryGuide, "Database recovery guide must exist in HELP_GUIDES");
  assert.equal(recoveryGuide.module, "ADMIN");
  assert.ok(recoveryGuide.keywords.includes("neon"));
  assert.ok(recoveryGuide.keywords.includes("postgresql"));
});

test("interpolateMailingTemplate replaces placeholders cleanly with custom values or defaults", () => {
  const template = MAILING_TEMPLATES.find((t) => t.code === "ENT_PRESENTATION_PROFIL");
  assert.ok(template, "ENT_PRESENTATION_PROFIL template must exist");

  const rendered = interpolateMailingTemplate(template.body, template.variables, {
    nom_contact: "Mme Dupont",
    titre_poste: "Croupier Poker",
  });

  assert.ok(rendered.includes("Mme Dupont"));
  assert.ok(rendered.includes("Croupier Poker"));
  assert.ok(!rendered.includes("{{nom_contact}}"));
});

test("matchCandidateToJob computes score deterministically in offline memory without database calls", () => {
  const result = matchCandidateToJob(
    {
      skills: ["Blackjack", "Roulette", "Poker"],
      experienceYears: 10,
      headline: "Croupier Polyvalent Senior",
      location: "Monaco",
      country: "France",
      primaryCategoryCode: "CASINOS_JEUX",
      subCategoryCodes: ["EXPLOITATION_JEUX"],
    },
    {
      requiredSkills: ["Blackjack", "Roulette"],
      requiredExperienceYears: 5,
      title: "Recrutement Croupier Jeux de Table",
      description: "Casino d'Aix-en-Provence recherche un croupier expérimenté.",
      location: "France",
      categoryCode: "CASINOS_JEUX",
      subCategoryCode: "EXPLOITATION_JEUX",
    }
  );

  assert.ok(result.score >= 70, `Expected high matching score >= 70, got ${result.score}`);
  assert.equal(result.categoryMatchLevel, "EXACT_SUBCATEGORY");
  assert.equal(result.categoryScore, 15);
});
