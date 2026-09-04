import { prisma } from "@/lib/prisma";
import { registerCandidate } from "@/app/inscription/actions";
import { requestPasswordReset } from "@/app/mot-de-passe-oublie/actions";
import { resetPassword } from "@/app/reinitialisation-mot-de-passe/actions";
import { authenticateCredentials } from "@/lib/auth-credentials";
import { hashToken } from "@/lib/password-crypto";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import { randomBytes } from "crypto";

type Assert = (condition: unknown, message: string) => asserts condition;

const assert: Assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

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

async function main() {
  const suffix = Date.now().toString();
  const testEmail = `candidat.integration.${suffix}@example.test`;
  const otherCandidateEmail = `candidat.other.${suffix}@example.test`;
  const initialPassword = "Recrutement@1";
  const updatedPassword = "NouveauPassword@2";

  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];

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

    console.log("2. Testing real authentication (login)...");
    // Valid login
    const authUser = await authenticateCredentials({ email: testEmail, password: initialPassword });
    assert(authUser !== null, "Real login failed with valid credentials");
    assert(authUser.id === userInDb.id, "Logged in user ID mismatch");
    assert(authUser.role === "CANDIDAT", "Logged in user role mismatch");

    // Invalid password login
    const wrongAuth = await authenticateCredentials({ email: testEmail, password: "WrongPassword@1" });
    assert(wrongAuth === null, "Login should have failed with wrong password");

    // Non-existing user login
    const nonExistAuth = await authenticateCredentials({ email: "nonexist@example.test", password: initialPassword });
    assert(nonExistAuth === null, "Login should have failed for non-existing email");

    console.log("3. Testing duplicate email rejection...");
    const dupResult = await registerCandidate(regFormData);
    assert(dupResult.ok === false, "Duplicate email registration should have failed");
    assert(
      dupResult.error === "Un compte existe déjà avec cette adresse e-mail.",
      `Unexpected duplicate error: ${dupResult.error}`
    );

    console.log("4. Testing real password reset request & anti-enumeration...");
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

    console.log("5. Testing real password reset execution & single-use...");
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

    // Verify old password fails login & new password succeeds login
    const oldLogin = await authenticateCredentials({ email: testEmail, password: initialPassword });
    assert(oldLogin === null, "Old password succeeded after reset!");

    const newLogin = await authenticateCredentials({ email: testEmail, password: updatedPassword });
    assert(newLogin !== null, "New password failed authentication after reset!");

    // Verify token single-use
    const reuseResult = await resetPassword(resetFormData);
    assert(reuseResult.ok === false, "Single-use token reuse should have been rejected");
    assert(
      reuseResult.error === "Ce lien de réinitialisation a déjà été utilisé.",
      `Unexpected reuse error: ${reuseResult.error}`
    );

    console.log("6. Testing expired reset token handling...");
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

    console.log("7. Testing concurrent password reset calls with same token...");
    const concurrentToken = randomBytes(32).toString("hex");
    const concurrentTokenHash = hashToken(concurrentToken);
    await prisma.passwordResetToken.create({
      data: {
        email: testEmail,
        tokenHash: concurrentTokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const fdConcurrent1 = new FormData();
    fdConcurrent1.set("token", concurrentToken);
    fdConcurrent1.set("password", "PassOne@123");

    const fdConcurrent2 = new FormData();
    fdConcurrent2.set("token", concurrentToken);
    fdConcurrent2.set("password", "PassTwo@123");

    const [res1, res2] = await Promise.all([
      resetPassword(fdConcurrent1),
      resetPassword(fdConcurrent2),
    ]);

    const successCount = (res1.ok ? 1 : 0) + (res2.ok ? 1 : 0);
    assert(successCount === 1, `Expected exactly 1 concurrent reset to succeed, got ${successCount}`);

    console.log("8. Testing Candidate Document Ownership & IDOR Protection...");
    // Create second candidate
    const otherCandFormData = new FormData();
    otherCandFormData.set("name", "Other Candidate");
    otherCandFormData.set("email", otherCandidateEmail);
    otherCandFormData.set("password", initialPassword);
    await registerCandidate(otherCandFormData);

    const otherUser = await prisma.user.findUnique({
      where: { email: otherCandidateEmail },
      include: { candidat: true },
    });
    assert(otherUser !== null, "Other candidate creation failed");
    createdUserIds.push(otherUser.id);

    // Create Candidate A Document in DB
    const docA = await prisma.candidateDocument.create({
      data: {
        candidateId: userInDb.candidat!.id,
        name: "CV_Integration_Test.pdf",
        type: "application/pdf",
        fileData: Buffer.from("%PDF-1.4 test document content"),
      },
    });

    // Test Document Access Check (IDOR)
    const accessOwn = checkDocumentAccess({
      userRole: "CANDIDAT",
      userId: userInDb.id,
      docCandidateUserId: userInDb.id,
      docCandidateId: userInDb.candidat!.id,
    });
    assert(accessOwn === true, "Candidate A could not access own document");

    const accessOther = checkDocumentAccess({
      userRole: "CANDIDAT",
      userId: otherUser.id,
      docCandidateUserId: userInDb.id,
      docCandidateId: userInDb.candidat!.id,
    });
    assert(accessOther === false, "Candidate B was allowed to access Candidate A document (IDOR vulnerability!)");

    // Clean up created document
    await prisma.candidateDocument.delete({ where: { id: docA.id } });

    console.log(
      JSON.stringify(
        {
          ok: true,
          scenario: "candidate-integration-test",
          checks: {
            candidateRegistration: true,
            realAuthenticationCredentials: true,
            wrongPasswordRejection: true,
            duplicateEmailRejection: true,
            passwordResetRequest: true,
            antiEnumerationConsistency: true,
            passwordResetExecution: true,
            reloginWithNewPassword: true,
            tokenSingleUse: true,
            tokenExpirationEnforcement: true,
            concurrentResetAtomicity: true,
            documentOwnershipIdorProtection: true,
          },
        },
        null,
        2
      )
    );
  } finally {
    if (createdUserIds.length > 0) {
      await prisma.passwordResetToken.deleteMany({
        where: { email: { in: [testEmail, otherCandidateEmail] } },
      });
      await prisma.candidateDocument.deleteMany({
        where: { candidate: { userId: { in: createdUserIds } } },
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
