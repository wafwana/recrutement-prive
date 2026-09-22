import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const job = await prisma.job.findUnique({ where: { id: jobId }, include: { jobCategory: { select: { code: true } }, subCategory: { select: { code: true } } } });
    if (!job) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
    const access = await requireCompanyAccess(job.companyId);
    const candidates = await prisma.candidateProfile.findMany({ where: { status: "ACTIVE" }, include: { user: { select: { name: true, email: true } }, primaryCategory: { select: { code: true } } } });
    const matches = candidates.map((candidate) => {
      const subCategoryCodes = Array.isArray(candidate.subCategoryIds) ? candidate.subCategoryIds.filter((v): v is string => typeof v === "string") : [];
      const result = matchCandidateToJob(
        { skills: candidate.skills, experienceYears: candidate.experienceYears, headline: candidate.headline, bio: candidate.bio, location: candidate.location, country: candidate.country, primaryCategoryCode: candidate.primaryCategory?.code, subCategoryCodes },
        { requiredSkills: job.requiredSkills, requiredExperienceYears: job.requiredExperienceYears, title: job.title, description: job.description, location: job.location, categoryCode: job.jobCategory?.code, subCategoryCode: job.subCategory?.code }
      );
      return { candidateId: candidate.id, name: candidate.user.name, email: candidate.user.email, score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, reasons: result.reasons, categoryMatchLevel: result.categoryMatchLevel };
    }).sort((a, b) => b.score - a.score);
    await prisma.auditLog.create({ data: { actorUserId: access.userId, actorRole: "ENTREPRISE", action: "JOB_CANDIDATE_REMATCH", targetType: "JOB", targetId: job.id, details: { activeCandidates: candidates.length, matchesReturned: matches.length } } });
    return NextResponse.json({ job: { id: job.id, title: job.title, folderPath: job.folderPath, analysis: job.analysis }, matches });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accès refusé" }, { status: 403 });
  }
}
