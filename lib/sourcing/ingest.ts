import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchGlobalJobs } from "@/lib/sourcing/global";

export async function ingestGlobalJobs(sourceUrl: string, actorUserId: string) {
  const items = await fetchGlobalJobs(sourceUrl);
  let created = 0, updated = 0;
  for (const item of items) {
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    const closingAt = item.closingAt ? new Date(item.closingAt) : null;
    const rawData = item.raw === undefined ? undefined : JSON.parse(JSON.stringify(item.raw)) as Prisma.InputJsonValue;
    const existing = await prisma.externalJobOpportunity.findUnique({
      where: { source_externalId: { source: item.source, externalId: item.externalId } },
      select: { id: true },
    });
    await prisma.externalJobOpportunity.upsert({
      where: { source_externalId: { source: item.source, externalId: item.externalId } },
      create: {
        externalId: item.externalId, source: item.source, sourceUrl: item.sourceUrl, title: item.title,
        companyName: item.companyName, country: item.country, city: item.city, categoryCode: item.categoryCode,
        subCategoryCode: item.subCategoryCode, skills: item.skills, experienceYears: item.experienceYears,
        language: item.language, salary: item.salary, publishedAt, closingAt, description: item.description, rawData,
      },
      update: {
        sourceUrl: item.sourceUrl, title: item.title, companyName: item.companyName, country: item.country, city: item.city,
        categoryCode: item.categoryCode, subCategoryCode: item.subCategoryCode, skills: item.skills,
        experienceYears: item.experienceYears, language: item.language, salary: item.salary, publishedAt, closingAt,
        description: item.description, rawData, updatedAt: new Date(),
      },
    });
    if (existing) updated++; else created++;
  }
  await prisma.auditLog.create({
    data: {
      actorUserId, actorRole: "SYSTEM", action: "GLOBAL_JOB_SOURCING", targetType: "EXTERNAL_JOB_SOURCE",
      details: { sourceUrl, fetched: items.length, created, updated },
    },
  });
  return { sourceUrl, fetched: items.length, created, updated };
}
