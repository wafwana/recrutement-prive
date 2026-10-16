import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("executive presentation is anonymized and routes contact through the platform", () => {
  const page = fs.readFileSync(path.join(root, "app/espace/entreprise/presentation/[presentationId]/page.tsx"), "utf8");
  assert.match(page, /Présentation confidentielle/);
  assert.match(page, /Identité protégée/);
  assert.match(page, /SecureContactPanel/);
  assert.doesNotMatch(page, /candidate\.email/);
  assert.doesNotMatch(page, /candidate\.phone/);
});

test("secure contact request is company-initiated and remains payment-gated", () => {
  const route = fs.readFileSync(path.join(root, "app/api/contacts/secure/route.ts"), "utf8");
  assert.match(route, /presentation\.companyUserId !== session\.user\.id/);
  assert.match(route, /paymentStatus: "PENDING"/);
  assert.match(route, /priceTtc: SECURE_CONTACT_PRICE_TTC/);
  assert.match(route, /SECURE_CONTACT_REQUESTED/);
});

test("recording only starts with two-party consent", () => {
  const service = fs.readFileSync(path.join(root, "lib/contacts/secure-contact.ts"), "utf8");
  assert.match(service, /candidateConsentAt === null \|\| meeting\.companyConsentAt === null/);
  assert.match(service, /recordingStartedAt: new Date\(\)/);
});


test("Executive Search embeds live anonymous candidate-offer proposals and reuses the audited presentation flow", () => {
  const cockpit = fs.readFileSync(path.join(root, "app/espace/owner/contacts-securises/ExecutiveSearchTabs.tsx"), "utf8");
  const matchingRoute = fs.readFileSync(path.join(root, "app/api/owner/cv-matching/route.ts"), "utf8");

  assert.match(cockpit, /id: "matching", label: "Matching candidats ↔ offres"/);
  assert.match(cockpit, /\/api\/owner\/cv-matching\?mode=overview/);
  assert.match(cockpit, /Préparer la mise en relation/);
  assert.match(cockpit, /match\.candidateAlias/);
  assert.match(cockpit, /match\.companyAlias/);
  assert.match(cockpit, /presentationExists/);
  assert.match(cockpit, /action: "present", candidateId: match\.candidateId, jobId: match\.jobId/);
  assert.match(cockpit, /aucun email ni contact externe ne sera envoyé automatiquement/i);
  assert.doesNotMatch(cockpit, /candidate\.email|candidate\.phone|match\.email/);

  assert.match(cockpit, /Actions prioritaires/);
  assert.match(cockpit, /Les prochaines étapes du cabinet/);
  assert.match(cockpit, /Trouver de nouvelles mises en relation/);
  assert.match(cockpit, /Examiner de nouveaux matchings/);
  assert.match(cockpit, /activeTab === "matching" || activeTab === "overview"/);

  assert.match(matchingRoute, /requireMatchingAccess/);
  assert.match(matchingRoute, /"PRESENTATIONS_MANAGE"/);
  assert.match(matchingRoute, /"CANDIDATE_MATCH_PRESENTED"/);
  assert.match(matchingRoute, /anonymousMessagingEnabled: true/);
  assert.match(matchingRoute, /identityProtected: true/);
});
