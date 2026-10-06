import test from "node:test";
import assert from "node:assert/strict";
import { SECURE_CONTACT_MINUTES, SECURE_CONTACT_PRICE_HT, SECURE_CONTACT_PRICE_TTC, MAX_CONTACTS_BEFORE_DECISION } from "../lib/contacts/secure-contact";
import { SECURE_CONTACT_CONTRACT_TEMPLATES } from "../lib/contracts/secure-contact-templates";

test("secure contact commercial rules are fixed", () => {
  assert.equal(SECURE_CONTACT_MINUTES, 30);
  assert.equal(SECURE_CONTACT_PRICE_HT, 82.5);
  assert.equal(SECURE_CONTACT_PRICE_TTC, 99);
  assert.equal(MAX_CONTACTS_BEFORE_DECISION, 3);
});

test("required secure contact contract templates exist", () => {
  const keys = SECURE_CONTACT_CONTRACT_TEMPLATES.map((item) => item.key);
  for (const key of ["ENTREPRISE_CONTACT","CANDIDAT_CONTACT","INTERVIEW_SECURE","ANTI_CIRCUMVENTION","RECORDING_CONSENT","SECURE_CHANNEL_POLICY"] as const) {
    assert.ok(keys.includes(key));
  }
});
