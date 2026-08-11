"use client";

import { useState } from "react";

export type ConsultantCandidate = {
  id: string;
  headline: string | null;
  location: string | null;
  user: { name: string | null; email: string };
  updatedAt: string;
};

export type ConsultantApplication = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  candidate: ConsultantCandidate;
  job: { id: string; title: string; company: { id: string; name: string } };
};

export default function ConsultantDashboard({ applications }: { applications: ConsultantApplication[] }) {
  const [filter, setFilter] = useState("");
  const filtered = applications.filter((item) => !filter || item.status === filter);
  const statuses = ["SUBMITTED", "REVIEWING", "INTERVIEW", "SHORTLISTED", "REJECTED", "HIRED"];

  const counts = statuses.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));

  return (
    <>
      <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-4">
        {[
          ["Candidatures", applications.length],
          ["Entretiens", applications.filter((item) => item.status === "INTERVIEW").length],
          ["Présélection", applications.filter((item) => item.status === "SHORTLISTED").length],
          ["Recrutés", applications.filter((item) => item.status === "HIRED").length],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#111] p-7">
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
            <p className="mt-6 font-serif text-4xl text-[#c7a15a]">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 border border-white/10 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Pilotage</p>
            <h2 className="mt-3 font-serif text-2xl">Pipeline candidats</h2>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none">
            <option value="">Tous les statuts</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-6">
          {counts.map(({ status, count }) => (
            <div key={status} className="border border-white/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">{status}</p>
              <p className="mt-3 font-serif text-2xl">{count}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <p className="border border-white/10 p-5 text-sm text-white/45">Aucune candidature à afficher.</p>
          ) : filtered.map((application) => (
            <article key={application.id} className="border border-white/10 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-serif text-xl">{application.candidate.user.name || application.candidate.user.email}</p>
                  <p className="mt-1 text-xs text-white/40">{application.candidate.headline || "Profil professionnel"} · {application.candidate.location || "Localisation inconnue"}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">{application.job.title} · {application.job.company.name}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-white/45">{application.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
