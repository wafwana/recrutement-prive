import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";

const labels: Record<string, string> = { SUBMITTED: "Soumise", REVIEWING: "En étude", INTERVIEW: "Entretien", SHORTLISTED: "Présélection", REJECTED: "Refusée", HIRED: "Recrutée" };

export default async function CompanyJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") return null;
  const { jobId } = await params;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
  if (!job) return null;
  let access;
  try { access = await requireCompanyAccess(job.companyId); } catch { return null; }
  const companyJob = await prisma.job.findFirst({
    where: { id: jobId, companyId: access.companyId },
    include: { applications: { include: { candidate: { include: { user: { select: { name: true, email: true } }, documents: true } } }, orderBy: { updatedAt: "desc" } }, history: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!companyJob) return null;

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <Link href="/espace/entreprise" className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">← Retour au dashboard</Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.35em] text-white/35">Offre · {companyJob.status}</p><h1 className="mt-3 font-serif text-5xl">{companyJob.title}</h1><p className="mt-3 text-sm text-white/45">{companyJob.location || "Localisation à préciser"}</p></div><p className="text-sm text-white/45">{companyJob.applications.length} candidature(s)</p></div>
      {companyJob.attachmentName && <div className="mt-8 flex flex-col gap-3 border border-[#c7a15a]/20 bg-[#111] p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pièce jointe de l'offre</p><p className="mt-2 text-sm text-white/70">{companyJob.attachmentName}</p></div><a href={`/api/entreprise/jobs/${companyJob.id}/attachment`} className="border border-[#c7a15a] px-5 py-3 text-center text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Télécharger</a></div>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.7fr]">
        <section className="border border-white/10 p-8"><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Candidatures</p><div className="mt-6 space-y-3">{companyJob.applications.length === 0 ? <p className="text-sm text-white/45">Aucune candidature pour cette offre.</p> : companyJob.applications.map((application) => <article key={application.id} className="border border-white/10 p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-xl">{application.candidate.user.name || application.candidate.user.email}</h2><p className="mt-1 text-xs text-white/40">{application.candidate.headline || "Profil professionnel"}</p></div><span className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">{labels[application.status] ?? application.status}</span></div><p className="mt-4 text-sm leading-6 text-white/55">{application.candidate.bio || "Aucune présentation renseignée."}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/35"><span>{application.candidate.location || "Localisation inconnue"}</span><span>·</span><span>{application.candidate.documents.length} document(s)</span></div></article>)}</div></section>
        <aside className="border border-[#c7a15a]/20 bg-[#111] p-8"><p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Historique</p><div className="mt-6 space-y-4">{companyJob.history.length === 0 ? <p className="text-sm text-white/45">Aucun événement.</p> : companyJob.history.map((item) => <div key={item.id} className="border-l border-white/10 pl-4"><p className="text-xs text-white/70">{item.action}</p><p className="mt-1 text-[10px] text-white/35">{item.fromStatus ? `${item.fromStatus} → ` : ""}{item.toStatus || ""}</p><p className="mt-1 text-[10px] text-white/25">{new Date(item.createdAt).toLocaleString("fr-FR")}</p></div>)}</div></aside>
      </div>
    </section>
  );
}
