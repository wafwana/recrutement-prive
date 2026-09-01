import assert from "node:assert/strict";
import test from "node:test";
import { isIdentityUnlocked } from "../lib/mission-lock";
import { prisma } from "../lib/prisma";
import { hashE2EPassword } from "../lib/e2e-password";

test("unit test: candidate identity remains locked for all pre-unlock presentation states", () => {
  const preUnlockStates = [
    "MISSION_ACTIVE",
    "CANDIDAT_ANONYME",
    "CONDITION_FINANCIERE_EN_ATTENTE",
    "PAIEMENT_OU_CONDITION_CONFIRME",
    "MISSION_TERMINEE",
  ];

  for (const state of preUnlockStates) {
    assert.equal(isIdentityUnlocked(state, "PENDING"), false, `State ${state} with PENDING financial condition must be locked`);
    assert.equal(isIdentityUnlocked(state, "CONFIRMED"), false, `State ${state} with CONFIRMED financial condition must be locked`);
  }
});

test("unit test: candidate identity is unlocked ONLY when state is IDENTITE_DEBLOQUEE and financialConditionStatus is CONFIRMED", () => {
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "CONFIRMED"), true);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "PENDING"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "FAILED"), false);
  assert.equal(isIdentityUnlocked("IDENTITE_DEBLOQUEE", "EXPIRED"), false);
});

test("integration test: company candidate isolation, mission lifecycle, and recruitment follow-up", async () => {
  if (!process.env.DATABASE_URL) {
    console.log("Skipping DB integration test: DATABASE_URL not configured in environment");
    return;
  }

  const suffix = Date.now().toString();
  const emails = {
    enterpriseA: `co.a.${suffix}@example.test`,
    enterpriseB: `co.b.${suffix}@example.test`,
    candidate: `cand.${suffix}@example.test`,
    consultant: `cons.${suffix}@example.test`,
  };

  const passwordHash = await hashE2EPassword("TestPassword-2026!");
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];

  try {
    const userA = await prisma.user.create({
      data: { name: "Recruiter Co A", email: emails.enterpriseA, passwordHash, role: "ENTREPRISE" },
    });
    createdUserIds.push(userA.id);

    const userB = await prisma.user.create({
      data: { name: "Recruiter Co B", email: emails.enterpriseB, passwordHash, role: "ENTREPRISE" },
    });
    createdUserIds.push(userB.id);

    const candidateUser = await prisma.user.create({
      data: {
        name: "Jean Dupont",
        email: emails.candidate,
        passwordHash,
        role: "CANDIDAT",
        candidat: { create: { headline: "Expert Frontend", location: "Paris", experienceYears: 7 } },
      },
      include: { candidat: true },
    });
    createdUserIds.push(candidateUser.id);

    const consultantUser = await prisma.user.create({
      data: { name: "Consultant RP", email: emails.consultant, passwordHash, role: "CONSULTANT" },
    });
    createdUserIds.push(consultantUser.id);

    const companyA = await prisma.company.create({ data: { name: `Entreprise A ${suffix}` } });
    const companyB = await prisma.company.create({ data: { name: `Entreprise B ${suffix}` } });
    createdCompanyIds.push(companyA.id, companyB.id);

    await prisma.companyMember.create({ data: { companyId: companyA.id, userId: userA.id, role: "OWNER" } });
    await prisma.companyMember.create({ data: { companyId: companyB.id, userId: userB.id, role: "OWNER" } });

    // 1. Create Job for Company A
    const jobA = await prisma.job.create({
      data: {
        companyId: companyA.id,
        title: "Développeur Fullstack Lead",
        location: "Lyon / Télétravail",
        description: "Poste clé pour l'expansion technique",
        missionType: "CDI",
        requiredSkills: ["TypeScript", "Next.js", "PostgreSQL"],
        requiredExperienceYears: 5,
        status: "OPEN",
      },
    });

    assert.equal(jobA.companyId, companyA.id);
    assert.equal(jobA.status, "OPEN");

    // 2. Create raw Application for Job A (candidate applies directly)
    const application = await prisma.application.create({
      data: {
        candidateId: candidateUser.candidat!.id,
        userId: candidateUser.id,
        jobId: jobA.id,
        status: "SUBMITTED",
      },
    });

    // Verify unpresented candidate application is NOT visible to Company A
    const unpresentedApps = await prisma.application.findMany({
      where: {
        job: { companyId: companyA.id },
        presentations: { some: { companyId: companyA.id } },
      },
    });
    assert.equal(unpresentedApps.length, 0, "Unpresented candidate must not be visible to company");

    // 3. Consultant presents the candidate to Company A
    const presentation = await prisma.missionPresentation.create({
      data: {
        missionId: jobA.id,
        applicationId: application.id,
        candidateId: candidateUser.candidat!.id,
        companyId: companyA.id,
        state: "CANDIDAT_ANONYME",
        financialConditionStatus: "PENDING",
      },
    });

    // Now presented application is visible to Company A
    const presentedApps = await prisma.application.findMany({
      where: {
        job: { companyId: companyA.id },
        presentations: { some: { companyId: companyA.id } },
      },
      include: {
        presentations: { where: { companyId: companyA.id } },
      },
    });
    assert.equal(presentedApps.length, 1);
    assert.equal(presentedApps[0].id, application.id);

    // Identity lock verification
    const isUnlockedBefore = isIdentityUnlocked(presentation.state, presentation.financialConditionStatus);
    assert.equal(isUnlockedBefore, false, "Candidate identity must be locked initially");

    // 4. Confirm financial condition & unlock identity
    const updatedPresentation = await prisma.missionPresentation.update({
      where: { id: presentation.id },
      data: {
        state: "IDENTITE_DEBLOQUEE",
        financialConditionStatus: "CONFIRMED",
        unlockedAt: new Date(),
      },
    });

    const isUnlockedAfter = isIdentityUnlocked(updatedPresentation.state, updatedPresentation.financialConditionStatus);
    assert.equal(isUnlockedAfter, true, "Candidate identity must be unlocked after confirmation");

    // 5. Update application status by Company A
    const updatedApp = await prisma.application.update({
      where: { id: application.id },
      data: { status: "INTERVIEW", notes: "Entretien technique programmé" },
    });
    assert.equal(updatedApp.status, "INTERVIEW");

    await prisma.recruitmentHistory.create({
      data: {
        applicationId: application.id,
        jobId: jobA.id,
        actorUserId: userA.id,
        action: "APPLICATION_STATUS_CHANGED",
        fromStatus: "SUBMITTED",
        toStatus: "INTERVIEW",
      },
    });

    const history = await prisma.recruitmentHistory.findMany({ where: { applicationId: application.id } });
    assert.equal(history.length, 1);
    assert.equal(history[0].toStatus, "INTERVIEW");

    // 6. Cross-company isolation verification: Company B must see 0 jobs and 0 applications from Company A
    const companyBJobs = await prisma.job.findMany({ where: { companyId: companyB.id } });
    const companyBApps = await prisma.application.findMany({
      where: {
        job: { companyId: companyB.id },
        presentations: { some: { companyId: companyB.id } },
      },
    });

    assert.equal(companyBJobs.length, 0);
    assert.equal(companyBApps.length, 0);
  } finally {
    // Cleanup
    await prisma.recruitmentHistory.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.missionPresentation.deleteMany({ where: { companyId: { in: createdCompanyIds } } });
    await prisma.application.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.job.deleteMany({ where: { companyId: { in: createdCompanyIds } } });
    await prisma.companyMember.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.candidateProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});
