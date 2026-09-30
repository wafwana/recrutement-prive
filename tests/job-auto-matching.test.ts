import test from "node:test";
import assert from "node:assert/strict";
import { triggerJobCandidateMatching } from "@/lib/jobs/matching-trigger";
import { prisma } from "@/lib/prisma";
import { runWithTestSession } from "@/auth";
import { POST as createCompanyJob } from "@/app/api/entreprise/jobs/route";
import { PUT as updateCompanyJob } from "@/app/api/entreprise/jobs/[jobId]/route";
import { hashPassword } from "@/lib/password-crypto";

test("triggerJobCandidateMatching returns 0 matched candidates for non-existent or non-OPEN job", async () => {
  if (!process.env.DATABASE_URL) return;
  const result = await triggerJobCandidateMatching("non-existent-id");
  assert.equal(result.matchedCandidates, 0);
});

test("e2e & integration: automatic candidate matching on job publication", async () => {
  if (!process.env.DATABASE_URL) return;

  const suffix = Date.now().toString();
  const passwordHash = await hashPassword("TestPass@123!");

  const companyA = await prisma.company.create({ data: { name: `Company AutoMatch A ${suffix}` } });
  const companyB = await prisma.company.create({ data: { name: `Company AutoMatch B ${suffix}` } });

  const userRecruiterA = await prisma.user.create({
    data: { name: "Recruiter A", email: `recruiter.a.${suffix}@example.test`, passwordHash, role: "ENTREPRISE" },
  });
  const userRecruiterB = await prisma.user.create({
    data: { name: "Recruiter B", email: `recruiter.b.${suffix}@example.test`, passwordHash, role: "ENTREPRISE" },
  });

  await prisma.companyMember.create({ data: { companyId: companyA.id, userId: userRecruiterA.id, role: "RECRUITER" } });
  await prisma.companyMember.create({ data: { companyId: companyB.id, userId: userRecruiterB.id, role: "RECRUITER" } });

  // Active candidate with CV
  const candidateUser = await prisma.user.create({
    data: { name: "Admissible Candidate", email: `cand.active.${suffix}@example.test`, passwordHash, role: "CANDIDAT", status: "ACTIVE" },
  });
  const activeCandidate = await prisma.candidateProfile.create({
    data: {
      userId: candidateUser.id,
      headline: "Senior Financial Controller",
      bio: "Expert in accounting, financial modeling, and budgeting",
      skills: ["Finance", "Accounting", "Budgeting", "Excel"],
      experienceYears: 8,
      status: "ACTIVE",
    },
  });

  // Pre-existing match for another job
  const dummyOtherJobId = `job-other-${suffix}`;
  const candidateDoc = await prisma.candidateDocument.create({
    data: {
      candidateId: activeCandidate.id,
      name: "CV_Active.pdf",
      fileData: Buffer.from("pdf_binary_content"),
      type: "application/pdf",
      docType: "CV",
      isPrimaryCv: true,
      analysis: {
        sourceFactsOnly: true,
        suggestedMatches: [
          { jobId: dummyOtherJobId, title: "Ancien poste de contrôleur", score: 75, matchedSkills: ["Finance"] },
        ],
      },
    },
  });

  // Inactive candidate with CV (should be excluded)
  const inactiveCandidateUser = await prisma.user.create({
    data: { name: "Inactive Candidate", email: `cand.inactive.${suffix}@example.test`, passwordHash, role: "CANDIDAT", status: "SUSPENDED" },
  });
  const inactiveCandidate = await prisma.candidateProfile.create({
    data: {
      userId: inactiveCandidateUser.id,
      headline: "Financial Analyst",
      skills: ["Finance"],
      status: "SUSPENDED",
    },
  });
  const inactiveDoc = await prisma.candidateDocument.create({
    data: {
      candidateId: inactiveCandidate.id,
      name: "CV_Inactive.pdf",
      fileData: Buffer.from("pdf_binary_content"),
      type: "application/pdf",
      docType: "CV",
      isPrimaryCv: true,
      analysis: { suggestedMatches: [] },
    },
  });

  const sessionA = { user: { id: userRecruiterA.id, role: "ENTREPRISE" } };
  const sessionB = { user: { id: userRecruiterB.id, role: "ENTREPRISE" } };

  try {
    // 1. Creation of non-OPEN offer (DRAFT) does NOT trigger candidate matching
    const draftReq = new Request("http://localhost/api/entreprise/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: companyA.id,
        title: "Contrôleur de Gestion Senior",
        status: "DRAFT",
        requiredSkills: "Finance, Accounting, Budgeting",
        requiredExperienceYears: 5,
      }),
    });
    const resDraft = await runWithTestSession(sessionA, () => createCompanyJob(draftReq));
    assert.equal(resDraft.status, 201);
    const draftJob = await resDraft.json();
    assert.equal(draftJob.matchingCandidates, 0);

    // Verify candidate doc analysis was untouched for draft job
    const docAfterDraft = await prisma.candidateDocument.findUnique({ where: { id: candidateDoc.id } });
    const matchesAfterDraft = (docAfterDraft?.analysis as Record<string, unknown>)?.suggestedMatches as Array<{ jobId: string }>;
    assert.equal(matchesAfterDraft.some((m) => m.jobId === draftJob.id), false);

    // 2. Transition from DRAFT to OPEN status triggers candidate matching
    const openReq = new Request(`http://localhost/api/entreprise/jobs/${draftJob.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Contrôleur de Gestion Senior",
        status: "OPEN",
        requiredSkills: "Finance, Accounting, Budgeting",
        requiredExperienceYears: 5,
      }),
    });
    const paramsDraft = Promise.resolve({ jobId: draftJob.id });
    const resOpen = await runWithTestSession(sessionA, () => updateCompanyJob(openReq, { params: paramsDraft }));
    assert.equal(resOpen.status, 200);

    // Verify candidate doc analysis now contains draftJob match AND preserves dummyOtherJobId match
    const docAfterOpen = await prisma.candidateDocument.findUnique({ where: { id: candidateDoc.id } });
    const matchesAfterOpen = (docAfterOpen?.analysis as Record<string, unknown>)?.suggestedMatches as Array<{ jobId: string; score: number }>;
    assert.equal(matchesAfterOpen.some((m) => m.jobId === draftJob.id), true, "Job match should be present after status -> OPEN");
    assert.equal(matchesAfterOpen.some((m) => m.jobId === dummyOtherJobId), true, "Pre-existing job match must be preserved");

    // 3. Idempotency test: repeated calls do NOT produce duplicate suggestions for draftJob.id
    await triggerJobCandidateMatching(draftJob.id);
    await triggerJobCandidateMatching(draftJob.id);

    const docAfterRepeated = await prisma.candidateDocument.findUnique({ where: { id: candidateDoc.id } });
    const matchesAfterRepeated = (docAfterRepeated?.analysis as Record<string, unknown>)?.suggestedMatches as Array<{ jobId: string }>;
    const matchesForThisJob = matchesAfterRepeated.filter((m) => m.jobId === draftJob.id);
    assert.equal(matchesForThisJob.length, 1, "There must be exactly 1 match entry per jobId (no duplicates)");

    // 4. Inactive candidate document must NOT be matched
    const docInactiveAfterOpen = await prisma.candidateDocument.findUnique({ where: { id: inactiveDoc.id } });
    const matchesInactive = (docInactiveAfterOpen?.analysis as Record<string, unknown>)?.suggestedMatches as Array<{ jobId: string }>;
    assert.equal(matchesInactive.some((m) => m.jobId === draftJob.id), false, "Inactive candidate must be excluded");

    // 5. Direct creation of an offer in OPEN status triggers matching immediately
    const directOpenReq = new Request("http://localhost/api/entreprise/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: companyA.id,
        title: "Directeur Financier",
        status: "OPEN",
        requiredSkills: "Finance, Accounting, Excel",
        requiredExperienceYears: 7,
      }),
    });
    const resDirectOpen = await runWithTestSession(sessionA, () => createCompanyJob(directOpenReq));
    assert.equal(resDirectOpen.status, 201);
    const directOpenJob = await resDirectOpen.json();
    assert.ok(directOpenJob.matchingCandidates >= 1);

    const docAfterDirectOpen = await prisma.candidateDocument.findUnique({ where: { id: candidateDoc.id } });
    const matchesAfterDirectOpen = (docAfterDirectOpen?.analysis as Record<string, unknown>)?.suggestedMatches as Array<{ jobId: string }>;
    assert.equal(matchesAfterDirectOpen.some((m) => m.jobId === directOpenJob.id), true);

    // 6. Security IDOR check: Company B cannot update job of Company A
    const idorReq = new Request(`http://localhost/api/entreprise/jobs/${directOpenJob.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Hacked Title", status: "OPEN" }),
    });
    const paramsDirect = Promise.resolve({ jobId: directOpenJob.id });
    const resIdor = await runWithTestSession(sessionB, () => updateCompanyJob(idorReq, { params: paramsDirect }));
    assert.equal(resIdor.status, 403);
  } finally {
    await prisma.recruitmentHistory.deleteMany({ where: { actorUserId: { in: [userRecruiterA.id, userRecruiterB.id] } } });
    await prisma.job.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.candidateDocument.deleteMany({ where: { candidateId: { in: [activeCandidate.id, inactiveCandidate.id] } } });
    await prisma.candidateProfile.deleteMany({ where: { id: { in: [activeCandidate.id, inactiveCandidate.id] } } });
    await prisma.companyMember.deleteMany({ where: { companyId: { in: [companyA.id, companyB.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA.id, companyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userRecruiterA.id, userRecruiterB.id, candidateUser.id, inactiveCandidateUser.id] } } });
  }
});
