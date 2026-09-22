import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const jobs = await prisma.job.findMany({ where: { status: "OPEN" }, include: { jobCategory: { select: { code: true } }, subCategory: { select: { code: true } } } });
  const candidates = await prisma.candidateProfile.findMany({ where: { status: "ACTIVE" }, include: { primaryCategory: { select: { code: true } } } });
  let updated = 0;
  for (const job of jobs) {
    const matches = candidates.map((candidate) => {
      const subCategoryCodes = Array.isArray(candidate.subCategoryIds) ? candidate.subCategoryIds.filter((v): v is string => typeof v === "string") : [];
      const result = matchCandidateToJob(
        { skills: candidate.skills, experienceYears: candidate.experienceYears, headline: candidate.headline, bio: candidate.bio, location: candidate.location, country: candidate.country, primaryCategoryCode: candidate.primaryCategory?.code, subCategoryCodes },
        { requiredSkills: job.requiredSkills, requiredExperienceYears: job.requiredExperienceYears, title: job.title, description: job.description, location: job.location, categoryCode: job.jobCategory?.code, subCategoryCode: job.subCategory?.code }
      );
      return { candidateId: candidate.id, score: result.score, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, categoryMatchLevel: result.categoryMatchLevel, reasons: result.reasons };
    }).sort((a, b) => b.score - a.score).slice(0, 20);
    const current = job.analysis && typeof job.analysis === "object" ? job.analysis : {};
    await prisma.job.update({ where: { id: job.id }, data: { analysis: { ...current, suggestedCandidateMatches: matches, rematchedAt: new Date().toISOString() } } });
    updated++;
  }
  return NextResponse.json({ ok: true, jobs: updated, candidates: candidates.length });
}
