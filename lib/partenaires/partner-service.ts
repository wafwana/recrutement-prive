import { prisma } from "@/lib/prisma";
import { isRecruitmentPlatform, PartnerStatusCode } from "./taxonomy";
import type { Prisma } from "@prisma/client";

export interface PartnerSearchParams {
  q?: string;
  category?: string;
  subCategory?: string;
  partnerType?: string;
  country?: string;
  region?: string;
  city?: string;
  sector?: string;
  profession?: string;
  skill?: string;
  language?: string;
  targetAudience?: string;
  collaborationType?: string;
  status?: string;
  agreementStatus?: string;
  priority?: string;
  lastContactBefore?: string;
  lastContactAfter?: string;
  take?: number;
  skip?: number;
}

export interface ActorInfo {
  userId: string;
  name?: string | null;
  role: string;
}

export async function searchPartners(params: PartnerSearchParams) {
  const {
    q,
    category,
    subCategory,
    partnerType,
    country,
    region,
    city,
    status,
    agreementStatus,
    priority,
    take = 100,
    skip = 0,
  } = params;

  const where: Prisma.PartnerWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (subCategory) {
    where.subCategory = subCategory;
  }

  if (partnerType) {
    where.partnerType = partnerType;
  }

  if (country) {
    where.country = { contains: country, mode: "insensitive" };
  }

  if (region) {
    where.region = { contains: region, mode: "insensitive" };
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (priority) {
    where.priority = priority;
  }

  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { officialName: { contains: term, mode: "insensitive" } },
      { usualName: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { country: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
      { website: { contains: term, mode: "insensitive" } },
      { publicContactEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  if (agreementStatus) {
    where.agreements = {
      some: {
        status: agreementStatus,
      },
    };
  }

  if (params.lastContactAfter || params.lastContactBefore) {
    where.lastContactAt = {};
    if (params.lastContactAfter) {
      where.lastContactAt.gte = new Date(params.lastContactAfter);
    }
    if (params.lastContactBefore) {
      where.lastContactAt.lte = new Date(params.lastContactBefore);
    }
  }

  const [total, items] = await Promise.all([
    prisma.partner.count({ where }),
    prisma.partner.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take,
      skip,
      include: {
        contacts: { orderBy: { createdAt: "asc" } },
        agreements: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
  ]);

  // Filter out any JSON array fields in JS if requested
  let filteredItems = items;

  if (params.sector) {
    const term = params.sector.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const sectors = Array.isArray(item.sectors) ? (item.sectors as string[]) : [];
      return sectors.some((s) => s.toLowerCase().includes(term));
    });
  }

  if (params.profession) {
    const term = params.profession.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const professions = Array.isArray(item.professions) ? (item.professions as string[]) : [];
      return professions.some((p) => p.toLowerCase().includes(term));
    });
  }

  if (params.skill) {
    const term = params.skill.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const skills = Array.isArray(item.skills) ? (item.skills as string[]) : [];
      return skills.some((s) => s.toLowerCase().includes(term));
    });
  }

  if (params.language) {
    const term = params.language.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const languages = Array.isArray(item.languages) ? (item.languages as string[]) : [];
      return languages.some((l) => l.toLowerCase().includes(term));
    });
  }

  if (params.targetAudience) {
    const term = params.targetAudience.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const aud = Array.isArray(item.targetAudience) ? (item.targetAudience as string[]) : [];
      return aud.some((a) => a.toLowerCase().includes(term));
    });
  }

  if (params.collaborationType) {
    const term = params.collaborationType.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const col = Array.isArray(item.collaborationTypes) ? (item.collaborationTypes as string[]) : [];
      return col.some((c) => c.toLowerCase().includes(term));
    });
  }

  return {
    total,
    count: filteredItems.length,
    items: filteredItems,
  };
}

