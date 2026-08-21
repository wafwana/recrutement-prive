"use client";

import { useState } from "react";
import { createSourcedCandidate, updateSourcedCandidateStatus } from "./sourcing-actions";

type SourcedCandidate = {
  id: string;
  source: string;
  sourceProfileUrl: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  skills: unknown;
  experienceYears: number | null;
  status: string;
  matchingScore: number | null;
  notes: string | null;
};

const statuses = ["DETECTED", "REVIEWING", "MATCHED", "VALIDATED", "CONTACTED", "REJECTED"];

export default function SourcingQueue({ candidates }: { candidates: SourcedCandidate[] }) {
  const [filter, setFilter] = useState("");
  const filtered = candidates.filter((candidate) => !filter || candidate.status === filter);
  const runStatus = async (id: string, status: "REVIEWING" | "MATCHED" | "VALIDATED" | "CONTACTED" | "REJECTED") => updateSourcedCandidateStatus(id, status);

  return (
    <section className="mt-10 border border-white/10 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Sourcing autorisé</p>
          <h2 className="mt-3 font-serif text-2xl">Du profil détecté au contact</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-white/40">Sources autorisées → détection → extraction minimale → matching → fiche provisoire → validation consultant → contact. Aucun contact automatique n'est déclenché.</p>
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none">
          <option value="">Tous les statuts</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <form action={createSourcedCandidate} className="mt-8 grid gap-3 border border-white/10 bg-[#111] p-5 md:grid-cols-2">
        <input name="source" required placeholder="Source autorisée (ex. CVthèque partenaire)" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="sourceProfileUrl" type="url" placeholder="URL du profil source (facultatif)" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="name" placeholder="Nom du profil" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="headline" placeholder="Métier / intitulé" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="location" placeholder="Localisation" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="experienceYears" type="number" min="0" max="60" placeholder="Années d'expérience" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none" />
        <input name="skills" placeholder="Compétences séparées par des virgules" className="border border-white/10 bg-transparent px-3 py-3 text-sm outline-none md:col-span-2" />
        <textarea name="notes" placeholder="Notes de sourcing" className="min-h-20 border border-white/10 bg-transparent px-3 py-3 text-sm outline-none md:col-span-2" />
        <button type="submit" className="border border-[#c7a15a]/50 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] md:col-span-2">Ajouter à la file de sourcing</button>
      </form>

      <div className="mt-8 space-y-3">
        {filtered.length === 0 ? <p className="border border-white/10 p-5 text-sm text-white/45">Aucun profil dans cette étape.</p> : filtered.map((candidate) => {
          const skills = Array.isArray(candidate.skills) ? candidate.skills.filter((value): value is string => typeof value === "string") : [];
          return <article key={candidate.id} className="border border-white/10 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-serif text-xl">{candidate.name || "Profil sans nom"}</p>
                <p className="mt-1 text-xs text-white/40">{candidate.headline || "Profil professionnel"} · {candidate.location || "Localisation inconnue"}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a]">Source : {candidate.source} · {candidate.status}</p>
                <p className="mt-2 text-xs text-white/45">{skills.length ? `Compétences : ${skills.join(", ")}` : "Compétences à compléter"} · Expérience : {candidate.experienceYears ?? "—"} ans</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                {candidate.sourceProfileUrl ? <a href={candidate.sourceProfileUrl} target="_blank" rel="noreferrer" className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/50">Source ↗</a> : null}
                {candidate.status === "DETECTED" ? <button onClick={() => runStatus(candidate.id, "REVIEWING")} className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em]">Examiner</button> : null}
                {candidate.status === "REVIEWING" ? <button onClick={() => runStatus(candidate.id, "MATCHED")} className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em]">Lancer matching</button> : null}
                {candidate.status === "MATCHED" ? <button onClick={() => runStatus(candidate.id, "VALIDATED")} className="border border-[#c7a15a]/50 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#c7a15a]">Valider le profil</button> : null}
                {candidate.status === "VALIDATED" ? <button onClick={() => runStatus(candidate.id, "CONTACTED")} className="border border-[#c7a15a]/50 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#c7a15a]">Marquer contact</button> : null}
                {candidate.status !== "REJECTED" && candidate.status !== "CONTACTED" ? <button onClick={() => runStatus(candidate.id, "REJECTED")} className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40">Écarter</button> : null}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
