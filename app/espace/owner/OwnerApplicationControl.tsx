import { updateApplicationStatus } from "./actions";

type Application = {
  id: string;
  status: string;
  candidate: { user: { name: string | null; email: string }; headline: string | null; location: string | null };
  job: { title: string; company: { name: string } };
};

const statuses = ["SUBMITTED", "REVIEWING", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"] as const;

export default function OwnerApplicationControl({ applications }: { applications: Application[] }) {
  return (
    <section className="mt-8 border border-[#c7a15a]/20 bg-[#111] p-7">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Décision Recrutement Privé</p>
      <h2 className="mt-3 font-serif text-2xl">Présentation des profils</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Une entreprise ne voit un candidat qu'après votre décision de présentation. Les statuts ci-dessous sont pilotés par le propriétaire ou l'administrateur de la plateforme.</p>
      <div className="mt-7 space-y-3">
        {applications.length === 0 ? <p className="text-sm text-white/35">Aucune candidature enregistrée.</p> : applications.map((application) => (
          <div key={application.id} className="border border-white/10 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-serif text-lg">{application.candidate.user.name || application.candidate.user.email}</p>
                <p className="mt-1 text-xs text-white/40">{application.candidate.headline || "Profil professionnel"} · {application.candidate.location || "Localisation inconnue"}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">{application.job.title} · {application.job.company.name}</p>
              </div>
              <form action={updateApplicationStatus} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="applicationId" value={application.id} />
                <select name="status" defaultValue={application.status} className="border border-white/10 bg-[#111] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white outline-none">
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Valider la décision</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
