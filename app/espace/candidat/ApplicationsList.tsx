"use client";

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
};

export default function ApplicationsList({ applications }: { applications: Application[] }) {
  return (
    <div className="space-y-8">
      <section className="border border-white/10 p-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Dossiers suivis par Recrutement Privé ({applications.length})</p>
        </div>
        <p className="mt-3 text-xs leading-6 text-white/45">Les intitulés d'offres et les identités des entreprises ne sont pas affichés dans l'espace candidat. Recrutement Privé organise les mises en relation et vous informe des étapes utiles.</p>

        <div className="mt-6 space-y-4">
          {applications.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-white/45">Aucun dossier en cours pour le moment.</p>
            </div>
          ) : applications.map((app) => {
            const statusInfo = statusLabels[app.status] ?? { label: app.status, style: "border-white/20 text-white/70" };
            return (
              <div key={app.id} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-lg text-white">Dossier Recrutement Privé</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">Référence interne · {app.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <span className={`inline-block border px-3 py-1 text-[10px] uppercase tracking-[0.15em] ${statusInfo.style}`}>{statusInfo.label}</span>
                </div>
                <p className="mt-3 text-[11px] text-white/35">Dossier transmis le {new Date(app.createdAt).toLocaleDateString("fr-FR")} · Mis à jour le {new Date(app.updatedAt).toLocaleDateString("fr-FR")}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
