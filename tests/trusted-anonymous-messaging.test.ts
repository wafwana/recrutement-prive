import test from "node:test";
import assert from "node:assert/strict";
import { moderateAnonymousMessage } from "@/lib/messaging/anonymous-moderation";

test("Trusted anonymous messaging blocks direct contact data", () => {
  const blocked = [
    "Écris-moi sur candidat@example.com",
    "Appelle-moi au +33 6 12 34 56 78",
    "Mon profil est https://linkedin.com/in/example",
    "Ajoute-moi sur WhatsApp wa.me/33612345678",
    "Je suis Jean Dupont, contacte-moi",
    "Entreprise: Acme",
    "Mon email est jean arobase example point com",
  ];

  for (const message of blocked) {
    assert.equal(moderateAnonymousMessage(message).allowed, false, message);
  }
});

test("Trusted anonymous messaging allows professional discussion without contact data", () => {
  const result = moderateAnonymousMessage(
    "Merci pour votre présentation. Pouvez-vous préciser les responsabilités du poste et les objectifs des six premiers mois ?",
  );
  assert.equal(result.allowed, true);
  assert.deepEqual(result.categories, []);
});

test("Trusted anonymous messaging blocks compact numeric identifiers", () => {
  assert.equal(moderateAnonymousMessage("Mon numéro est 0612345678").allowed, false);
  assert.equal(moderateAnonymousMessage("Le code est 12345678").allowed, false);
});
