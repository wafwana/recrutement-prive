import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import DocumentManager from "./DocumentManager";
import ApplicationsList from "./ApplicationsList";

type Props = { searchParams: Promise<{ jobId?: string }> };

export default async function CandidatPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") return null;

  const { jobId } = await searchParams;

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: session.user.id } });
  const applications = profile
    ? await prisma.application.findMany({
        where: { candidateId: profile.id, userId: session.user.id },
        include: { job: { include: { company: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const documents = profile
    ? await prisma.candidateDocument.findMany({
        where: { candidateId: profile.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const targetJob = jobId
    ? await prisma.job.findFirst({
        where: { id: jobId, status: "OPEN" },
        include: { company: true },
      })
    : null;

  const stats = [
    ["Profil", profile?.headline ? "Complété" : "À compléter", "Votre présentation professionnelle"],
    ["Candidatures", String(applications.length), "Suivi de vos opportunités"],
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
            <p className="mt-6 font-serif text-3xl text-[#c7a15a]">{value}</p>
            <p className="mt-3 text-sm text-white/45">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <ProfileForm profile={profile} />
          <DocumentManager documents={documents} />
        </div>
        <aside>
          <ApplicationsList applications={applications} targetJob={targetJob} />
        </aside>
      </div>

      <div className="mt-10 border border-white/10 p-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Confidentialité & Anonymat</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
          Votre espace garantit la protection stricte de vos informations personnelles. Vos données de contact et documents ne sont transmis aux entreprises qu'une fois les conditions contractuelles de déblocage d'identité validées.
        </p>
      </div>
    </section>
  );
}
