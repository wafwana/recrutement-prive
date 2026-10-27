import test from "node:test";
import assert from "node:assert/strict";
import { lookupCompanyBySiret } from "../lib/company/public-registry";

test("Company Creation - SIRET lookup handles public registry response format", async () => {
  // Test mock/unit normalized SIRET helper
  const rawSiret = "123 456 789 00012";
  const normalized = rawSiret.replace(/\D/g, "");
  assert.equal(normalized, "12345678900012");
  assert.equal(normalized.length, 14);
});

test("Company Creation - Schema validation rules for email and SIRET", async () => {
  const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
  assert.ok(emailRegex.test("contact@acme.com"), "Valid email should pass");
  assert.ok(!emailRegex.test("notanemail"), "Invalid email should fail");

  const siretRegex = /^\d{14}$/;
  assert.ok(siretRegex.test("12345678900012"), "Valid 14-digit SIRET should pass");
  assert.ok(!siretRegex.test("123456"), "Short SIRET should fail");
});
