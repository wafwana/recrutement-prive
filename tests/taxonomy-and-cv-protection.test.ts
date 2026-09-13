import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { runWithTestSession } from "@/auth";
import { GET as getCandidateProfile, PUT as putCandidateProfile } from "@/app/api/candidat/profil/route";
import { POST as createCompanyJob } from "@/app/api/entreprise/jobs/route";
import { GET as getCompanyJob, PUT as updateCompanyJob } from "@/app/api/entreprise/jobs/[jobId]/route";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import { hashPassword } from "@/lib/password-crypto";

test("candidate API taxonomy validation, persistence and strict absence of cvUrl in GET and PUT", async () => {
  if (!process.env.DATABASE_URL) return;

  const suffix = Date.now().toString();
  const candidateEmail = `cand.tax.${suffix}@example.test`;
  const passwordHash = await hashPassword("TestPass@123");

  const user = await prisma.user.create({
    data: {
      name: "Taxonomy Candidate",
      email: candidateEmail,
      passwordHash,
      role: "CANDIDAT",
      candidat: { create: { headline: "Developer", cvUrl: "https://secret.storage/raw-cv.pdf" } },
    },
    include: { candidat: true },
  });

  const parentCat = await prisma.jobCategory.create({
    data: { code: `PARENT_${suffix}`, name: { fr: "Tech", en: "Tech" }, isActive: true },
  });
  const subCat1 = await prisma.jobCategory.create({
    data: { code: `SUB1_${suffix}`, name: { fr: "Backend", en: "Backend" }, parentId: parentCat.id, isActive: true },
  });
  const otherParent = await prisma.jobCategory.create({
    data: { code: `OTHER_PARENT_${suffix}`, name: { fr: "Sales", en: "Sales" }, isActive: true },
  });
  const otherSub = await prisma.jobCategory.create({
    data: { code: `OTHER_SUB_${suffix}`, name: { fr: "Direct Sales", en: "Direct Sales" }, parentId: otherParent.id, isActive: true },
  });
  const inactiveCat = await prisma.jobCategory.create({
    data: { code: `INACTIVE_${suffix}`, name: { fr: "Inactive", en: "Inactive" }, isActive: false },
  });

  const session = { user: { id: user.id, role: "CANDIDAT" } };

  try {
    // 1. GET response must not expose cvUrl
    const getRes = await runWithTestSession(session, () => getCandidateProfile());
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal("cvUrl" in getBody, false, "GET /api/candidat/profil must not contain cvUrl");

    // 2. PUT with invalid primaryCategoryId (non-existent)
    const invalidPrimaryReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "Test", primaryCategoryId: "non-existent-id" }),
    });
    const resInvalidPrimary = await runWithTestSession(session, () => putCandidateProfile(invalidPrimaryReq));
    assert.equal(resInvalidPrimary.status, 400);
    const errBody1 = await resInvalidPrimary.json();
    assert.equal(errBody1.error, "La catégorie métier sélectionnée est invalide ou inactive.");

    // 3. PUT with inactive primaryCategoryId
    const inactivePrimaryReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "Test", primaryCategoryId: inactiveCat.id }),
    });
    const resInactivePrimary = await runWithTestSession(session, () => putCandidateProfile(inactivePrimaryReq));
    assert.equal(resInactivePrimary.status, 400);

    // 4. PUT with subcategories without primaryCategoryId
    const subNoPrimaryReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "Test", subCategoryIds: [subCat1.id] }),
    });
    const resSubNoPrimary = await runWithTestSession(session, () => putCandidateProfile(subNoPrimaryReq));
    assert.equal(resSubNoPrimary.status, 400);
    const errBody2 = await resSubNoPrimary.json();
    assert.equal(errBody2.error, "Sélectionner des sous-catégories requiert une catégorie principale.");

    // 5. PUT with subcategories belonging to a different parent category
    const subMismatchReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "Test", primaryCategoryId: parentCat.id, subCategoryIds: [otherSub.id] }),
    });
    const resSubMismatch = await runWithTestSession(session, () => putCandidateProfile(subMismatchReq));
    assert.equal(resSubMismatch.status, 400);
    const errBody3 = await resSubMismatch.json();
    assert.equal(errBody3.error, "Une ou plusieurs sous-catégories sélectionnées sont invalides.");

    // 6. Valid PUT persists primaryCategoryId and subCategoryIds and strictly protects cvUrl
    const validReq = new Request("http://localhost/api/candidat/profil", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        headline: "Lead Backend Developer",
        primaryCategoryId: parentCat.id,
        subCategoryIds: [subCat1.id],
      }),
    });
    const resValid = await runWithTestSession(session, () => putCandidateProfile(validReq));
    assert.equal(resValid.status, 200);
    const validBody = await resValid.json();
    assert.equal("cvUrl" in validBody, false, "PUT /api/candidat/profil response must not contain cvUrl");
    assert.equal(validBody.primaryCategoryId, parentCat.id);
    assert.deepEqual(validBody.subCategoryIds, [subCat1.id]);

    // Verify DB persistence
    const dbProfile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
    assert.equal(dbProfile?.primaryCategoryId, parentCat.id);
    assert.deepEqual(dbProfile?.subCategoryIds, [subCat1.id]);
  } finally {
    await prisma.candidateProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.jobCategory.deleteMany({
      where: { id: { in: [parentCat.id, subCat1.id, otherParent.id, otherSub.id, inactiveCat.id] } },
    });
  }
});

