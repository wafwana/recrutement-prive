import test from "node:test";
import assert from "node:assert/strict";
import { parseCvTextLocally, CvTaxonomyItem } from "../lib/cv/analyzer";

const sampleTaxonomy: CvTaxonomyItem[] = [
  { code: "CASINOS_JEUX", name: "Casinos & Jeux", parentCode: null },
  { code: "EXPLOITATION_JEUX", name: "Exploitation des jeux", parentCode: "CASINOS_JEUX" },
  { code: "CAISSE", name: "Caisse", parentCode: "CASINOS_JEUX" },
  { code: "INFORMATIQUE", name: "Informatique & SI", parentCode: null },
  { code: "DEVELOPPEMENT", name: "Développement", parentCode: "INFORMATIQUE" },
];

test("CV Classification - Rich CV text produces HIGH confidence and explicit skills", async () => {
  const richCvText = `
    Jean Dupont
    Développeur Fullstack Senior
    5 ans d'expérience
    Compétences: TypeScript, React, Node.js, PostgreSQL, Docker, Management
    Langues: Français, Anglais
  `;

  const analysis = parseCvTextLocally(richCvText, sampleTaxonomy);

  assert.equal(analysis.headline, "Jean Dupont");
  assert.ok(analysis.explicitSkills.includes("TypeScript"));
  assert.ok(analysis.explicitSkills.includes("React"));
  assert.equal(analysis.experienceYears, 5);
  assert.equal(analysis.confidenceLevel, "HIGH");
  assert.equal(analysis.analysisLimits, null);
  assert.ok(analysis.evidenceIndices.length > 0);
});

test("CV Classification - Minimal or poor CV text yields LOW confidence and ANALYSE_LIMITEE limits", async () => {
  const minimalCvText = `
    Pierre Martin
    Agent polyvalent
    Contact: 0600000000
  `;

  const analysis = parseCvTextLocally(minimalCvText, sampleTaxonomy);

  assert.equal(analysis.headline, "Pierre Martin");
  assert.equal(analysis.explicitSkills.length, 0, "Must not invent fake skills for minimal text");
  assert.equal(analysis.confidenceLevel, "LOW");
  assert.ok(analysis.analysisLimits, "Analysis limits explanation must be provided for LOW confidence");
  assert.match(analysis.analysisLimits!, /Extraits factuels réduits/);
});

test("CV Classification - Facts-only verification: no invented skills or categories", async () => {
  const emptyText = "Document non structuré sans mots-clés";
  const analysis = parseCvTextLocally(emptyText, sampleTaxonomy);

  assert.equal(analysis.skills.length, 0);
  assert.equal(analysis.explicitSkills.length, 0);
  assert.equal(analysis.primaryCategoryCode, null);
  assert.equal(analysis.confidenceLevel, "LOW");
});
