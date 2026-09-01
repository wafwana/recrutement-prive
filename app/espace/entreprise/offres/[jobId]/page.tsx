import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCompanyAccess } from "@/lib/company-access";
import { isIdentityUnlocked } from "@/lib/mission-lock";
import ApplicationStatusForm from "./ApplicationStatusForm";
import MissionEditForm from "./MissionEditForm";

const labels: Record<string, string> = { SUBMITTED: "Soumise", REVIEWING: "En étude", INTERVIEW: "Entretien", SHORTLISTED: "Présélectionné", REJECTED: "Non retenu", HIRED: "Recruté" };

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
    include: {
      applications: {
        where: { presentations: { some: { companyId: access.companyId } } },
        include: {
          candidate: { include: { user: { select: { name: true, email: true } }, documents: true } },
          presentations: { where: { companyId: access.companyId }, orderBy: { presentedAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      },
      history: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!companyJob) return null;

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-16 md:w-[min(1180px,calc(100%-72px))] md:py-24">
      <Link href="/espace/entreprise" className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">← Retour au dashboard</Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">Offre · {companyJob.status} {companyJob.missionType ? `· ${companyJob.missionType}` : ""}</p>
          <h1 className="mt-3 font-serif text-5xl">{companyJob.title}</h1>
          <p className="mt-3 text-sm text-white/45">{companyJob.location || "Localisation à préciser"}</p>
          <MissionEditForm job={companyJob} />
        </div>
        <p className="text-sm text-white/45">{companyJob.applications.length} candidat(s) présenté(s)</p>
      </div>

      {companyJob.attachmentName && (
        <div className="mt-8 flex flex-col gap-3 border border-[#c7a15a]/20 bg-[#111] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pièce jointe de l'offre</p>
            <p className="mt-2 text-sm text-white/70">{companyJob.attachmentName}</p>
          </div>
          <a href={`/api/entreprise/jobs/${companyJob.id}/attachment`} className="border border-[#c7a15a] px-5 py-3 text-center text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">
            Télécharger
          </a>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.7fr]">
        <section className="border border-white/10 p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Candidats présentés</p>
          <div className="mt-6 space-y-6">
            {companyJob.applications.length === 0 ? (
              <p className="text-sm text-white/45">Aucun candidat présenté pour le moment pour cette offre.</p>
            ) : (
              companyJob.applications.map((application) => {
                const presentation = application.presentations[0];
                const unlocked = Boolean(presentation && isIdentityUnlocked(presentation.state, presentation.financialConditionStatus));
                const displayName = unlocked
                  ? application.candidate.user.name || application.candidate.user.email
                  : `Candidat #${application.candidate.id.slice(-6).toUpperCase()}`;

                return (
                  <article key={application.id} className="border border-white/10 p-6 bg-[#111]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-serif text-xl text-white">{displayName}</h2>
                          {!unlocked && (
                            <span className="border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-[#c7a15a]">
                              Présentation Confidentielle
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/40">{application.candidate.headline || "Profil professionnel"}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">
                        {labels[application.status] ?? application.status}
                      </span>
                    </div>

                    {!unlocked && (
                      <div className="mt-4 border-l-2 border-[#c7a15a] bg-white/5 p-3 text-xs text-white/60">
                        Identité et contact complets débloqués dès confirmation de la condition financière par l'équipe Recrutement Privé.
                      </div>
                    )}

                    <p className="mt-4 text-sm leading-6 text-white/65">{application.candidate.bio || "Aucune biographie renseignée."}</p>

                    <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.14em] text-white/40 border-t border-white/5 pt-3">
                      <span>Localisation : {application.candidate.location || "Inconnue"}</span>
                      {application.candidate.experienceYears !== null && <span>· Expérience : {application.candidate.experienceYears} an(s)</span>}
                      {unlocked && application.candidate.cvUrl && (
                        <span>
                          ·{" "}
                          <a href={application.candidate.cvUrl} target="_blank" rel="noreferrer" className="text-[#c7a15a] underline">
                            Voir le CV
                          </a>
                        </span>
                      )}
                      {unlocked && application.candidate.documents.length > 0 && (
                        <span>· {application.candidate.documents.length} document(s) disponible(s)</span>
                      )}
                    </div>

                    {application.notes && (
                      <p className="mt-3 text-xs text-white/50 italic bg-white/5 p-2 rounded">
                        Note : {application.notes}
                      </p>
                    )}

                    <ApplicationStatusForm
                      applicationId={application.id}
                      currentStatus={application.status}
                      currentNotes={application.notes}
                    />
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="border border-[#c7a15a]/20 bg-[#111] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Historique de recrutement</p>
          <div className="mt-6 space-y-4">
            {companyJob.history.length === 0 ? (
              <p className="text-sm text-white/45">Aucun événement enregistré.</p>
            ) : (
              companyJob.history.map((item) => (
                <div key={item.id} className="border-l border-white/10 pl-4">
                  <p className="text-xs text-white/70">{item.action}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {item.fromStatus ? `${item.fromStatus} → ` : ""}
                    {item.toStatus || ""}
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
