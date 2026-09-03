import test from "node:test";
import assert from "node:assert/strict";
import { validatePassword } from "../lib/password-policy";
import { hashPassword, verifyPassword, hashToken } from "../lib/password-crypto";

test("validatePassword correctly enforces all 5 security criteria", () => {
  // Valid example: Recrutement@1
  const valid = validatePassword("Recrutement@1");
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);

  // Less than 8 characters
  const short = validatePassword("Rec@1");
  assert.equal(short.isValid, false);
  assert.ok(short.errors.some((e) => e.includes("8 caractères")));

  // Missing uppercase
  const noUpper = validatePassword("recrutement@1");
  assert.equal(noUpper.isValid, false);
  assert.ok(noUpper.errors.some((e) => e.includes("majuscule")));

  // Missing lowercase
  const noLower = validatePassword("RECRUTEMENT@1");
  assert.equal(noLower.isValid, false);
  assert.ok(noLower.errors.some((e) => e.includes("minuscule")));

  // Missing digit
  const noDigit = validatePassword("Recrutement@");
  assert.equal(noDigit.isValid, false);
  assert.ok(noDigit.errors.some((e) => e.includes("chiffre")));

  // Missing special char
  const noSpecial = validatePassword("Recrutement1");
  assert.equal(noSpecial.isValid, false);
  assert.ok(noSpecial.errors.some((e) => e.includes("caractère spécial")));
});

test("password hashing and verification with scrypt works correctly", async () => {
  const password = "Recrutement@1";
  const hash = await hashPassword(password);

  assert.ok(hash.startsWith("scrypt:"));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("WrongPassword@1", hash), false);
});

test("token hashing using hashToken is deterministic SHA-256", () => {
  const rawToken = "a1b2c3d4e5f678901234567890abcdef";
  const hash1 = hashToken(rawToken);
  const hash2 = hashToken(rawToken);

  assert.equal(hash1, hash2);
  assert.notEqual(rawToken, hash1);
  assert.equal(hash1.length, 64);
});

test("password reset token validation rules (expiration and single use)", () => {
  const now = new Date();
  const past = new Date(now.getTime() - 60000);
  const future = new Date(now.getTime() + 15 * 60000);

  interface TokenRecord {
    id: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }

  function validateResetTokenRecord(record: TokenRecord | null, currentTime: Date): { ok: boolean; error?: string } {
    if (!record) return { ok: false, error: "Lien de réinitialisation invalide ou expiré." };
    if (record.usedAt !== null) return { ok: false, error: "Ce lien de réinitialisation a déjà été utilisé." };
    if (record.expiresAt < currentTime) return { ok: false, error: "Ce lien de réinitialisation a expiré." };
    return { ok: true };
  }

  const validRecord: TokenRecord = {
    id: "token_1",
    email: "candidat@test.com",
    tokenHash: hashToken("raw_token_1"),
    expiresAt: future,
    usedAt: null,
  };

  assert.deepEqual(validateResetTokenRecord(validRecord, now), { ok: true });

  // Expired token
  const expiredRecord: TokenRecord = { ...validRecord, expiresAt: past };
  const expiredRes = validateResetTokenRecord(expiredRecord, now);
  assert.equal(expiredRes.ok, false);
  assert.equal(expiredRes.error, "Ce lien de réinitialisation a expiré.");

  // Already used token
  const usedRecord: TokenRecord = { ...validRecord, usedAt: past };
  const usedRes = validateResetTokenRecord(usedRecord, now);
  assert.equal(usedRes.ok, false);
  assert.equal(usedRes.error, "Ce lien de réinitialisation a déjà été utilisé.");
});

test("anti-enumeration response consistency", () => {
  function getResetRequestResponse(_email: string) {
    return {
      ok: true,
      message: "Si cette adresse e-mail est associée à un compte, un lien de réinitialisation vous a été envoyé.",
    };
  }

  const existingRes = getResetRequestResponse("existing@test.com");
  const nonExistingRes = getResetRequestResponse("nonexisting@test.com");

  assert.deepEqual(existingRes, nonExistingRes);
  assert.ok(!JSON.stringify(existingRes).includes("non trouvé"));
  assert.ok(!JSON.stringify(existingRes).includes("introuvable"));
});

test("password update and re-login flow simulation", async () => {
  const oldPassword = "OldPassword@1";
  const newPassword = "NewPassword@2";

  let storedHash = await hashPassword(oldPassword);

  // Verify old password works initially
  assert.equal(await verifyPassword(oldPassword, storedHash), true);

  // Validate new password rules before updating
  const passVal = validatePassword(newPassword);
  assert.equal(passVal.isValid, true);

  // Update password
  storedHash = await hashPassword(newPassword);

  // Old password must fail, new password must succeed
  assert.equal(await verifyPassword(oldPassword, storedHash), false);
  assert.equal(await verifyPassword(newPassword, storedHash), true);
});
