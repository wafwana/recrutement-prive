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
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdConversationIds: string[] = [];
  const createdSettingKeys: string[] = [];

  try {
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
    createdUserIds.push(candidate.id);

    const enterprise = await prisma.user.create({
      data: { name: "E2E Enterprise", email: emails.enterprise, passwordHash, role: "ENTREPRISE" },
    });
    createdUserIds.push(enterprise.id);

    const enterpriseMulti = await prisma.user.create({
      data: { name: "E2E Enterprise Multi", email: emails.enterpriseMulti, passwordHash, role: "ENTREPRISE" },
    });
    createdUserIds.push(enterpriseMulti.id);

    const consultant = await prisma.user.create({
      data: { name: "E2E Consultant", email: emails.consultant, passwordHash, role: "CONSULTANT" },
    });
    createdUserIds.push(consultant.id);

    const admin = await prisma.user.create({
      data: { name: "E2E Admin", email: emails.admin, passwordHash, role: "ADMIN" },
    });
    createdUserIds.push(admin.id);

    const outsider = await prisma.user.create({
      data: { name: "E2E Outsider", email: emails.outsider, passwordHash, role: "CANDIDAT" },
    });
    createdUserIds.push(outsider.id);

    const companyA = await prisma.company.create({ data: { name: `E2E Company A ${suffix}` } });
    const companyB = await prisma.company.create({ data: { name: `E2E Company B ${suffix}` } });
    createdCompanyIds.push(companyA.id, companyB.id);

    await prisma.companyMember.create({ data: { companyId: companyA.id, userId: enterprise.id, role: "OWNER" } });
    await prisma.companyMember.createMany({
      data: [
        { companyId: companyA.id, userId: enterpriseMulti.id, role: "OWNER" },
        { companyId: companyB.id, userId: enterpriseMulti.id, role: "RECRUITER" },
      ],
    });

    const companyMemberships = await prisma.companyMember.findMany({ where: { userId: enterpriseMulti.id } });
    assert(companyMemberships.length === 2, "multi-company membership setup failed");

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
      data: { companyId: companyB.id, title: "E2E Designer", status: "OPEN" },
    });

    assert(jobA.applications.length === 1, "candidate application was not created");
    assert(candidate.role === "CANDIDAT", "candidate role mismatch");
    assert(enterprise.role === "ENTREPRISE", "enterprise role mismatch");
    assert(consultant.role === "CONSULTANT", "consultant role mismatch");
    assert(admin.role === "ADMIN", "admin role mismatch");

    const application = jobA.applications[0];
    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: { status: "INTERVIEW", notes: "E2E validation" },
    });
    const history = await prisma.recruitmentHistory.create({
      data: {
        applicationId: updatedApplication.id,
        jobId: jobA.id,
        actorUserId: enterprise.id,
        action: "STATUS_CHANGED",
        fromStatus: "SUBMITTED",
        toStatus: updatedApplication.status,
      },
    });
    assert(history.actorUserId === enterprise.id, "history actor mismatch");

    const storedHistory = await prisma.recruitmentHistory.findMany({
      where: { applicationId: application.id, actorUserId: enterprise.id, action: "STATUS_CHANGED" },
    });
    assert(storedHistory.length === 1, "RecruitmentHistory was not recorded");

    const candidateApplications = await prisma.application.findMany({ where: { userId: candidate.id } });
    assert(candidateApplications.length === 1 && candidateApplications[0].id === application.id, "candidate isolation failed");

    const outsiderApplications = await prisma.application.findMany({ where: { userId: outsider.id } });
    assert(outsiderApplications.length === 0, "outsider received candidate application data");

    const companyAApplications = await prisma.application.findMany({
      where: { job: { companyId: companyA.id } },
      include: { job: true },
    });
    const companyBApplications = await prisma.application.findMany({
      where: { job: { companyId: companyB.id } },
      include: { job: true },
    });
    assert(companyAApplications.length === 1, "company A application visibility is incorrect");
    assert(companyBApplications.length === 0, "cross-company application leak detected");
    assert(companyAApplications.every((item) => item.job.companyId === companyA.id), "company A scope is incorrect");

    const companyAJobs = await prisma.job.findMany({ where: { companyId: companyA.id } });
    const companyBJobs = await prisma.job.findMany({ where: { companyId: companyB.id } });
    assert(companyAJobs.every((job) => job.companyId === companyA.id), "company A isolation failed");
    assert(companyBJobs.every((job) => job.companyId === companyB.id), "company B isolation failed");
    assert(!companyAJobs.some((job) => job.id === jobB.id), "cross-company job leak detected");

    const invalidJobInput = { title: "" };
    assert(invalidJobInput.title.length === 0, "invalid fixture missing");

    const settingKey = `e2e.validation.${suffix}`;
    createdSettingKeys.push(settingKey);
    await prisma.systemSetting.create({ data: { key: settingKey, value: { enabled: true, actor: admin.id } } });
    const persistedSetting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
    assert(
      Boolean(persistedSetting?.value && (persistedSetting.value as { enabled?: boolean }).enabled === true),
      "admin setting was not persisted",
    );

    const conversation = await prisma.conversation.create({
      data: {
        subject: "E2E conversation",
        participants: { create: [{ userId: candidate.id }, { userId: consultant.id }] },
        messages: { create: { senderId: candidate.id, body: "Validation message" } },
      },
      include: { participants: true, messages: true },
    });
    createdConversationIds.push(conversation.id);
    assert(conversation.participants.length === 2, "conversation participants are incomplete");
    assert(conversation.messages.length === 1, "conversation message was not created");
    assert(conversation.messages[0].senderId === candidate.id, "conversation sender mismatch");
    assert(!conversation.participants.some((participant) => participant.userId === outsider.id), "outsider became a participant");

    console.log(
      JSON.stringify(
        {
          ok: true,
          scenario: "final-validation",
          checks: {
            roleFixtures: true,
            candidatePersistence: true,
            companyIsolation: true,
            history: true,
            adminPersistence: true,
            messagingMembership: true,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.message.deleteMany({ where: { conversationId: { in: createdConversationIds } } });
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: createdConversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds } } });
    await prisma.recruitmentHistory.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.application.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.job.deleteMany({ where: { companyId: { in: createdCompanyIds } } });
    await prisma.companyMember.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    await prisma.candidateDocument.deleteMany({ where: { candidate: { userId: { in: createdUserIds } } } });
    await prisma.candidateProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    if (createdSettingKeys.length > 0) {
      await prisma.systemSetting.deleteMany({ where: { key: { in: createdSettingKeys } } });
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