export async function createPartner(
  data: {
    officialName: string;
    usualName?: string;
    category: string;
    subCategory?: string;
    partnerType?: string;
    status?: PartnerStatusCode;
    country?: string;
    region?: string;
    city?: string;
    website?: string;
    institutionalAddress?: string;
    publicContactEmail?: string;
    publicContactPhone?: string;
    languages?: string[];
    sectors?: string[];
    professions?: string[];
    targetAudience?: string[];
    skills?: string[];
    collaborationTypes?: string[];
    potentialNeed?: string;
    interest?: string;
    coveredZones?: string[];
    priority?: string;
    assignedOwner?: string;
    notes?: string;
    source?: string;
    sourceUrl?: string;
  },
  actor: ActorInfo
) {
  // Exclusion check: recruitment platforms are strictly forbidden
  if (isRecruitmentPlatform(data.officialName, data.notes, data.website)) {
    throw new Error(
      "EXCLUSION_RECRUITMENT_PLATFORM: Les plateformes de recrutement, cabinets externes et jobboards sont strictement exclus de ce module."
    );
  }

  const partner = await prisma.partner.create({
    data: {
      officialName: data.officialName.trim(),
      usualName: data.usualName?.trim() || null,
      category: data.category,
      subCategory: data.subCategory || null,
      partnerType: data.partnerType || null,
      status: data.status || "IDENTIFIED",
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
      website: data.website || null,
      institutionalAddress: data.institutionalAddress || null,
      publicContactEmail: data.publicContactEmail || null,
      publicContactPhone: data.publicContactPhone || null,
      languages: data.languages || [],
      sectors: data.sectors || [],
      professions: data.professions || [],
      targetAudience: data.targetAudience || [],
      skills: data.skills || [],
      collaborationTypes: data.collaborationTypes || [],
      potentialNeed: data.potentialNeed || null,
      interest: data.interest || null,
      coveredZones: data.coveredZones || [],
      priority: data.priority || "MEDIUM",
      assignedOwner: data.assignedOwner || actor.name || actor.userId,
      notes: data.notes || null,
      source: data.source || "MANUAL",
      sourceUrl: data.sourceUrl || null,
      lastQualifiedAt: data.status && data.status !== "IDENTIFIED" ? new Date() : null,
      history: {
        create: {
          actorUserId: actor.userId,
          actorName: actor.name || "Système",
          action: "CREATED",
          toStatus: data.status || "IDENTIFIED",
          details: { message: "Création de la fiche organisme" },
        },
      },
    },
    include: {
      contacts: true,
      agreements: true,
      history: true,
    },
  });

  return partner;
}

