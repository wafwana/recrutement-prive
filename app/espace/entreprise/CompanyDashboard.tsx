"use client";

import { useState } from "react";
import { createCompanyJob } from "./actions";

type Job = {
  id: string;
  title: string;
  location: string | null;
  status: string;
  applications: { status: string }[];
};

type Application = {
  id: string;
  status: string;
  candidate: {
    headline: string | null;
    location: string | null;
    user: { name: string | null; email: string };
  };
  job: { id: string; title: string };
};

const applicationStatuses = ["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"] as const;

export default function CompanyDashboard({ jobs, applications }: { jobs: Job[]; applications: Application[] }) {
  const [filter, setFilter] = useState<string>("");
  const filteredApplications = applications.filter((application) => !filter || application.status === filter);
  const activeJobs = jobs.filter((job) => ["OPEN", "PAUSED"].includes(job.status)).length;
  const totalApplications = applications.length;

  return (
    <>
      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-3">
        {[
          ["Recrutements actifs", String(activeJobs)],
          ["Candidatures reçues", String(totalApplications)],
          ["Profils présélectionnés", String(applications.filter((item) => item.status === "SHORTLISTED").length)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-4xl">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_.82fr]">
        <section className="border border-white/10 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pilotage</p>
              <h2 className="mt-3 font-serif text-2xl">Vos offres</h2>
            </div>
            <form action={createCompanyJob} className="grid gap-2 sm:grid-cols-2">
              <input name="title" required placeholder="Titre du poste" className="border border-white/10 bg-transparent px-3 py-2 text-xs outline-none" />
              <input name="location" placeholder="Localisation" className="border border-white/10 bg-transparent px-3 py-2 text-xs outline-none" />
              <textarea name="description" placeholder="Brief de recrutement" className="border border-white/10 bg-transparent px-3 py-2 text-xs outline-none sm:col-span-2" rows={3} />
              <select name="status" defaultValue="DRAFT" className="border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none">
                <option value="DRAFT">Brouillon</option>
                <option value="OPEN">Publier</option>
              </select>
              <button className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Créer l'offre</button>
            </form>
          </div>

          <div className="mt-8 space-y-2">
            {jobs.length === 0 ? (
              <p className="border border-white/10 p-5 text-sm text-white/45">Aucune offre pour le moment. Créez votre première offre ci-dessus.</p>
            ) : jobs.map((job) => (
              <div key={job.id} className="border border-white/10 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-serif text-xl">{job.title}</h3>
                    <p className="mt-1 text-xs text-white/40">{job.location || "Localisation à préciser"}</p>
                  </div>
                  <div className="text-right text-xs text-white/45">{job.applications.length} candidature(s)<br /><span className="uppercase tracking-[0.12em]">{job.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-white/10 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pipeline</p>
              <h2 className="mt-3 font-serif text-2xl">Candidatures</h2>
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none">
              <option value="">Tous</option>
              {applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="mt-8 space-y-2">
            {filteredApplications.length === 0 ? (
              <p className="border border-white/10 p-5 text-sm text-white/45">Aucune candidature correspondant au filtre.</p>
            ) : filteredApplications.map((application) => (
              <div key={application.id} className="border border-white/10 p-5">
                <p className="font-serif text-lg">{application.candidate.user.name || application.candidate.user.email}</p>
                <p className="mt-1 text-xs text-white/40">{application.candidate.headline || "Profil professionnel"} · {application.candidate.location || "Localisation inconnue"}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">{application.job.title} · {application.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
