import assert from "node:assert/strict";
import testCase from "node:test";
import { classifyTechNeed, findTechProspectDuplicate, normalizeCompanyName, normalizeDomain, scoreTechProspect } from "../lib/tech/sourcing";

testCase("normalise les raisons sociales et suffixes juridiques", () => {
  assert.equal(normalizeCompanyName("Société Étoile du Nord SAS"), "etoile du nord");
  assert.equal(normalizeCompanyName("North Star Limited"), "north star");
});
testCase("normalise un domaine sans protocole ni www", () => {
  assert.equal(normalizeDomain("https://www.Example.com/contact"), "example.com");
  assert.equal(normalizeDomain("not a url"), null);
});
testCase("détecte les doublons par domaine puis nom et pays", () => {
  assert.deepEqual(findTechProspectDuplicate({ companyName: "Example", country: "France", website: "example.com" }, [{ id: "a", companyName: "Autre nom", country: "France", website: "https://www.example.com" }]), { id: "a", reason: "DOMAIN" });
  assert.deepEqual(findTechProspectDuplicate({ companyName: "Société Étoile SAS", country: "France" }, [{ id: "b", companyName: "Etoile", country: "France" }]), { id: "b", reason: "NAME_COUNTRY" });
});
testCase("refuse une preuve sans justification ou provenance HTTP", () => {
  assert.throws(() => classifyTechNeed({ kind: "HYPOTHESIS", category: "CRM", statement: " ", sourceUrl: "https://example.com", observedAt: "2026-11-15" }));
  assert.throws(() => classifyTechNeed({ kind: "PUBLIC_OBSERVATION", category: "Site", statement: "Site obsolète", sourceUrl: "file:///private", observedAt: "2026-11-15" }));
});
testCase("distingue hypothèses et observations dans un score explicable", () => {
  const score = scoreTechProspect({ companyName: "Example", country: "France", sector: "Industrie", observedAt: "2026-11-14", needs: [
    { kind: "HYPOTHESIS", category: "CRM", statement: "À vérifier", sourceUrl: "https://example.com", observedAt: "2026-11-14" },
    { kind: "PUBLIC_OBSERVATION", category: "Site", statement: "Site public non responsive", sourceUrl: "https://example.com", observedAt: "2026-11-14" },
  ] }, new Date("2026-11-15T12:00:00Z"));
  assert.ok(score.total > 0 && score.total <= 100);
  assert.equal(score.confidence, "MEDIUM");
  assert.equal(score.factors.find(f => f.key === "need_signal")?.points, 10);
  assert.ok(score.factors.every(f => typeof f.explanation === "string"));
});
