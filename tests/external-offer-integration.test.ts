import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("external offer integration is strictly OWNER-only and requires a qualified in-scope offer", () => {
  const route = read("app/api/owner/offres-vivier/[id]/integrate/route.ts");
  assert.ok(route.includes("role !== \"OWNER\""));
  assert.ok(route.includes("[\"QUALIFIED\", \"MATCHING\"]"));
  assert.ok(route.includes("qualification.inPlatformScope !== true"));
  assert.ok(route.includes("if (!companyName)"));
});

test("external offer integration creates only a suspended company and a private draft job", () => {
  const route = read("app/api/owner/offres-vivier/[id]/integrate/route.ts");
  assert.ok(route.includes("status: \"SUSPENDED\""));
  assert.ok(route.includes("sourceType: \"EXTERNAL_OFFER\""));
  assert.ok(route.includes("status: \"DRAFT\""));
  assert.ok(route.includes("jobPublicationStatus: \"DRAFT\""));
  assert.ok(route.includes("humanValidationRequired: true"));
  assert.ok(route.includes("EXTERNAL_OFFER_INTEGRATED_AS_DRAFT"));
  assert.ok(route.includes("tx.auditLog.create"));
  assert.ok(!route.includes("status: \"OPEN\""));
  assert.ok(!route.includes("outreachContacts.create"));
});

test("external offer integration is idempotent and protected by an atomic lock", () => {
  const route = read("app/api/owner/offres-vivier/[id]/integrate/route.ts");
  assert.ok(route.includes("previousJobId"));
  assert.ok(route.includes("updateMany"));
  assert.ok(route.includes("status: \"INTEGRATING\""));
  assert.ok(route.includes("alreadyIntegrated: true"));
  const pipeline = read("lib/jobs/offer-pipeline.ts");
  assert.ok(pipeline.includes("\"INTEGRATED_DRAFT\""));
});

test("only the Owner sees the integration action and the detail page displays internal matches", () => {
  const page = read("app/espace/owner/offres-vivier/[id]/page.tsx");
  assert.ok(page.includes("role === \"OWNER\""));
  assert.ok(page.includes("IntegrateExternalOfferButton"));
  assert.ok(page.includes("topMatches"));
  assert.ok(page.includes("Validation humaine obligatoire"));
  const button = read("components/owner/IntegrateExternalOfferButton.tsx");
  assert.ok(button.includes("method: \"POST\""));
  assert.ok(button.includes("aucune publication"));
});

test("offer pool exposes integration status without allowing manual status promotion", () => {
  const page = read("app/espace/owner/offres-vivier/page.tsx");
  assert.ok(page.includes("INTEGRATED_DRAFT"));
  assert.ok(page.includes("Brouillons internes"));
  const route = read("app/api/owner/offres-vivier/route.ts");
  assert.ok(!route.includes("INTEGRATED_DRAFT"));
});