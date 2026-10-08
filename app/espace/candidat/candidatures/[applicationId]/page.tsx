import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const labels: Record<string, string> = {
  SUBMITTED: "Candidature envoyée",
  REVIEWING: "En étude",
  INTERVIEW: "Entretien",
  SHORTLISTED: "Présentée à l'entreprise",
  REJECTED: "Non retenue",
  HIRED: "Recruté",
};

export default async function CandidateApplicationDetail({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CANDIDAT") redirect("/espace");

  const { applicationId } = await params;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: session.user.id },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      job: {
        select: {
          title: true,
          location: true,
          description: true,
          missionType: true,
          status: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });

  if (!application) redirect("/espace/candidat/candidatures");

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:w-[min(1180px,calc(100%-72px))]">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Espace candidat · Dossier</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">{application.job.title}</h1>
          <p className="mt-3 text-sm text-white/45">{application.job.location || "Localisation non précisée"}</p>
        </div>
        <span className="border border-[#c7a15a]/30 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">
          {labels[application.status] ?? application.status}
        </span>
      </div>

      <Link href="/espace/candidat/candidatures" className="mt-6 inline-block border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white/60">
        ← Retour aux candidatures
      </Link>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <article className="border border-white/10 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Dossier de candidature</p>
          <p className="mt-5 text-sm leading-7 text-white/60">
            {application.job.description || "La description détaillée de cette mission n'est pas disponible."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 text-xs text-white/45">
            <div className="border border-white/10 p-4">Type de mission : {application.job.missionType || "Non précisé"}</div>
            <div className="border border-white/10 p-4">Offre : {application.job.status === "OPEN" ? "Ouverte" : "En traitement"}</div>
          </div>
          {application.notes && (
            <div className="mt-8 border-l-2 border-[#c7a15a] bg-white/5 p-4 text-sm text-white/60">
              Votre message : {application.notes}
            </div>
          )}
        </article>

        <aside className="border border-[#c7a15a]/20 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Historique du dossier</p>
          <div className="mt-6 space-y-5">
            {application.history.length === 0 ? (
              <p className="text-sm text-white/45">Aucun événement enregistré.</p>
            ) : (
              application.history.map((item) => (
                <div key={item.id} className="border-l border-white/10 pl-4">
                  <p className="text-xs text-white/70">{item.action}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {item.fromStatus ? `${item.fromStatus} → ` : ""}{item.toStatus || ""}
                  </p>
                  <p className="mt-1 text-[10px] text-white/25">{new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
