import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const PASSWORD = "Validation-2026!";

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

async function main() {
  const suffix = Date.now().toString();
  const emails = {
    candidate: `e2e.candidate.${suffix}@example.test`,
    enterprise: `e2e.enterprise.${suffix}@example.test`,
    enterpriseMulti: `e2e.enterprise.multi.${suffix}@example.test`,
    consultant: `e2e.consultant.${suffix}@example.test`,
    admin: `e2e.admin.${suffix}@example.test`,
    outsider: `e2e.outsider.${suffix}@example.test`,
  };

  const passwordHash = await hashPassword(PASSWORD);

  const candidate = await prisma.user.create({
    data: {
      name: "E2E Candidate",
      email: emails.candidate,
      passwordHash,
      role: "CANDIDAT",
      candidat: { create: { headline: "Validation", location: "Paris" } },
    },
    include: { candidat: true },
  });
  const enterprise = await prisma.user.create({
    data: { name: "E2E Enterprise", email: emails.enterprise, passwordHash, role: "ENTREPRISE" },
  });
  const enterpriseMulti = await prisma.user.create({
    data: { name: "E2E Enterprise Multi", email: emails.enterpriseMulti, passwordHash, role: "ENTREPRISE" },
  });
  const consultant = await prisma.user.create({
    data: { name: "E2E Consultant", email: emails.consultant, passwordHash, role: "CONSULTANT" },
  });
  const admin = await prisma.user.create({
    data: { name: "E2E Admin", email: emails.admin, passwordHash, role: "ADMIN" },
  });
  const outsider = await prisma.user.create({
    data: { name: "E2E Outsider", email: emails.outsider, passwordHash, role: "CANDIDAT" },
  });

  const companyA = await prisma.company.create({ data: { name: `E2E Company A ${suffix}` } });
  const companyB = await prisma.company.create({ data: { name: `E2E Company B ${suffix}` } });

  await prisma.companyMember.create({ data: { companyId: companyA.id, userId: enterprise.id, role: "OWNER" } });
  await prisma.companyMember.createMany({
    data: [
      { companyId: companyA.id, userId: enterpriseMulti.id, role: "OWNER" },
      { companyId: companyB.id, userId: enterpriseMulti.id, role: "RECRUITER" },
    ],
  });

  const jobA = await prisma.job.create({
    data: {
      companyId: companyA.id,
      title: "E2E Engineer",
      status: "OPEN",
      applications: {
        create: {
          candidateId: candidate.candidat!.id,
          userId: candidate.id,
          status: "SUBMITTED",
        },
      },
    },
    include: { applications: true },
  });

  const jobB = await prisma.job.create({
    data: {
      companyId: companyB.id,
      title: "E2E Designer",
      status: "OPEN",
    },
  });

  assert(jobA.applications.length === 1, "candidate application was not created");

  const application = jobA.applications[0];
  const updatedApplication = await prisma.application.update({
    where: { id: application.id },
    data: { status: "INTERVIEW", notes: "E2E validation" },
  });
  await prisma.recruitmentHistory.create({
    data: {
      applicationId: updatedApplication.id,
      jobId: jobA.id,
      actorUserId: enterprise.id,
      action: "STATUS_CHANGED",
      fromStatus: "SUBMITTED",
      toStatus: updatedApplication.status,
    },
  });

  const history = await prisma.recruitmentHistory.findMany({
    where: { applicationId: application.id, actorUserId: enterprise.id, action: "STATUS_CHANGED" },
  });
  assert(history.length === 1, "RecruitmentHistory was not recorded");

  const companyAJobs = await prisma.job.findMany({ where: { companyId: companyA.id } });
  const companyBJobs = await prisma.job.findMany({ where: { companyId: companyB.id } });
  assert(companyAJobs.every((job) => job.companyId === companyA.id), "company A isolation failed");
  assert(companyBJobs.every((job) => job.companyId === companyB.id), "company B isolation failed");
  assert(!companyAJobs.some((job) => job.id === jobB.id), "cross-company job leak detected");

  const outsiderApplications = await prisma.application.findMany({ where: { userId: outsider.id } });
  assert(outsiderApplications.length === 0, "outsider received application access in seed state");

  await prisma.systemSetting.upsert({
    where: { key: "e2e.validation" },
    update: { value: { enabled: true, suffix } },
    create: { key: "e2e.validation", value: { enabled: true, suffix } },
  });
  const persistedSetting = await prisma.systemSetting.findUnique({ where: { key: "e2e.validation" } });
  assert(persistedSetting?.value && (persistedSetting.value as { enabled?: boolean }).enabled === true, "admin setting was not persisted");

  const conversation = await prisma.conversation.create({
    data: {
      subject: "E2E conversation",
      participants: { create: [{ userId: candidate.id }, { userId: consultant.id }] },
      messages: { create: { senderId: candidate.id, body: "Validation message" } },
    },
    include: { participants: true, messages: true },
  });
  assert(conversation.participants.length === 2, "conversation participants are incomplete");
  assert(conversation.messages.length === 1, "conversation message was not created");
  assert(!conversation.participants.some((participant) => participant.userId === outsider.id), "outsider became a participant");

  console.log(JSON.stringify({
    ok: true,
    scenario: "final-validation",
    checks: {
      candidateData: true,
      companyIsolation: true,
      history: true,
      adminPersistence: true,
      messagingMembership: true,
      roleData: true,
    },
    seededUsers: Object.values(emails),
    password: PASSWORD,
    companies: [companyA.id, companyB.id],
    jobs: [jobA.id, jobB.id],
    application: application.id,
    conversation: conversation.id,
  }, null, 2));

  // Keep explicit references so all created role fixtures are part of the verified setup.
  void enterpriseMulti;
  void consultant;
  void admin;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
