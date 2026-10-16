import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { runWithTestSession, type AuthSession } from "../auth";
import { GET as getEnterpriseJobs, POST as createEnterpriseJob } from "../app/api/entreprise/jobs/route";
import { GET as getEnterpriseApplications } from "../app/api/entreprise/applications/route";
import { GET as getCandidateProfile, PUT as updateCandidateProfile } from "../app/api/candidat/profil/route";

type Role = "OWNER" | "ADMIN" | "CONSULTANT" | "ENTREPRISE" | "CANDIDAT";
const sessionFor = (id: string, role: Role) => ({ user: { id, role } });

function getRequest(path: string) {
  return new Request(`http://localhost${path}`);
}
function postRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("current route handlers enforce candidate and enterprise authorization boundaries", { skip: !process.env.DATABASE_URL }, async () => {
  const suffix = randomUUID();
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];

  try {
    const candidate = await prisma.user.create({
      data: {
        name: "API Matrix Candidate",
        email: `api-matrix-candidate-${suffix}@example.test`,
        passwordHash: "test-only-hash",
        role: "CANDIDAT",
        candidat: { create: { headline: "API matrix", location: "Paris" } },
      },
      include: { candidat: { select: { id: true } } },
    });
    createdUserIds.push(candidate.id);

    const enterpriseA = await prisma.user.create({
      data: { name: "API Matrix Enterprise A", email: `api-matrix-enterprise-a-${suffix}@example.test`, passwordHash: "test-only-hash", role: "ENTREPRISE" },
    });
    createdUserIds.push(enterpriseA.id);

    const multiCompanyEnterprise = await prisma.user.create({
      data: { name: "API Matrix Multi Enterprise", email: `api-matrix-enterprise-multi-${suffix}@example.test`, passwordHash: "test-only-hash", role: "ENTREPRISE" },
    });
    createdUserIds.push(multiCompanyEnterprise.id);

    const admin = await prisma.user.create({
      data: { name: "API Matrix Admin", email: `api-matrix-admin-${suffix}@example.test`, passwordHash: "test-only-hash", role: "ADMIN" },
    });
    createdUserIds.push(admin.id);

    const consultant = await prisma.user.create({
      data: { name: "API Matrix Consultant", email: `api-matrix-consultant-${suffix}@example.test`, passwordHash: "test-only-hash", role: "CONSULTANT" },
    });
    createdUserIds.push(consultant.id);

    const companyA = await prisma.company.create({ data: { name: `API Matrix Company A ${suffix}` } });
    const companyB = await prisma.company.create({ data: { name: `API Matrix Company B ${suffix}` } });
    createdCompanyIds.push(companyA.id, companyB.id);

    await prisma.companyMember.createMany({
      data: [
        { companyId: companyA.id, userId: enterpriseA.id, role: "OWNER" },
        { companyId: companyA.id, userId: multiCompanyEnterprise.id, role: "OWNER" },
        { companyId: companyB.id, userId: multiCompanyEnterprise.id, role: "RECRUITER" },
      ],
    });

    const jobA = await prisma.job.create({
      data: { companyId: companyA.id, title: `API Matrix A ${suffix}`, status: "OPEN" },
    });
    const jobB = await prisma.job.create({
      data: { companyId: companyB.id, title: `API Matrix B ${suffix}`, status: "OPEN" },
    });

    // Candidate profile APIs reject missing sessions and all non-CANDIDAT roles.
    const deniedCandidateSessions: AuthSession[] = [
      {},
      sessionFor(admin.id, "ADMIN"),
      sessionFor(consultant.id, "CONSULTANT"),
      sessionFor(enterpriseA.id, "ENTREPRISE"),
    ];
    for (const session of deniedCandidateSessions) {
      const response = await runWithTestSession(session, () => getCandidateProfile());
      assert.equal(response.status, 403, `candidate profile must reject role ${session.user?.role ?? "ANONYMOUS"}`);
    }

    const ownProfile = await runWithTestSession(sessionFor(candidate.id, "CANDIDAT"), () => getCandidateProfile());
    assert.equal(ownProfile.status, 200);
    const ownProfileData = await ownProfile.json();
    assert.equal(ownProfileData.userId, candidate.id);
    assert.equal(ownProfileData.id, candidate.candidat!.id);

    const profileMutationByAdmin = await runWithTestSession(
      sessionFor(admin.id, "ADMIN"),
      () => updateCandidateProfile(new Request("http://localhost/api/candidat/profil", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ headline: "Forbidden" }),
      })),
    );
    assert.equal(profileMutationByAdmin.status, 403);

    // The live job handler must reject missing/wrong roles.
    assert.equal((await runWithTestSession({}, () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyA.id}`)))).status, 403);
    assert.equal((await runWithTestSession(sessionFor(admin.id, "ADMIN"), () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyA.id}`)))).status, 403);
    assert.equal((await runWithTestSession(sessionFor(consultant.id, "CONSULTANT"), () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyA.id}`)))).status, 403);

    const companyAResponse = await runWithTestSession(
      sessionFor(enterpriseA.id, "ENTREPRISE"),
      () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyA.id}`)),
    );
    assert.equal(companyAResponse.status, 200);
    const companyAJobs = await companyAResponse.json();
    assert.ok(companyAJobs.some((job: { id: string }) => job.id === jobA.id));
    assert.ok(companyAJobs.every((job: { companyId: string }) => job.companyId === companyA.id));
    assert.ok(!companyAJobs.some((job: { id: string }) => job.id === jobB.id));

    const foreignCompany = await runWithTestSession(
      sessionFor(enterpriseA.id, "ENTREPRISE"),
      () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyB.id}`)),
    );
    assert.equal(foreignCompany.status, 403);

    const multiCompanyWithoutSelection = await runWithTestSession(
      sessionFor(multiCompanyEnterprise.id, "ENTREPRISE"),
      () => getEnterpriseJobs(getRequest("/api/entreprise/jobs")),
    );
    assert.equal(multiCompanyWithoutSelection.status, 403);

    const multiCompanyB = await runWithTestSession(
      sessionFor(multiCompanyEnterprise.id, "ENTREPRISE"),
      () => getEnterpriseJobs(getRequest(`/api/entreprise/jobs?companyId=${companyB.id}`)),
    );
    assert.equal(multiCompanyB.status, 200);
    const companyBJobs = await multiCompanyB.json();
    assert.ok(companyBJobs.every((job: { companyId: string }) => job.companyId === companyB.id));

    // A rejected cross-company write must not persist a new job.
    const beforeForeignPost = await prisma.job.count({ where: { companyId: companyB.id } });
    const foreignPost = await runWithTestSession(
      sessionFor(enterpriseA.id, "ENTREPRISE"),
      () => createEnterpriseJob(postRequest("/api/entreprise/jobs", {
        companyId: companyB.id,
        title: "Must not be created",
        status: "DRAFT",
      })),
    );
    assert.equal(foreignPost.status, 403);
    assert.equal(await prisma.job.count({ where: { companyId: companyB.id } }), beforeForeignPost);

    const wrongRoleApplications = await runWithTestSession(
      sessionFor(admin.id, "ADMIN"),
      () => getEnterpriseApplications(getRequest(`/api/entreprise/applications?companyId=${companyA.id}`)),
    );
    assert.equal(wrongRoleApplications.status, 403);

    const foreignCompanyApplications = await runWithTestSession(
      sessionFor(enterpriseA.id, "ENTREPRISE"),
      () => getEnterpriseApplications(getRequest(`/api/entreprise/applications?companyId=${companyB.id}`)),
    );
    assert.equal(foreignCompanyApplications.status, 403);
  } finally {
    if (createdCompanyIds.length) {
      await prisma.companyMember.deleteMany({ where: { companyId: { in: createdCompanyIds } } });
      await prisma.job.deleteMany({ where: { companyId: { in: createdCompanyIds } } });
      await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  }
});
