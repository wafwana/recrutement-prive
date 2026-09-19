import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";

async function requireStaff() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role ?? "")) return null;
  return session.user.id;
}

export async function ingest(sourceUrl: string, actorUserId: string) {
  const items = await fetchGlobalJobs(sourceUrl);
  let created = 0, updated = 0;
  for (const item of items) {
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    const rawData = item.raw === undefined ? undefined : JSON.parse(JSON.stringify(item.raw)) as Prisma.InputJsonValue;
    const closingAt = item.closingAt ? new Date(item.closingAt) : null;
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
    data: { actorUserId, actorRole: "SYSTEM", action: "GLOBAL_JOB_SOURCING", targetType: "EXTERNAL_JOB_SOURCE", details: { sourceUrl, fetched: items.length, created, updated } },
  });
  return { sourceUrl, fetched: items.length, created, updated };
}

export async function POST(request: Request) {
  const actor = await requireStaff();
  if (!actor) return NextResponse.json({ error: "Accès réservé à l'équipe Recrutement Privé." }, { status: 403 });
  let body: unknown = {};
  try { body = await request.json(); } catch {}
  const sourceUrl = typeof body === "object" && body && "sourceUrl" in body && typeof (body as {sourceUrl?: unknown}).sourceUrl === "string"
    ? (body as {sourceUrl:string}).sourceUrl : null;
  const sources = sourceUrl && /^https:\/\//i.test(sourceUrl) ? [sourceUrl] : configuredSources("RP_GLOBAL_JOB_SOURCES");
  if (!sources.length) return NextResponse.json({ error: "Aucune source HTTPS configurée." }, { status: 400 });

  const results = [];
  for (const source of sources) {
    try { results.push(await ingest(source, actor)); }
    catch (error) { results.push({ sourceUrl: source, error: error instanceof Error ? error.message : "Erreur inconnue" }); }
  }
  return NextResponse.json({ results });
}
