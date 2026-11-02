import assert from "node:assert/strict";
import test from "node:test";
import { validateContactFields } from "../lib/contact/validation";

const valid = {
  name: " Emery ",
  email: " emery@example.com ",
  phone: " 0600000000 ",
  subject: " Demande ",
  message: " Bonjour ",
};

test("contact fields are trimmed before delivery", () => {
  const result = validateContactFields(valid);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, "Emery");
    assert.equal(result.data.email, "emery@example.com");
    assert.equal(result.data.message, "Bonjour");
  }
});

test("contact validation rejects missing required fields and invalid email", () => {
  assert.equal(validateContactFields({ ...valid, subject: " " }).ok, false);
  assert.equal(validateContactFields({ ...valid, email: "not-an-email" }).ok, false);
});

test("contact validation enforces field-specific length limits", () => {
  assert.equal(validateContactFields({ ...valid, name: "n".repeat(121) }).ok, false);
  assert.equal(validateContactFields({ ...valid, email: `${"a".repeat(246)}@test.com` }).ok, false);
  assert.equal(validateContactFields({ ...valid, phone: "1".repeat(41) }).ok, false);
  assert.equal(validateContactFields({ ...valid, subject: "s".repeat(161) }).ok, false);
  assert.equal(validateContactFields({ ...valid, message: "m".repeat(5_001) }).ok, false);
});

test("phone remains optional", () => {
  assert.equal(validateContactFields({ ...valid, phone: "" }).ok, true);
});