export async function getPartnerDetails(id: string) {
  return prisma.partner.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      agreements: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updatePartner(
  id: string,
  data: Partial<{
    officialName: string;
    usualName: string;
    category: string;
    subCategory: string;
    partnerType: string;
    country: string;
    region: string;
    city: string;
    website: string;
    institutionalAddress: string;
    publicContactEmail: string;
    publicContactPhone: string;
    languages: string[];
    sectors: string[];
    professions: string[];
    targetAudience: string[];
    skills: string[];
    collaborationTypes: string[];
    potentialNeed: string;
    interest: string;
    coveredZones: string[];
    priority: string;
    assignedOwner: string;
    notes: string;
  }>,
  actor: ActorInfo
) {
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) throw new Error("Partenaire introuvable");

  if (data.officialName && isRecruitmentPlatform(data.officialName, data.notes ?? existing.notes, data.website ?? existing.website)) {
    throw new Error(
      "EXCLUSION_RECRUITMENT_PLATFORM: Les plateformes de recrutement, cabinets externes et jobboards sont strictement exclus de ce module."
    );
  }

  const updated = await prisma.partner.update({
    where: { id },
    data: {
      ...data,
      lastQualifiedAt: new Date(),
    },
    include: {
      contacts: true,
      agreements: true,
      history: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  await prisma.partnerHistory.create({
    data: {
      partnerId: id,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "QUALIFIED",
      details: { updatedFields: Object.keys(data) },
    },
  });

  return updated;
}

export async function updatePartnerStatus(
  id: string,
  newStatus: PartnerStatusCode,
  notes: string | undefined,
  actor: ActorInfo
) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw new Error("Partenaire introuvable");

  // Official partner validation (VALIDATED_PARTNER) requires OWNER role
  if (newStatus === "VALIDATED_PARTNER" && actor.role !== "OWNER") {
    throw new Error("FORBIDDEN_ONLY_OWNER: Seul l'OWNER peut valider officiellement un partenariat.");
  }

  const oldStatus = partner.status;

  const updated = await prisma.partner.update({
    where: { id },
    data: {
      status: newStatus,
      lastContactAt: new Date(),
      lastQualifiedAt: new Date(),
    },
  });

  await prisma.partnerHistory.create({
    data: {
      partnerId: id,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "STATUS_CHANGED",
      fromStatus: oldStatus,
      toStatus: newStatus,
      details: notes ? { notes } : undefined,
    },
  });

  return updated;
}

export async function addPartnerContact(
  partnerId: string,
  contactData: {
    name: string;
    roleTitle?: string;
    email?: string;
    phone?: string;
    source?: string;
    notes?: string;
  },
  actor: ActorInfo
) {
  const contact = await prisma.partnerContact.create({
    data: {
      partnerId,
      name: contactData.name.trim(),
      roleTitle: contactData.roleTitle?.trim() || null,
      email: contactData.email?.trim() || null,
      phone: contactData.phone?.trim() || null,
      source: contactData.source || "MANUAL",
      notes: contactData.notes || null,
    },
  });

  await prisma.partner.update({
    where: { id: partnerId },
    data: { lastContactAt: new Date() },
  });

  await prisma.partnerHistory.create({
    data: {
      partnerId,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "CONTACT_ADDED",
      details: { contactName: contact.name, contactRole: contact.roleTitle },
    },
  });

  return contact;
}

export async function deletePartnerContact(partnerId: string, contactId: string, actor: ActorInfo) {
  const contact = await prisma.partnerContact.findFirst({
    where: { id: contactId, partnerId },
  });

  if (!contact) throw new Error("Contact introuvable");

  await prisma.partnerContact.delete({ where: { id: contactId } });

  await prisma.partnerHistory.create({
    data: {
      partnerId,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "CONTACT_REMOVED",
      details: { contactName: contact.name },
    },
  });

  return { success: true };
}

export async function createPartnerAgreement(
  partnerId: string,
  agreementData: {
    title: string;
    agreementType: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    clauses?: string;
    documentUrl?: string;
  },
  actor: ActorInfo
) {
  const agreement = await prisma.partnerAgreement.create({
    data: {
      partnerId,
      title: agreementData.title.trim(),
      agreementType: agreementData.agreementType,
      status: agreementData.status || "PROJECT",
      startDate: agreementData.startDate ? new Date(agreementData.startDate) : null,
      endDate: agreementData.endDate ? new Date(agreementData.endDate) : null,
      clauses: agreementData.clauses || null,
      documentUrl: agreementData.documentUrl || null,
    },
  });

  await prisma.partnerHistory.create({
    data: {
      partnerId,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "AGREEMENT_CREATED",
      details: { agreementTitle: agreement.title, agreementType: agreement.agreementType },
    },
  });

  return agreement;
}

export async function updatePartnerAgreement(
  partnerId: string,
  agreementId: string,
  agreementData: Partial<{
    title: string;
    agreementType: string;
    status: string;
    startDate: string;
    endDate: string;
    clauses: string;
    documentUrl: string;
  }>,
  actor: ActorInfo
) {
  const updated = await prisma.partnerAgreement.update({
    where: { id: agreementId },
    data: {
      ...agreementData,
      startDate: agreementData.startDate ? new Date(agreementData.startDate) : undefined,
      endDate: agreementData.endDate ? new Date(agreementData.endDate) : undefined,
    },
  });

  await prisma.partnerHistory.create({
    data: {
      partnerId,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "AGREEMENT_UPDATED",
      details: { agreementTitle: updated.title, status: updated.status },
    },
  });

  return updated;
}

export async function deletePartnerAgreement(partnerId: string, agreementId: string, actor: ActorInfo) {
  const agreement = await prisma.partnerAgreement.findFirst({
    where: { id: agreementId, partnerId },
  });

  if (!agreement) throw new Error("Accord introuvable");

  await prisma.partnerAgreement.delete({ where: { id: agreementId } });

  await prisma.partnerHistory.create({
    data: {
      partnerId,
      actorUserId: actor.userId,
      actorName: actor.name || "Système",
      action: "AGREEMENT_REMOVED",
      details: { agreementTitle: agreement.title },
    },
  });

  return { success: true };
}
