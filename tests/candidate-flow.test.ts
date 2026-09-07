import test from "node:test";
import assert from "node:assert/strict";
import { isIdentityUnlocked } from "../lib/mission-lock";
import { candidateProfileSchema } from "../lib/validation";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

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
  return ["ADMIN", "OWNER"].includes(input.userRole);
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

test("checkDocumentAccess allows ADMIN / OWNER and denies CONSULTANT direct archive access", () => {
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
  // CONSULTANT is explicitly excluded from direct document archive access
  assert.equal(
    checkDocumentAccess({ userRole: "CONSULTANT", userId: "cons1", docCandidateUserId: candAUserId, docCandidateId: candAId }),
    false
  );
});

test("matchCandidateToJob distinguishes exact subcategory match, parent category match, primary-as-sub prevention, and no match", () => {
  const job = {
    title: "Contrôleur de Gestion Senior",
    categoryCode: "FINANCE",
    subCategoryCode: "CONTROLE_DE_GESTION",
    requiredSkills: "Budget, Forecast, Excel",
    requiredExperienceYears: 5,
  };

  const exactCandidate = {
    headline: "Contrôleur de gestion",
    skills: "Budget, Forecast, Excel",
    experienceYears: 6,
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["CONTROLE_DE_GESTION", "AUDIT"],
  };

  const parentCandidate = {
    headline: "Comptable Unique",
    skills: "Budget, Excel",
    experienceYears: 6,
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["COMPTABILITE"],
  };

  // Primary category code happens to match subCategoryCode string: MUST NOT be EXACT_SUBCATEGORY
  const primaryAsSubCandidate = {
    headline: "Financier",
    skills: "Finance",
    experienceYears: 5,
    primaryCategoryCode: "CONTROLE_DE_GESTION",
    subCategoryCodes: [],
  };

  const noMatchCandidate = {
    headline: "Développeur Fullstack",
    skills: "React, Node.js",
    experienceYears: 3,
    primaryCategoryCode: "INFORMATIQUE",
    subCategoryCodes: ["DEVELOPPEMENT"],
  };

  const exactResult = matchCandidateToJob(exactCandidate, job);
  const parentResult = matchCandidateToJob(parentCandidate, job);
  const primaryAsSubResult = matchCandidateToJob(primaryAsSubCandidate, job);
  const noMatchResult = matchCandidateToJob(noMatchCandidate, job);

  assert.equal(exactResult.categoryMatchLevel, "EXACT_SUBCATEGORY");
  assert.equal(exactResult.categoryScore, 15);

  assert.equal(parentResult.categoryMatchLevel, "PARENT_CATEGORY");
  assert.equal(parentResult.categoryScore, 8);

  assert.notEqual(primaryAsSubResult.categoryMatchLevel, "EXACT_SUBCATEGORY");
  assert.equal(primaryAsSubResult.categoryMatchLevel, "NONE");

  assert.equal(noMatchResult.categoryMatchLevel, "NONE");
  assert.equal(noMatchResult.categoryScore, 0);

  assert.ok(exactResult.categoryScore > parentResult.categoryScore);
  assert.ok(exactResult.score > parentResult.score);
});
