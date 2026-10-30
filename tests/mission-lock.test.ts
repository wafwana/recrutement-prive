import assert from "node:assert/strict";
import test from "node:test";
import { isIdentityUnlocked } from "@/lib/mission-lock-core";

test("identity remains locked for every pre-unlock mission state", () => {
  const states = [
    "MISSION_ACTIVE",
    "CANDIDAT_ANONYME",
    "CONDITION_FINANCIERE_EN_ATTENTE",
    "PAIEMENT_OU_CONDITION_CONFIRME",
    "MISSION_TERMINEE",
  ];

  for (const state of states) {
    assert.equal(isIdentityUnlocked(state, "PENDING"), false);
    assert.equal(isIdentityUnlocked(state, "CONFIRMED"), false);
  }
});

test("identity unlock requires the exact server-side confirmed state", () => {
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "CONFIRMED"), true);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "PENDING"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "FAILED"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "EXPIRED"), false);
  assert.equal(isIdentityUnlocked("PAIEMENT_OU_CONDITION_CONFIRME", "CONFIRMED"), false);
});
