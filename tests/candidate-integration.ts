import { prisma } from "@/lib/prisma";
import { registerCandidate } from "@/app/inscription/actions";
import { requestPasswordReset } from "@/app/mot-de-passe-oublie/actions";
import { resetPassword } from "@/app/reinitialisation-mot-de-passe/actions";
import { verifyPassword, hashToken } from "@/lib/password-crypto";
import { randomBytes } from "crypto";

type Assert = (condition: unknown, message: string) => asserts condition;

const assert: Assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function main() {
  const suffix = Date.now().toString();
  const testEmail = `candidat.integration.${suffix}@example.test`;
  const initialPassword = "Recrutement@1";
  const updatedPassword = "NouveauPassword@2";

  const createdUserIds: string[] = [];

  try {
    console.log("1. Testing real candidate registration...");
    const regFormData = new FormData();
    regFormData.set("name", "Jean Dupont Integration");
    regFormData.set("email", testEmail);
    regFormData.set("password", initialPassword);
    regFormData.set("country", "France");
    regFormData.set("phonePrefix", "+33");
    regFormData.set("phone", "0612345678");

    const regResult = await registerCandidate(regFormData);
    assert(regResult.ok === true, `Registration failed: ${regResult.error}`);

    // Verify DB persistence
    const userInDb = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { candidat: true },
    });
    assert(userInDb !== null, "User not found in DB after registration");
    createdUserIds.push(userInDb.id);

    assert(userInDb.role === "CANDIDAT", "User role is not CANDIDAT");
    assert(userInDb.candidat !== null, "CandidateProfile was not created in DB");
    assert(userInDb.candidat.country === "France", "Candidate country mismatch");
    assert(userInDb.candidat.phonePrefix === "+33", "Candidate phonePrefix mismatch");

    // Real password hash verification
    assert(userInDb.passwordHash !== null, "Password hash is missing");
    const passMatches = await verifyPassword(initialPassword, userInDb.passwordHash);
    assert(passMatches === true, "Password verification failed with real hash");
    const wrongPassMatches = await verifyPassword("WrongPassword@1", userInDb.passwordHash);
    assert(wrongPassMatches === false, "Wrong password was incorrectly accepted");

    console.log("2. Testing duplicate email rejection...");
    const dupResult = await registerCandidate(regFormData);
    assert(dupResult.ok === false, "Duplicate email registration should have failed");
    assert(
      dupResult.error === "Un compte existe déjà avec cette adresse e-mail.",
      `Unexpected duplicate error: ${dupResult.error}`
    );

    console.log("3. Testing real password reset request & anti-enumeration...");
    // Request reset for existing user
    const reqFormData = new FormData();
    reqFormData.set("email", testEmail);
    const reqResult = await requestPasswordReset(reqFormData);
    assert(reqResult.ok === true, "Reset request failed");

    // Verify reset token record in DB
    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { email: testEmail },
      orderBy: { createdAt: "desc" },
    });
    assert(resetTokenRecord !== null, "PasswordResetToken record not found in DB");
    assert(resetTokenRecord.usedAt === null, "Token marked used immediately");
    assert(resetTokenRecord.expiresAt > new Date(), "Token created already expired");

    // Request reset for non-existing user (Anti-enumeration)
    const nonExistingEmail = `nonexistent.${suffix}@example.test`;
    const nonExistFormData = new FormData();
    nonExistFormData.set("email", nonExistingEmail);
    const nonExistResult = await requestPasswordReset(nonExistFormData);
    assert(nonExistResult.ok === true, "Anti-enumeration response should be ok");
    assert(
      nonExistResult.message === reqResult.message,
      "Anti-enumeration message mismatch between existing and non-existing email"
    );

    const nonExistTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { email: nonExistingEmail },
    });
    assert(nonExistTokenRecord === null, "Token should not be created for non-existing email");

    console.log("4. Testing real password reset execution & single-use...");
    // Create a known raw token linked to testEmail in DB to test resetPassword action
    const rawTestToken = randomBytes(32).toString("hex");
    const testTokenHash = hashToken(rawTestToken);
    await prisma.passwordResetToken.create({
      data: {
        email: testEmail,
        tokenHash: testTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const resetFormData = new FormData();
    resetFormData.set("token", rawTestToken);
    resetFormData.set("password", updatedPassword);

    const resetExecResult = await resetPassword(resetFormData);
    assert(resetExecResult.ok === true, `Reset password action failed: ${resetExecResult.error}`);

    // Verify password update in DB
    const updatedUserInDb = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert(updatedUserInDb !== null && updatedUserInDb.passwordHash !== null, "User missing after password update");
    assert(
      await verifyPassword(initialPassword, updatedUserInDb.passwordHash) === false,
      "Old password should be rejected after update"
    );
    assert(
      await verifyPassword(updatedPassword, updatedUserInDb.passwordHash) === true,
      "New password should be accepted after update"
    );

    // Verify token single-use
    const reuseResult = await resetPassword(resetFormData);
    assert(reuseResult.ok === false, "Single-use token reuse should have been rejected");
    assert(
      reuseResult.error === "Ce lien de réinitialisation a déjà été utilisé.",
      `Unexpected reuse error: ${reuseResult.error}`
    );

    console.log("5. Testing expired reset token handling...");
    const expiredRawToken = randomBytes(32).toString("hex");
    const expiredTokenHash = hashToken(expiredRawToken);
    await prisma.passwordResetToken.create({
      data: {
        email: testEmail,
        tokenHash: expiredTokenHash,
        expiresAt: new Date(Date.now() - 60000),
      },
    });

    const expiredFormData = new FormData();
    expiredFormData.set("token", expiredRawToken);
    expiredFormData.set("password", "AnotherValidPass@1");

    const expiredResult = await resetPassword(expiredFormData);
    assert(expiredResult.ok === false, "Expired token should have been rejected");
    assert(
      expiredResult.error === "Ce lien de réinitialisation a expiré.",
      `Unexpected expired error: ${expiredResult.error}`
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          scenario: "candidate-integration-test",
          checks: {
            candidateRegistration: true,
            duplicateEmailRejection: true,
            passwordHashVerification: true,
            resetRequestDbRecord: true,
            antiEnumerationConsistency: true,
            passwordResetExecution: true,
            tokenSingleUse: true,
            tokenExpirationEnforcement: true,
            reloginWithNewPassword: true,
          },
        },
        null,
        2
      )
    );
  } finally {
    if (createdUserIds.length > 0) {
      await prisma.passwordResetToken.deleteMany({
        where: { email: { in: [testEmail] } },
      });
      await prisma.candidateProfile.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