test("enterprise job creation and update taxonomy validation & multi-company isolation", async () => {
  if (!process.env.DATABASE_URL) return;

  const suffix = Date.now().toString();
  const passwordHash = await hashPassword("TestPass@123");

  const companyA = await prisma.company.create({ data: { name: `Company A ${suffix}` } });
  const companyB = await prisma.company.create({ data: { name: `Company B ${suffix}` } });

  const userA = await prisma.user.create({
    data: { name: "User A", email: `usera.${suffix}@example.test`, passwordHash, role: "ENTREPRISE" },
  });
  const userB = await prisma.user.create({
    data: { name: "User B", email: `userb.${suffix}@example.test`, passwordHash, role: "ENTREPRISE" },
  });

  await prisma.companyMember.create({ data: { companyId: companyA.id, userId: userA.id, role: "RECRUITER" } });
  await prisma.companyMember.create({ data: { companyId: companyB.id, userId: userB.id, role: "RECRUITER" } });

  const parentCat = await prisma.jobCategory.create({
    data: { code: `JPARENT_${suffix}`, name: { fr: "Finance", en: "Finance" }, isActive: true },
  });
  const subCat = await prisma.jobCategory.create({
    data: { code: `JSUB_${suffix}`, name: { fr: "Accounting", en: "Accounting" }, parentId: parentCat.id, isActive: true },
  });
  const otherParent = await prisma.jobCategory.create({
    data: { code: `JOTHERP_${suffix}`, name: { fr: "Legal", en: "Legal" }, isActive: true },
  });
  const otherSub = await prisma.jobCategory.create({
    data: { code: `JOTHERS_${suffix}`, name: { fr: "Corporate Legal", en: "Corporate Legal" }, parentId: otherParent.id, isActive: true },
  });

  const sessionA = { user: { id: userA.id, role: "ENTREPRISE" } };
  const sessionB = { user: { id: userB.id, role: "ENTREPRISE" } };

  try {
    // 1. Create Job with taxonomy via POST
    const createReq = new Request("http://localhost/api/entreprise/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: companyA.id,
        title: "Chef Comptable",
        status: "OPEN",
        jobCategoryId: parentCat.id,
        subCategoryId: subCat.id,
      }),
    });
    const resCreate = await runWithTestSession(sessionA, () => createCompanyJob(createReq));
    assert.equal(resCreate.status, 201);
    const createdJob = await resCreate.json();
    const jobId = createdJob.id;

    // 2. IDOR Protection: User B (Company B) trying to update Job of Company A -> 403
    const idorUpdateReq = new Request(`http://localhost/api/entreprise/jobs/${jobId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Hacked Job",
        status: "OPEN",
      }),
    });
    const params = Promise.resolve({ jobId });
    const resIdor = await runWithTestSession(sessionB, () => updateCompanyJob(idorUpdateReq, { params }));
    assert.equal(resIdor.status, 403);

    // 3. Update Job with invalid parent category
    const updateInvalidParentReq = new Request(`http://localhost/api/entreprise/jobs/${jobId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Chef Comptable Senior",
        status: "OPEN",
        jobCategoryId: "invalid-category-id",
      }),
    });
    const resInvalidParent = await runWithTestSession(sessionA, () => updateCompanyJob(updateInvalidParentReq, { params }));
    assert.equal(resInvalidParent.status, 400);

    // 4. Update Job with child mismatch (subCategory belonging to otherParent)
    const updateMismatchReq = new Request(`http://localhost/api/entreprise/jobs/${jobId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Chef Comptable Senior",
        status: "OPEN",
        jobCategoryId: parentCat.id,
        subCategoryId: otherSub.id,
      }),
    });
    const resMismatch = await runWithTestSession(sessionA, () => updateCompanyJob(updateMismatchReq, { params }));
    assert.equal(resMismatch.status, 400);

    // 5. Valid Job Taxonomy Update
    const updateValidReq = new Request(`http://localhost/api/entreprise/jobs/${jobId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Directeur Juridique",
        status: "OPEN",
        jobCategoryId: otherParent.id,
        subCategoryId: otherSub.id,
      }),
    });
    const resValidUpdate = await runWithTestSession(sessionA, () => updateCompanyJob(updateValidReq, { params }));
    assert.equal(resValidUpdate.status, 200);
    const updatedJob = await resValidUpdate.json();
    assert.equal(updatedJob.jobCategoryId, otherParent.id);
    assert.equal(updatedJob.subCategoryId, otherSub.id);

    // Verify GET endpoint returns taxonomy relations
    const getJobReq = new Request(`http://localhost/api/entreprise/jobs/${jobId}`);
    const resGetJob = await runWithTestSession(sessionA, () => getCompanyJob(getJobReq, { params }));
    assert.equal(resGetJob.status, 200);
    const getJobBody = await resGetJob.json();
    assert.equal(getJobBody.jobCategory?.id, otherParent.id);
    assert.equal(getJobBody.subCategory?.id, otherSub.id);
  } finally {
    await prisma.recruitmentHistory.deleteMany({ where: { actorUserId: { in: [userA.id, userB.id] } } });
    await prisma.job.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.companyMember.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.jobCategory.deleteMany({
      where: { id: { in: [parentCat.id, subCat.id, otherParent.id, otherSub.id] } },
    });
  }
});

