import { prisma } from "@/lib/prisma";
import { registerCandidate } from "@/app/inscription/actions";
import { requestPasswordReset } from "@/app/mot-de-passe-oublie/actions";
import { resetPassword } from "@/app/reinitialisation-mot-de-passe/actions";
import { authenticateCredentials } from "@/lib/auth-credentials";
import { handleGetCandidateDocument } from "@/app/api/candidats/documents/[documentId]/handler";
import { hashToken, hashPassword } from "@/lib/password-crypto";
import { randomBytes } from "crypto";

type Assert = (condition: unknown, message: string) => asserts condition;

const assert: Assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function main() {
  const suffix = Date.now().toString();
  const testEmail = `candidat.integration.${suffix}@example.test`;
  const otherCandidateEmail = `candidat.other.${suffix}@example.test`;
  const companyUserEmail = `entreprise.user.${suffix}@example.test`;
  const nonMemberUserEmail = `entreprise.nonmember.${suffix}@example.test`;
  const initialPassword = "Recrutement@1";
  const updatedPassword = "NouveauPassword@2";

  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdJobIds: string[] = [];
  const createdPresentationIds: string[] = [];

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

    console.log("2. Testing real credentials authentication (login)...");
    const authUser = await authenticateCredentials({ email: testEmail, password: initialPassword });
    assert(authUser !== null, "Real login failed with valid credentials");
    assert(authUser.id === userInDb.id, "Logged in user ID mismatch");
    assert(authUser.role === "CANDIDAT", "Logged in user role mismatch");

    const wrongAuth = await authenticateCredentials({ email: testEmail, password: "WrongPassword@1" });
    assert(wrongAuth === null, "Login should have failed with wrong password");

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

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { email: testEmail },
      orderBy: { createdAt: "desc" },
    });
    assert(resetTokenRecord !== null, "PasswordResetToken record not found in DB");
    assert(resetTokenRecord.usedAt === null, "Token marked used immediately");
    assert(resetTokenRecord.expiresAt > new Date(), "Token created already expired");

    const nonExistingEmail = `nonexistent.${suffix}@example.test`;
    const nonExistFormData = new FormData();
    nonExistFormData.set("email", nonExistingEmail);
    const nonExistResult = await requestPasswordReset(nonExistFormData);
    assert(nonExistResult.ok === true, "Anti-enumeration response should be ok");
    assert(
      nonExistResult.message === reqResult.message,
      "Anti-enumeration message mismatch between existing and non-existing email"
    );

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

    const oldLogin = await authenticateCredentials({ email: testEmail, password: initialPassword });
    assert(oldLogin === null, "Old password succeeded after reset!");

    const newLogin = await authenticateCredentials({ email: testEmail, password: updatedPassword });
    assert(newLogin !== null, "New password failed authentication after reset!");

    const reuseResult = await resetPassword(resetFormData);
    assert(reuseResult.ok === false, "Single-use token reuse should have been rejected");

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

    console.log("8. Testing Document Endpoint Authorization & IDOR on Real Route (/api/candidats/documents/[documentId])...");
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

    // Create Company and Members in DB
    const defaultPasswordHash = await hashPassword(initialPassword);
    const companyUser = await prisma.user.create({
      data: { name: "Company Recruiter", email: companyUserEmail, passwordHash: defaultPasswordHash, role: "ENTREPRISE" },
    });
    const nonMemberUser = await prisma.user.create({
      data: { name: "Non Member Recruiter", email: nonMemberUserEmail, passwordHash: defaultPasswordHash, role: "ENTREPRISE" },
    });
    createdUserIds.push(companyUser.id, nonMemberUser.id);

    const testCompany = await prisma.company.create({ data: { name: `Test Company ${suffix}` } });
    createdCompanyIds.push(testCompany.id);

    await prisma.companyMember.create({
      data: { companyId: testCompany.id, userId: companyUser.id, role: "RECRUITER" },
    });

    const testJob = await prisma.job.create({
      data: { companyId: testCompany.id, title: "Test Engineer Position", status: "OPEN" },
    });
    createdJobIds.push(testJob.id);

    const applicationA = await prisma.application.create({
      data: {
        candidateId: userInDb.candidat!.id,
        userId: userInDb.id,
        jobId: testJob.id,
        status: "SUBMITTED",
      },
    });

    const presentationA = await prisma.missionPresentation.create({
      data: {
        missionId: testJob.id,
        applicationId: applicationA.id,
        candidateId: userInDb.candidat!.id,
        companyId: testCompany.id,
        state: "CANDIDAT_ANONYME",
        financialConditionStatus: "CONFIRMED",
      },
    });
    createdPresentationIds.push(presentationA.id);

    // Scenario 8.1: Unauthenticated request -> expect 401
    const resUnauth = await handleGetCandidateDocument(docA.id, null);
    assert(resUnauth.status === 401, `Unauthenticated request should return 401, got ${resUnauth.status}`);

    // Scenario 8.2: Candidate owner request -> expect 200
    const resOwner = await handleGetCandidateDocument(docA.id, { user: { id: userInDb.id, role: "CANDIDAT" } });
    assert(resOwner.status === 200, `Candidate owner request should return 200, got ${resOwner.status}`);

    // Scenario 8.3: Other Candidate request (IDOR) -> expect 403
    const resOtherCand = await handleGetCandidateDocument(docA.id, { user: { id: otherUser.id, role: "CANDIDAT" } });
    assert(resOtherCand.status === 403, `Other candidate request (IDOR) should return 403, got ${resOtherCand.status}`);

    // Scenario 8.4: Company Non-Member request -> expect 403
    const resNonMember = await handleGetCandidateDocument(docA.id, { user: { id: nonMemberUser.id, role: "ENTREPRISE" } });
    assert(resNonMember.status === 403, `Non-member company user request should return 403, got ${resNonMember.status}`);

    // Scenario 8.5: Company Member request before identity unlock (CANDIDAT_ANONYME) -> expect 403
    const resCompanyLocked = await handleGetCandidateDocument(docA.id, { user: { id: companyUser.id, role: "ENTREPRISE" } });
    assert(resCompanyLocked.status === 403, `Company request before identity unlock should return 403, got ${resCompanyLocked.status}`);

    // Scenario 8.6: Company Member request after identity unlock (IDENTITE_DEBLOQUEE & CONFIRMED) -> expect 200
    await prisma.missionPresentation.update({
      where: { id: presentationA.id },
      data: { state: "IDENTITE_DEBLOQUEE", financialConditionStatus: "CONFIRMED" },
    });

    const resCompanyUnlocked = await handleGetCandidateDocument(docA.id, { user: { id: companyUser.id, role: "ENTREPRISE" } });
    assert(resCompanyUnlocked.status === 200, `Company request after identity unlock should return 200, got ${resCompanyUnlocked.status}`);

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
            documentEndpointUnauthenticated401: true,
            documentEndpointCandidateOwner200: true,
            documentEndpointOtherCandidateIdor403: true,
            documentEndpointCompanyNonMember403: true,
            documentEndpointCompanyLocked403: true,
            documentEndpointCompanyUnlocked200: true,
          },
        },
        null,
        2
      )
    );
  } finally {
    if (createdPresentationIds.length > 0) {
      await prisma.missionPresentation.deleteMany({
        where: { id: { in: createdPresentationIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.passwordResetToken.deleteMany({
        where: { email: { in: [testEmail, otherCandidateEmail] } },
      });
      await prisma.application.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.job.deleteMany({
        where: { id: { in: createdJobIds } },
      });
      await prisma.companyMember.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
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
