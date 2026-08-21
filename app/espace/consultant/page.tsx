import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireConsultantAccess } from "@/lib/consultant-access";
import { matchCandidateToJob } from "@/lib/matching";
import ConsultantDashboard from "./ConsultantDashboard";
import SourcingQueue from "./SourcingQueue";

export default async function ConsultantPage() {
  const access = await requireConsultantAccess().catch(() => null);
  if (!access) redirect("/connexion");
  const [applications, sourcedCandidates] = await Promise.all([
    prisma.application.findMany({
      include: {
        candidate: { include: { user: { select: { name: true, email: true } } } },
        job: { include: { company: { select: { id: true, name: true } } } },
      }, orderBy: { updatedAt: "desc" }, take: 200,
    }),
    prisma.sourcedCandidate.findMany({
      where: { createdByUserId: access.userId },
      orderBy: { updatedAt: "desc" }, take: 100,
    }),
  ]);
  const serialised = applications.map((application) => ({
    id: application.id, status: application.status, createdAt: application.createdAt.toISOString(), updatedAt: application.updatedAt.toISOString(),
    candidate: { id: application.candidate.id, headline: application.candidate.headline, location: application.candidate.location, skills: application.candidate.skills, experienceYears: application.candidate.experienceYears, user: application.candidate.user },
    job: { id: application.job.id, title: application.job.title, description: application.job.description, requiredSkills: application.job.requiredSkills, requiredExperienceYears: application.job.requiredExperienceYears, company: application.job.company },
    matching: matchCandidateToJob(application.candidate, application.job),
  }));
  const serialisedSourced = sourcedCandidates.map((candidate) => ({
    id: candidate.id, source: candidate.source, sourceProfileUrl: candidate.sourceProfileUrl, name: candidate.name, headline: candidate.headline,
    location: candidate.location, skills: candidate.skills, experienceYears: candidate.experienceYears, status: candidate.status,
    matchingScore: candidate.matchingScore, notes: candidate.notes,
  }));
  return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24"><p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace consultant</p><div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><h1 className="font-serif text-5xl sm:text-6xl">Le recrutement au centre.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Une vue opérationnelle des candidatures, des missions et des étapes de recrutement.</p></div><span className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white/40">Connecté</span></div><ConsultantDashboard applications={serialised} /><SourcingQueue candidates={serialisedSourced} /></section>;
}