test("unit test: taxonomy matching scoring 15/8/0 rules", () => {
  // Case 1: Exact subcategory match yields 15 points (EXACT_SUBCATEGORY)
  const exactMatch = matchCandidateToJob(
    { primaryCategoryCode: "FINANCE", subCategoryCodes: ["ACCOUNTING"] },
    { categoryCode: "FINANCE", subCategoryCode: "ACCOUNTING" }
  );
  assert.equal(exactMatch.categoryScore, 15);
  assert.equal(exactMatch.categoryMatchLevel, "EXACT_SUBCATEGORY");

  // Case 2: Primary category match without subcategory match yields 8 points (PARENT_CATEGORY)
  const parentMatch = matchCandidateToJob(
    { primaryCategoryCode: "FINANCE", subCategoryCodes: ["TAXATION"] },
    { categoryCode: "FINANCE", subCategoryCode: "ACCOUNTING" }
  );
  assert.equal(parentMatch.categoryScore, 8);
  assert.equal(parentMatch.categoryMatchLevel, "PARENT_CATEGORY");

  // Case 3: Primary category CAN NEVER yield EXACT_SUBCATEGORY even if primary code matches subcategory code
  const primaryNeverSubMatch = matchCandidateToJob(
    { primaryCategoryCode: "ACCOUNTING", subCategoryCodes: [] },
    { categoryCode: "FINANCE", subCategoryCode: "ACCOUNTING" }
  );
  assert.notEqual(primaryNeverSubMatch.categoryMatchLevel, "EXACT_SUBCATEGORY");

  // Case 4: Mismatch yields 0 points (NONE)
  const noMatch = matchCandidateToJob(
    { primaryCategoryCode: "IT", subCategoryCodes: ["DEVELOPMENT"] },
    { categoryCode: "FINANCE", subCategoryCode: "ACCOUNTING" }
  );
  assert.equal(noMatch.categoryScore, 0);
  assert.equal(noMatch.categoryMatchLevel, "NONE");
});

test("unit test: candidate anonymization & unlock financial condition enforcement", () => {
  assert.equal(isIdentityUnlocked("CANDIDAT_ANONYME", "CONFIRMED"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "PENDING"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "CONFIRMED"), true);
});
