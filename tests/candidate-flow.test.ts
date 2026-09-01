import test from "node:test";
import assert from "node:assert/strict";
import { isIdentityUnlocked } from "../lib/mission-lock";
import { candidateProfileSchema } from "../lib/validation";

test("candidateProfileSchema validates schema and phone format correctly", () => {
  const valid = candidateProfileSchema.safeParse({
    headline: "Directeur Financier",
    bio: "Bio professionnelle",
    location: "Paris",
    country: "France",
    phonePrefix: "+33",
    phone: "0612345678",
    skills: "Finance, Management",
    experienceYears: 10,
  });

  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.country, "France");
    assert.equal(valid.data.phonePrefix, "+33");
  }

  const invalidPhonePrefix = candidateProfileSchema.safeParse({
    phonePrefix: "invalid_prefix",
  });
  assert.equal(invalidPhonePrefix.success, false);
});

test("isIdentityUnlocked strictly requires IDENTITE_DEBLOQUEE and CONFIRMED", () => {
  assert.equal(isIdentityUnlocked("CANDIDAT_ANONYME", "CONFIRMED"), false);
  assert.equal(isIdentityUnlocked("CONDITION_FINANCIERE_EN_ATTENTE", "CONFIRMED"), false);
  assert.equal(isIdentityUnlocked("PAIEMENT_OU_CONDITION_CONFIRME", "CONFIRMED"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "PENDING"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "CONFIRMED"), true);
});

type UserRole = "CANDIDAT" | "ENTREPRISE" | "CONSULTANT" | "ADMIN" | "OWNER";

function checkDocumentAccess(input: {
  userRole: UserRole;
  userId: string;
  docCandidateUserId: string;
  docCandidateId: string;
  companyId?: string;
  presentation?: { state: string; financialConditionStatus: string } | null;
}) {
  if (input.userRole === "CANDIDAT") {
    return input.userId === input.docCandidateUserId;
  }
  if (input.userRole === "ENTREPRISE") {
    if (!input.companyId || !input.presentation) return false;
    return isIdentityUnlocked(input.presentation.state, input.presentation.financialConditionStatus);
  }
  return ["ADMIN", "OWNER", "CONSULTANT"].includes(input.userRole);
}

test("checkDocumentAccess enforces candidate ownership isolation", () => {
  const candAUserId = "user_cand_A";
  const candBUserId = "user_cand_B";
  const candAId = "cand_A";

  // Candidate A accesses own doc
  const allowOwn = checkDocumentAccess({
    userRole: "CANDIDAT",
    userId: candAUserId,
    docCandidateUserId: candAUserId,
    docCandidateId: candAId,
  });
  assert.equal(allowOwn, true);

  // Candidate B attempts to access Candidate A doc
  const denyOther = checkDocumentAccess({
    userRole: "CANDIDAT",
    userId: candBUserId,
    docCandidateUserId: candAUserId,
    docCandidateId: candAId,
  });
  assert.equal(denyOther, false);
});

test("checkDocumentAccess enforces company anonymity unlock rules", () => {
  const candAUserId = "user_cand_A";
  const candAId = "cand_A";
  const companyId = "comp_1";

  // Company accesses candidate in CANDIDAT_ANONYME state -> DENY
  const denyAnonymous = checkDocumentAccess({
    userRole: "ENTREPRISE",
    userId: "user_company",
    docCandidateUserId: candAUserId,
    docCandidateId: candAId,
    companyId,
    presentation: { state: "CANDIDAT_ANONYME", financialConditionStatus: "CONFIRMED" },
  });
  assert.equal(denyAnonymous, false);

  // Company accesses candidate in IDENTITE_DEBLOQUEE & CONFIRMED -> ALLOW
  const allowUnlocked = checkDocumentAccess({
    userRole: "ENTREPRISE",
    userId: "user_company",
    docCandidateUserId: candAUserId,
    docCandidateId: candAId,
    companyId,
    presentation: { state: "IDENTITE_DEBLOQUEE", financialConditionStatus: "CONFIRMED" },
  });
  assert.equal(allowUnlocked, true);
});

test("checkDocumentAccess allows ADMIN / OWNER / CONSULTANT", () => {
  const candAUserId = "user_cand_A";
  const candAId = "cand_A";

  assert.equal(
    checkDocumentAccess({ userRole: "ADMIN", userId: "admin1", docCandidateUserId: candAUserId, docCandidateId: candAId }),
    true
  );
  assert.equal(
    checkDocumentAccess({ userRole: "OWNER", userId: "owner1", docCandidateUserId: candAUserId, docCandidateId: candAId }),
    true
  );
  assert.equal(
    checkDocumentAccess({ userRole: "CONSULTANT", userId: "cons1", docCandidateUserId: candAUserId, docCandidateId: candAId }),
    true
  );
});
