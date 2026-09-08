"use client";

import { useTransition, useState } from "react";
import { applyToJob } from "./actions";
import Link from "next/link";

const statusLabels: Record<string, { label: string; style: string }> = {
  SUBMITTED: { label: "Candidature envoyée", style: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  REVIEWING: { label: "En cours d'étude par le cabinet", style: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  INTERVIEW: { label: "Entretien planifié", style: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  SHORTLISTED: { label: "Présenté à l'entreprise", style: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  REJECTED: { label: "Candidature non retenue", style: "border-red-500/30 text-red-400 bg-red-500/10" },
  HIRED: { label: "Candidat recruté", style: "border-emerald-600/50 text-emerald-300 bg-emerald-600/20" },
};

type Application = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  job: {
    id: string;
    title: string;
    location: string | null;
    company: { name: string };
  };
};

type Job = {
  id: string;
  title: string;
  location: string | null;
  company: { name: string };
};

export default function ApplicationsList({
  applications,
  targetJob,
}: {
  applications: Application[];
  targetJob?: Job | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const alreadyApplied = targetJob ? applications.some((app) => app.job.id === targetJob.id) : false;

  const handleApply = (jobId: string) => {
    startTransition(async () => {
      try {
        await applyToJob(jobId, notes);
        setApplyMessage("Votre candidature a été envoyée avec succès !");
      } catch (error) {
        setApplyMessage(error instanceof Error ? error.message : "Erreur lors de l'envoi de la candidature.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {targetJob ? (
        <section className="border border-[#c7a15a]/40 bg-[#161410] p-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Offre sélectionnée</p>
          <h2 className="mt-2 font-serif text-2xl text-white">{targetJob.title}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/50">{targetJob.company.name} {targetJob.location ? `· ${targetJob.location}` : ""}</p>

          {alreadyApplied ? (
            <div className="mt-5 border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              Vous avez déjà postulé à cette offre d'emploi. Suivez son avancement dans la liste de vos candidatures ci-dessous.
            </div>
          ) : (
            <div className="mt-6 border-t border-white/10 pt-5">
              <label className="block text-xs uppercase tracking-[0.18em] text-white/40">
                Note de motivation (optionnel)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Expliquez brièvement en quoi vos compétences correspondent à cette opportunité..."
                  rows={3}
                  maxLength={1000}
                  className="mt-2 w-full resize-none border border-white/10 bg-transparent px-4 py-2 text-xs text-white outline-none"
                />
              </label>

              {applyMessage ? (
                <p aria-live="polite" className="mt-3 text-xs text-[#c7a15a]">{applyMessage}</p>
              ) : null}

              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={() => handleApply(targetJob.id)}
                  disabled={isPending}
                  className="border border-[#c7a15a] bg-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-black transition hover:bg-transparent hover:text-[#c7a15a] disabled:opacity-50"
                >
                  {isPending ? "Transmission en cours…" : "Confirmer ma candidature"}
                </button>
                <Link href="/offres" className="text-xs text-white/50 hover:text-white">
                  Annuler
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="border border-white/10 p-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Candidatures en cours ({applications.length})</p>
          <Link href="/offres" className="text-xs text-[#c7a15a] hover:underline">
            Voir les offres ouvertes ↗
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {applications.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-white/45">Aucune candidature enregistrée pour le moment.</p>
              <Link href="/offres" className="mt-4 inline-block border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white hover:bg-white/10">
                Explorer les opportunités
              </Link>
            </div>
          ) : (
            applications.map((app) => {
              const statusInfo = statusLabels[app.status] ?? { label: app.status, style: "border-white/20 text-white/70" };
              return (
                <div key={app.id} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Link href={`/offres/${app.job.id}`} className="font-serif text-lg text-white hover:text-[#c7a15a]">
                        {app.job.title}
                      </Link>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">
                        {app.job.company.name} {app.job.location ? `· ${app.job.location}` : ""}
                      </p>
                    </div>
                    <span className={`inline-block border px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${statusInfo.style}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-white/35">
                    Postulé le {new Date(app.createdAt).toLocaleDateString("fr-FR")} · Mis à jour le {new Date(app.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
