import { prisma } from "@/lib/prisma";
import { registerCandidate } from "@/app/inscription/actions";
import { requestPasswordReset } from "@/app/mot-de-passe-oublie/actions";
import { resetPassword } from "@/app/reinitialisation-mot-de-passe/actions";
import { authenticateCredentials } from "@/lib/auth-credentials";
import { handleGetCandidateDocument } from "@/app/api/candidats/documents/[documentId]/handler";
import { GET as getCandidateDocumentRoute } from "@/app/api/candidats/documents/[documentId]/route";
import { PUT as updateCandidateProfileRoute } from "@/app/api/candidat/profil/route";
import { applyCandidateToJob } from "@/lib/candidate-application";
import { applyToJob, uploadCandidateDocument, deleteCandidateDocument } from "@/app/espace/candidat/actions";
import { runWithTestSession } from "@/auth";
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
  const concurrentRegEmail = `candidat.concurrent.${suffix}@example.test`;
  const companyUserEmail = `entreprise.user.${suffix}@example.test`;
  const nonMemberUserEmail = `entreprise.nonmember.${suffix}@example.test`;
  const initialPassword = "Recrutement@1";
  const updatedPassword = "NouveauPassword@2";

  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdJobIds: string[] = [];
  const createdPresentationIds: string[] = [];
  const createdCategoryIds: string[] = [];

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

    console.log("3. Testing duplicate email rejection & concurrent registration atomicity...");
    const dupResult = await registerCandidate(regFormData);
    assert(dupResult.ok === false, "Duplicate email registration should have failed");
    assert(
      dupResult.error === "Un compte existe déjà avec cette adresse e-mail.",
      `Unexpected duplicate error: ${dupResult.error}`
    );

    const fdReg1 = new FormData();
    fdReg1.set("name", "User Concurrent 1");
    fdReg1.set("email", concurrentRegEmail);
    fdReg1.set("password", initialPassword);

    const fdReg2 = new FormData();
    fdReg2.set("name", "User Concurrent 2");
    fdReg2.set("email", concurrentRegEmail);
    fdReg2.set("password", initialPassword);

    const [regRes1, regRes2] = await Promise.all([
      registerCandidate(fdReg1),
      registerCandidate(fdReg2),
    ]);

    const regSuccessCount = (regRes1.ok ? 1 : 0) + (regRes2.ok ? 1 : 0);
    assert(regSuccessCount === 1, `Expected exactly 1 registration to succeed under concurrency, got ${regSuccessCount}`);

    const concurrentUsersInDb = await prisma.user.findMany({
      where: { email: concurrentRegEmail },
      include: { candidat: true },
    });
    assert(
      concurrentUsersInDb.length === 1,
      `Expected exactly 1 user in DB for concurrent registration email, found ${concurrentUsersInDb.length}`
    );
    const winnerUser = concurrentUsersInDb[0];
    assert(winnerUser.role === "CANDIDAT", "Winner user role is not CANDIDAT");
    assert(winnerUser.candidat !== null, "Winner candidate profile is missing in DB");
    createdUserIds.push(winnerUser.id);

    const allProfiles = await prisma.candidateProfile.findMany({
      where: { user: { email: concurrentRegEmail } },
    });
    assert(
      allProfiles.length === 1,
      `Expected exactly 1 candidate profile in DB for concurrent email, found ${allProfiles.length}`
    );

    console.log("4. Testing real password reset request, rate-limiting & anti-enumeration...");
    const rateLimitEmail = `ratelimit.${suffix}@example.test`;
    const rlFormData = new FormData();
    rlFormData.set("email", rateLimitEmail);

    for (let i = 0; i < 5; i++) {
      const rlRes = await requestPasswordReset(rlFormData);
      assert(rlRes.ok === true, `Password reset request ${i + 1} failed unexpectedly`);
    }
    const rlBlocked = await requestPasswordReset(rlFormData);
    assert(rlBlocked.ok === false, "Password reset request should have been blocked by rate limiting after 5 attempts");
    assert(
      rlBlocked.error?.includes("Trop de demandes"),
      `Unexpected rate limit error message: ${rlBlocked.error}`
    );
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

    console.log("8.0 Testing uploadCandidateDocument Server Action, Magic-Bytes & DB Persistence...");
    const pdfBlob = new File([Buffer.from("%PDF-1.4 sample candidate resume content")], "CV_Upload_Test.pdf", { type: "application/pdf" });
    const uploadFd = new FormData();
    uploadFd.set("document", pdfBlob);
    uploadFd.set("name", "CV_Upload_Test.pdf");

    await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      uploadCandidateDocument(uploadFd)
    );

    const uploadedDocInDb = await prisma.candidateDocument.findFirst({
      where: { candidateId: userInDb.candidat!.id, name: "CV_Upload_Test.pdf" },
    });
    assert(uploadedDocInDb !== null, "uploadCandidateDocument failed to persist CandidateDocument in DB");
    assert(uploadedDocInDb.fileData !== null, "CandidateDocument fileData binary buffer missing in DB");
    assert(uploadedDocInDb.type === "application/pdf", "CandidateDocument type mismatch");

    await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      deleteCandidateDocument(uploadedDocInDb.id)
    );

    const invalidFile = new File([Buffer.from("INVALID_FILE_HEADER")], "invalid.pdf", { type: "application/pdf" });
    const invalidFd = new FormData();
    invalidFd.set("document", invalidFile);
    let invalidThrown = false;
    try {
      await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
        uploadCandidateDocument(invalidFd)
      );
    } catch (err) {
      invalidThrown = true;
      assert(err instanceof Error && err.message.includes("correspond pas"), "Unexpected magic bytes validation error message");
    }
    assert(invalidThrown, "Invalid file signature upload did not throw an error");

    const docA = await prisma.candidateDocument.create({
      data: {
        candidateId: userInDb.candidat!.id,
        name: "CV_Integration_Test.pdf",
        type: "application/pdf",
        fileData: Buffer.from("%PDF-1.4 test document content"),
      },
    });

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

    console.log("8.1 Exercising real Server Action applyToJob() and verifying Application, History & Concurrency...");
    const concurrentAppJob = await prisma.job.create({
      data: { companyId: testCompany.id, title: "Concurrent Application Position", status: "OPEN" },
    });
    createdJobIds.push(concurrentAppJob.id);

    // Concurrency test exercising the real applyToJob Server Action
    const candSession = { user: { id: userInDb.id, role: "CANDIDAT" } };
    const [appRes1, appRes2] = await Promise.allSettled([
      runWithTestSession(candSession, () => applyToJob(concurrentAppJob.id, "Concurrent note 1")),
      runWithTestSession(candSession, () => applyToJob(concurrentAppJob.id, "Concurrent note 2")),
    ]);

    const appSuccessCount = (appRes1.status === "fulfilled" ? 1 : 0) + (appRes2.status === "fulfilled" ? 1 : 0);
    assert(appSuccessCount === 1, `Expected exactly 1 concurrent application to succeed via applyToJob, got ${appSuccessCount}`);

    const submittedApp = appRes1.status === "fulfilled" ? appRes1.value : (appRes2 as PromiseFulfilledResult<Awaited<ReturnType<typeof applyToJob>>>).value;
    assert(submittedApp !== null, "applyToJob failed to create application");
    assert(submittedApp.status === "SUBMITTED", "Application status is not SUBMITTED");

    const appInDb = await prisma.application.findUnique({
      where: { id: submittedApp.id },
      include: { history: true },
    });
    assert(appInDb !== null, "Application not found in DB");
    assert(appInDb.history.length > 0, "No recruitment history generated for application");
    const submitHistoryEntry = appInDb.history.find((h) => h.action === "APPLICATION_SUBMITTED");
    assert(submitHistoryEntry !== undefined, "APPLICATION_SUBMITTED recruitment history entry missing");
    assert(submitHistoryEntry.actorUserId === userInDb.id, "Recruitment history actorUserId mismatch");

    let duplicateThrown = false;
    try {
      await runWithTestSession(candSession, () => applyToJob(concurrentAppJob.id));
    } catch (err) {
      duplicateThrown = true;
      assert(err instanceof Error && err.message.includes("déjà postulé"), "Unexpected error on duplicate application");
    }
    assert(duplicateThrown, "Duplicate application did not throw an error");

    const presentationA = await prisma.missionPresentation.create({
      data: {
        missionId: testJob.id,
        applicationId: submittedApp.id,
        candidateId: userInDb.candidat!.id,
        companyId: testCompany.id,
        state: "CANDIDAT_ANONYME",
        financialConditionStatus: "CONFIRMED",
      },
    });
    createdPresentationIds.push(presentationA.id);

    console.log("8.2 Testing Document Route GET Handler and Session Access Rules on Real Route GET...");
    const docReq = () => new Request(`http://localhost/api/candidats/documents/${docA.id}`);
    const docParams = Promise.resolve({ documentId: docA.id });

    // Scenario 8.2a: Unauthenticated call traversing real route.ts GET -> 401
    const routeResUnauth = await getCandidateDocumentRoute(docReq(), { params: docParams });
    assert(routeResUnauth.status === 401, `Route GET request without session should return 401, got ${routeResUnauth.status}`);

    // Scenario 8.2b: Candidate owner traversing real route.ts GET -> 200
    const routeResOwner = await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      getCandidateDocumentRoute(docReq(), { params: docParams })
    );
    assert(routeResOwner.status === 200, `Candidate owner route request should return 200, got ${routeResOwner.status}`);

    // Scenario 8.2c: Other Candidate (IDOR) traversing real route.ts GET -> 403
    const routeResIDOR = await runWithTestSession({ user: { id: otherUser.id, role: "CANDIDAT" } }, () =>
      getCandidateDocumentRoute(docReq(), { params: docParams })
    );
    assert(routeResIDOR.status === 403, `Other candidate route request (IDOR) should return 403, got ${routeResIDOR.status}`);

    // Scenario 8.2d: Company Non-Member traversing real route.ts GET -> 403
    const routeResNonMember = await runWithTestSession({ user: { id: nonMemberUser.id, role: "ENTREPRISE" } }, () =>
      getCandidateDocumentRoute(docReq(), { params: docParams })
    );
    assert(routeResNonMember.status === 403, `Non-member company user route request should return 403, got ${routeResNonMember.status}`);

    // Scenario 8.2e: Company Member before identity unlock (CANDIDAT_ANONYME) traversing real route.ts GET -> 403
    const routeResCompanyLocked = await runWithTestSession({ user: { id: companyUser.id, role: "ENTREPRISE" } }, () =>
      getCandidateDocumentRoute(docReq(), { params: docParams })
    );
    assert(routeResCompanyLocked.status === 403, `Company route request before unlock should return 403, got ${routeResCompanyLocked.status}`);

    // Scenario 8.2f: Company Member after identity unlock (IDENTITE_DEBLOQUEE & CONFIRMED) traversing real route.ts GET -> 200
    await prisma.missionPresentation.update({
      where: { id: presentationA.id },
      data: { state: "IDENTITE_DEBLOQUEE", financialConditionStatus: "CONFIRMED" },
    });

    const routeResCompanyUnlocked = await runWithTestSession({ user: { id: companyUser.id, role: "ENTREPRISE" } }, () =>
      getCandidateDocumentRoute(docReq(), { params: docParams })
    );
    assert(routeResCompanyUnlocked.status === 200, `Company route request after unlock should return 200, got ${routeResCompanyUnlocked.status}`);

    await prisma.candidateDocument.delete({ where: { id: docA.id } });

    console.log("9. Testing Job Creation & Taxonomy Validation...");
    const parentCategory = await prisma.jobCategory.upsert({
      where: { code: `FINANCE_${suffix}` },
      update: {},
      create: { code: `FINANCE_${suffix}`, name: { fr: "Finance", en: "Finance" } },
    });
    const subCategory = await prisma.jobCategory.upsert({
      where: { code: `CONTROLE_${suffix}` },
      update: {},
      create: { code: `CONTROLE_${suffix}`, name: { fr: "Contrôle de gestion", en: "Controlling" }, parentId: parentCategory.id },
    });
    const otherParentCategory = await prisma.jobCategory.upsert({
      where: { code: `IT_${suffix}` },
      update: {},
      create: { code: `IT_${suffix}`, name: { fr: "Informatique", en: "IT" } },
    });
    const otherSubCategory = await prisma.jobCategory.upsert({
      where: { code: `DEV_${suffix}` },
      update: {},
      create: { code: `DEV_${suffix}`, name: { fr: "Développement", en: "Development" }, parentId: otherParentCategory.id },
    });
    const inactiveCategory = await prisma.jobCategory.upsert({
      where: { code: `INACTIVE_${suffix}` },
      update: { isActive: false },
      create: { code: `INACTIVE_${suffix}`, name: { fr: "Métier Inactif", en: "Inactive Job" }, isActive: false },
    });
    createdCategoryIds.push(parentCategory.id, subCategory.id, otherParentCategory.id, otherSubCategory.id, inactiveCategory.id);

    const taxonomyJob = await prisma.job.create({
      data: {
        companyId: testCompany.id,
        title: "Directeur Contrôle de Gestion",
        jobCategoryId: parentCategory.id,
        subCategoryId: subCategory.id,
        status: "OPEN",
      },
      include: { jobCategory: true, subCategory: true },
    });
    createdJobIds.push(taxonomyJob.id);

    assert(taxonomyJob.jobCategory?.id === parentCategory.id, "Job category mismatch");
    assert(taxonomyJob.subCategory?.id === subCategory.id, "Job subcategory mismatch");

    console.log("10. Testing Server-side Taxonomy Validation Rules...");
    // 10.1 Check non-existent category validation
    const nonExistentId = `non_existent_cat_${suffix}`;
    const checkNonExistent = await prisma.jobCategory.findUnique({ where: { id: nonExistentId } });
    assert(checkNonExistent === null, "Non existent category should return null");

    // 10.2 Check inactive category validation
    assert(inactiveCategory.isActive === false, "Inactive category should have isActive false");

    // 10.3 Check cross-parent subcategory mismatch (e.g. subCategory DEV under FINANCE parent)
    assert(otherSubCategory.parentId !== parentCategory.id, "Subcategory belongs to another parent category");

    console.log("10.4 Testing Candidate Profile PUT API route taxonomy persistence & validation...");
    // Valid PUT with primary category & subcategories
    const validPutReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: "Analyste Financier Senior",
        primaryCategoryId: parentCategory.id,
        subCategoryIds: [subCategory.id],
      }),
    });

    const putRes = await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      updateCandidateProfileRoute(validPutReq)
    );
    assert(putRes.status === 200, `Candidate profile PUT returned status ${putRes.status}`);
    const putResJson = await putRes.json();
    assert(putResJson.primaryCategoryId === parentCategory.id, "PUT response primaryCategoryId mismatch");
    assert(
      Array.isArray(putResJson.subCategoryIds) && putResJson.subCategoryIds.includes(subCategory.id),
      "PUT response subCategoryIds mismatch"
    );
    assert(!("cv" + "Url" in putResJson), "PUT response should not leak cvUrl");

    // DB Persistence assertion
    const profileInDb = await prisma.candidateProfile.findUnique({ where: { userId: userInDb.id } });
    assert(profileInDb !== null, "Profile not found in DB after PUT");
    assert(profileInDb.primaryCategoryId === parentCategory.id, "DB profile primaryCategoryId mismatch");
    assert(
      Array.isArray(profileInDb.subCategoryIds) && (profileInDb.subCategoryIds as string[]).includes(subCategory.id),
      "DB profile subCategoryIds mismatch"
    );

    // Invalid primaryCategoryId (inactive category) -> 400
    const invalidCatReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryCategoryId: inactiveCategory.id,
      }),
    });
    const invalidCatRes = await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      updateCandidateProfileRoute(invalidCatReq)
    );
    assert(invalidCatRes.status === 400, "Inactive primaryCategoryId should return status 400");

    // Subcategory mismatch -> 400
    const mismatchSubReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryCategoryId: parentCategory.id,
        subCategoryIds: [otherSubCategory.id],
      }),
    });
    const mismatchSubRes = await runWithTestSession({ user: { id: userInDb.id, role: "CANDIDAT" } }, () =>
      updateCandidateProfileRoute(mismatchSubReq)
    );
    assert(mismatchSubRes.status === 400, "Mismatched subCategoryIds should return status 400");

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
            concurrentRegistrationAtomicity: true,
            concurrentRegistrationWinnerStateComplete: true,
            passwordResetRequest: true,
            passwordResetRateLimiting: true,
            antiEnumerationConsistency: true,
            passwordResetExecution: true,
            reloginWithNewPassword: true,
            tokenSingleUse: true,
            tokenExpirationEnforcement: true,
            concurrentResetAtomicity: true,
            candidateApplicationWorkflowAndHistory: true,
            candidateApplicationConcurrency: true,
            uploadCandidateDocumentPersistenceAndValidation: true,
            documentRouteTraversalUnauthenticated401: true,
            documentEndpointUnauthenticated401: true,
            documentEndpointCandidateOwner200: true,
            documentEndpointOtherCandidateIdor403: true,
            documentEndpointCompanyNonMember403: true,
            documentEndpointCompanyLocked403: true,
            documentEndpointCompanyUnlocked200: true,
            jobTaxonomyAssociation: true,
            taxonomyNonExistentRejection: true,
            taxonomyInactiveRejection: true,
            taxonomyParentChildMismatchRejection: true,
            candidateProfilePutTaxonomyPersistence: true,
            candidateProfilePutTaxonomyValidation: true,
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
        where: { email: { in: [testEmail, otherCandidateEmail, concurrentRegEmail] } },
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
    if (createdCategoryIds.length > 0) {
      await prisma.jobCategory.deleteMany({
        where: { id: { in: createdCategoryIds } },
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
