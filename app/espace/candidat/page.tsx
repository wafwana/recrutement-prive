import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileForm from "./ProfileForm";
import DocumentManager from "./DocumentManager";
import ApplicationsList from "./ApplicationsList";
import CandidateJobApplication from "./CandidateJobApplication";
import CandidateJobMatches from "./CandidateJobMatches";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

type Props = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function CandidatPage({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  if (session.user.role !== "CANDIDAT") {
    redirect("/espace");
  }

  const { jobId } = await searchParams;

  const [profile, categories] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.jobCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, parentId: true, sortOrder: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  const applications = profile
    ? await prisma.application.findMany({
        where: { candidateId: profile.id, userId: session.user.id },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const documents = profile
    ? await prisma.candidateDocument.findMany({
        where: { candidateId: profile.id },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  let selectedJob: {
    id: string;
    title: string;
    location: string | null;
    description: string | null;
    requiredSkills: unknown;
    requiredExperienceYears: number | null;
    missionType: string | null;
    jobCategory: { code: string } | null;
    subCategory: { code: string } | null;
  } | null = null;

  if (jobId) {
    selectedJob = await prisma.job.findFirst({
      where: { id: jobId, status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        description: true,
        requiredSkills: true,
        requiredExperienceYears: true,
        missionType: true,
        jobCategory: { select: { code: true } },
        subCategory: { select: { code: true } },
      },
    });
  }

  const openJobs = profile
    ? await prisma.job.findMany({
        where: { status: "OPEN" },
        select: {
          id: true,
          title: true,
          location: true,
          description: true,
          requiredSkills: true,
          requiredExperienceYears: true,
          company: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  const candidateForMatching = {
    skills: Array.isArray(profile?.skills) ? profile.skills.filter((value): value is string => typeof value === "string") : [],
    experienceYears: profile?.experienceYears ?? null,
    headline: profile?.headline ?? null,
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    country: profile?.country ?? null,
    primaryCategoryCode: null,
    subCategoryCodes: [],
  };

  const candidateMatches = profile
    ? openJobs
        .map((job) => {
          const match = matchCandidateToJob(candidateForMatching, {
            requiredSkills: job.requiredSkills,
            requiredExperienceYears: job.requiredExperienceYears,
            title: job.title,
            description: job.description,
            location: job.location,
            categoryCode: null,
            subCategoryCode: null,
          });
          return {
            jobId: job.id,
            title: job.title,
            companyName: job.company.name,
            location: job.location,
            score: match.score,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            reasons: match.reasons,
          };
        })
        .filter((match) => match.score >= 25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
    : [];

  const selectedApplication = selectedJob && profile
    ? await prisma.application.findUnique({
        where: { candidateId_jobId: { candidateId: profile.id, jobId: selectedJob.id } },
        select: { id: true },
      })
    : null;

  const selectedMatch = selectedJob
    ? matchCandidateToJob(
        {
          skills: Array.isArray(profile?.skills) ? profile.skills.filter((value): value is string => typeof value === "string") : [],
          experienceYears: profile?.experienceYears ?? null,
          headline: profile?.headline ?? null,
          bio: profile?.bio ?? null,
          location: profile?.location ?? null,
          country: profile?.country ?? null,
          primaryCategoryCode: null,
          subCategoryCodes: [],
        },
        {
          requiredSkills: selectedJob.requiredSkills,
          requiredExperienceYears: selectedJob.requiredExperienceYears,
          title: selectedJob.title,
          description: selectedJob.description,
          location: selectedJob.location,
          categoryCode: selectedJob.jobCategory?.code ?? null,
          subCategoryCode: selectedJob.subCategory?.code ?? null,
        },
      ).score
    : null;

  const stats = [
    ["Profil", profile?.headline ? "Complété" : "À compléter", "Votre présentation professionnelle"],
    ["Dossiers", String(applications.length), "Suivi par Recrutement Privé"],
    ["Documents", String(documents.length), "CV et pièces utiles"],
  ];

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-5xl sm:text-6xl">Votre parcours, en un regard.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50">Vos informations et candidatures sont reliées à votre compte sécurisé.</p>
        </div>
        <div className="border border-white/10 px-5 py-4 text-right text-[10px] uppercase tracking-[0.18em] text-white/45">{session.user.email}</div>
      </div>

      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
        {stats.map(([label, value, description]) => (
          <div key={label} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            {label === "Dossiers" ? (
              <Link href="/espace/candidat/candidatures" className="block group">
                <p className="mt-6 font-serif text-3xl text-[#c7a15a]">{value}</p>
                <p className="mt-3 text-sm text-white/45">{description}</p>
                <span className="mt-3 block text-[9px] uppercase tracking-[0.14em] text-white/25 group-hover:text-[#c7a15a]">Ouvrir les candidatures →</span>
              </Link>
            ) : (
              <>
                <p className="mt-6 font-serif text-3xl text-[#c7a15a]">{value}</p>
                <p className="mt-3 text-sm text-white/45">{description}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedJob && (
        <div className="mt-10">
          <CandidateJobApplication
            jobId={selectedJob.id}
            title={selectedJob.title}
            location={selectedJob.location}
            score={selectedMatch}
            alreadyApplied={Boolean(selectedApplication)}
          />
        </div>
      )}

      <CandidateJobMatches matches={candidateMatches} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <ProfileForm profile={profile} categories={categories} />
          <DocumentManager documents={documents} />
        </div>
        <aside>
          <ApplicationsList applications={applications} />
        </aside>
      </div>

      <div className="mt-10 border border-white/10 p-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Confidentialité & Anonymat</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
          Votre espace garantit la protection stricte de vos informations personnelles. Vos données de contact et documents ne sont jamais exposés directement aux entreprises. Recrutement Privé qualifie les besoins, organise les présentations et maîtrise les conditions de mise en relation.
        </p>
      </div>
    </section>
  );
}
