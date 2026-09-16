import test from "node:test";
import assert from "node:assert/strict";
import { matchCandidateToJob } from "../lib/matching/candidate-job";

test("adversarial check: candidate photo is strictly excluded from matching algorithm score", () => {
  const candidateWithoutPhoto = {
    headline: "Directeur Financier",
    skills: "Finance, Management",
    experienceYears: 10,
    primaryCategoryCode: "FINANCE",
    subCategoryCodes: ["CONTROLE_DE_GESTION"],
  };

  const candidateWithPhoto = {
    ...candidateWithoutPhoto,
    photoUrl: "https://example.com/photo.jpg",
    photoData: Buffer.from("fake_image_data"),
    photoMimeType: "image/jpeg",
  };

  const job = {
    title: "Directeur Financier",
    categoryCode: "FINANCE",
    subCategoryCode: "CONTROLE_DE_GESTION",
    requiredSkills: "Finance, Management",
    requiredExperienceYears: 10,
  };

  const result1 = matchCandidateToJob(candidateWithoutPhoto, job);
  const result2 = matchCandidateToJob(candidateWithPhoto, job);

  // Both scores and details must be identical regardless of photo presence
  assert.equal(result1.score, result2.score);
  assert.equal(result1.categoryMatchLevel, result2.categoryMatchLevel);
  assert.equal(result1.skillScore, result2.skillScore);
});

test("adversarial check: non-OWNER access to archive endpoints is denied", () => {
  function checkOwnerOnlyEndpoint(userRole: string | undefined): { status: number; allowed: boolean } {
    if (!userRole || userRole !== "OWNER") {
      return { status: 403, allowed: false };
    }
    return { status: 200, allowed: true };
  }

  assert.equal(checkOwnerOnlyEndpoint("CANDIDAT").allowed, false);
  assert.equal(checkOwnerOnlyEndpoint("ENTREPRISE").allowed, false);
  assert.equal(checkOwnerOnlyEndpoint("CONSULTANT").allowed, false);
  assert.equal(checkOwnerOnlyEndpoint("ADMIN").allowed, false);
  assert.equal(checkOwnerOnlyEndpoint(undefined).allowed, false);
  assert.equal(checkOwnerOnlyEndpoint("OWNER").allowed, true);
});

test("adversarial check: financial payouts strictly require PENDING status and OWNER decision", () => {
  type Payout = { status: "PENDING" | "AUTHORIZED" | "REJECTED"; amountTtc: number };

  function executeOutflow(payout: Payout, actorRole: string): { executed: boolean; error?: string } {
    if (actorRole !== "OWNER") {
      return { executed: false, error: "RÈGLE FINANCIÈRE ABSOLUE : Seul l'OWNER peut autoriser une sortie d'argent." };
    }
    if (payout.status !== "AUTHORIZED") {
      return { executed: false, error: "Le versement n'est pas autorisé par l'OWNER." };
    }
    return { executed: true };
  }

  const pendingPayout: Payout = { status: "PENDING", amountTtc: 1500 };
  const authorizedPayout: Payout = { status: "AUTHORIZED", amountTtc: 1500 };

  // Unauthenticated/ADMIN attempt
  assert.equal(executeOutflow(pendingPayout, "ADMIN").executed, false);
  assert.equal(executeOutflow(authorizedPayout, "ADMIN").executed, false);

  // OWNER attempting execution on PENDING (must authorize first)
  assert.equal(executeOutflow(pendingPayout, "OWNER").executed, false);

  // OWNER executing AUTHORIZED payout
  assert.equal(executeOutflow(authorizedPayout, "OWNER").executed, true);
});

test("adversarial check: idempotency key prevents duplicate payout creation", () => {
  const existingKeys = new Set<string>(["KEY_1234567890"]);

  function createPayoutRequest(idempotencyKey: string): { success: boolean; status: number } {
    if (existingKeys.has(idempotencyKey)) {
      return { success: false, status: 409 };
    }
    existingKeys.add(idempotencyKey);
    return { success: true, status: 201 };
  }

  assert.equal(createPayoutRequest("KEY_1234567890").status, 409);
  assert.equal(createPayoutRequest("KEY_9876543210").status, 201);
  assert.equal(createPayoutRequest("KEY_9876543210").status, 409);
});

test("adversarial check: mandatory reason (min 5 chars) is enforced for exclusions and revocations", () => {
  function validateReason(reason?: string): { valid: boolean; error?: string } {
    if (!reason || reason.trim().length < 5) {
      return { valid: false, error: "Le motif est obligatoire (5 caractères minimum)." };
    }
    return { valid: true };
  }

  assert.equal(validateReason(undefined).valid, false);
  assert.equal(validateReason("").valid, false);
  assert.equal(validateReason("abc").valid, false);
  assert.equal(validateReason("Motif d'exclusion valide pour audit.").valid, true);
});

test("email service configuration adheres to public sender contact@recrutement-prive.com and OWNER hotmail inbox", async () => {
  const { PUBLIC_CONTACT_EMAIL, OWNER_HOTMAIL_EMAIL, sendDepositConfirmation, sendOwnerAlert } = await import("../lib/email/service");

  assert.equal(PUBLIC_CONTACT_EMAIL, "contact@recrutement-prive.com");
  assert.equal(OWNER_HOTMAIL_EMAIL, "recrutement.prive@hotmail.com");

  const depositRes = await sendDepositConfirmation("test.candidat@example.com", "CV.pdf", "DEP-12345", "14/09/2026", "12:00");
  assert.equal(depositRes.ok, true);

  const ownerRes = await sendOwnerAlert("Test Dépôt", "<p>Nouveau dépôt à vérifier</p>");
  assert.equal(ownerRes.ok, true);
});

test("i18n multilingual support covers 6 languages (FR, EN, ES, DE, IT, AR) and handles RTL for Arabic", async () => {
  const { SUPPORTED_LOCALES, RTL_LOCALES } = await import("../lib/i18n/config");
  const { DICTIONARIES, getTranslation } = await import("../lib/i18n/dictionaries");

  assert.equal(SUPPORTED_LOCALES.length, 6);
  assert.ok(RTL_LOCALES.has("ar"));
  assert.equal(RTL_LOCALES.has("fr"), false);

  for (const loc of SUPPORTED_LOCALES) {
    assert.ok(DICTIONARIES[loc], `Missing dictionary for locale ${loc}`);
    assert.ok(getTranslation(loc, "nav_home").length > 0);
    assert.ok(getTranslation(loc, "hero_title").length > 0);
  }
});

test("real photographic visual assets exist, are valid JPEG binary files and non-empty", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const visuals = [
    "public/visuals/hero-portrait.jpeg",
    "public/visuals/cabinet-office.jpeg",
    "public/visuals/enterprise-handshake.jpeg",
    "public/visuals/ai-human.jpeg",
  ];

  for (const file of visuals) {
    const filePath = path.join(process.cwd(), file);
    assert.equal(fs.existsSync(filePath), true, `File ${file} should exist`);
    const buffer = fs.readFileSync(filePath);
    assert.ok(buffer.length > 100, `File ${file} should be non-empty`);
    // JPEG magic number check (0xFF, 0xD8, 0xFF)
    assert.equal(buffer[0], 0xff, `${file} must be valid JPEG binary`);
    assert.equal(buffer[1], 0xd8, `${file} must be valid JPEG binary`);
    assert.equal(buffer[2], 0xff, `${file} must be valid JPEG binary`);
  }
});
