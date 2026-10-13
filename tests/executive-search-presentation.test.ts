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
