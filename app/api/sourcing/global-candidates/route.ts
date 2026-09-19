import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchGlobalCandidates } from "@/lib/sourcing/global";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { hasPermission } from "@/lib/auth/permissions";

async function requireStaffPermission() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  if (!session?.user?.id || !["OWNER", "ADMIN", "CONSULTANT"].includes(session.user.role ?? "")) return null;
  if (!(await hasPermission(session.user.id, session.user.role, "SOURCING"))) return null;
  return session.user.id;
}
export async function POST(request: Request) {
  const actor = await requireStaffPermission();
  if (!actor) return NextResponse.json({ error: "Permission de sourcing non accordée par l'Owner." }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const value = body as { sourceUrl?: unknown; jobId?: unknown };
  if (typeof value.sourceUrl !== "string" || !/^https:\/\//i.test(value.sourceUrl) || typeof value.jobId !== "string" || !value.jobId) {
    return NextResponse.json({ error: "sourceUrl HTTPS et jobId sont obligatoires." }, { status: 400 });
  }
  const job = await prisma.job.findUnique({ where: { id: value.jobId }, include: { jobCategory: { select: { code: true } }, subCategory: { select: { code: true } } } });
  if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  let candidates; try { candidates = await fetchGlobalCandidates(value.sourceUrl); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Source inaccessible." }, { status: 502 }); }
  let created = 0, updated = 0;
  for (const candidate of candidates) {
    const result = matchCandidateToJob({ skills: candidate.skills, experienceYears: candidate.experienceYears, headline: candidate.headline, location: candidate.location, country: candidate.country },
      { requiredSkills: job.requiredSkills, requiredExperienceYears: job.requiredExperienceYears, title: job.title, description: job.description, location: job.location, categoryCode: job.jobCategory?.code, subCategoryCode: job.subCategory?.code });
    const data = { source: candidate.source, sourceProfileUrl: candidate.sourceProfileUrl, name: candidate.name, headline: candidate.headline, location: candidate.location, skills: candidate.skills,
      experienceYears: candidate.experienceYears, status: "MATCHED" as const, matchingScore: result.score,
      matchingDetails: { jobId: job.id, externalId: candidate.externalId, match: result }, notes: candidate.country ? `Pays source : ${candidate.country}` : undefined, createdByUserId: actor };
    if (candidate.externalId) {
      const existing = await prisma.sourcedCandidate.findUnique({ where: { source_externalId: { source: candidate.source, externalId: candidate.externalId } }, select: { id: true } });
      if (existing) { await prisma.sourcedCandidate.update({ where: { id: existing.id }, data }); updated++; }
      else { await prisma.sourcedCandidate.create({ data: { ...data, externalId: candidate.externalId } }); created++; }
    } else { await prisma.sourcedCandidate.create({ data }); created++; }
  }
  await prisma.auditLog.create({ data: { actorUserId: actor, actorRole: "SYSTEM", action: "GLOBAL_CANDIDATE_SOURCING", targetType: "JOB", targetId: job.id,
    details: { sourceUrl: value.sourceUrl, fetched: candidates.length, created, updated } } });
  return NextResponse.json({ jobId: job.id, fetched: candidates.length, created, updated });
}
