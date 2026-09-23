import BackButton from "@/components/navigation/BackButton";
"use client";

import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  name: string | null;
  email: string;
  headline: string | null;
};

type Match = {
  jobId: string;
  title: string;
  companyName: string;
  location: string | null;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  categoryMatchLevel: string;
};

export default function CvMatchingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/owner/cv-candidates", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les candidats.");
        setCandidates(data.candidates || []);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Erreur de chargement."))
      .finally(() => setLoadingCandidates(false));
  }, []);

  async function runMatching() {
    if (!candidateId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/owner/cv-matching?candidateId=${encodeURIComponent(candidateId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching impossible.");
      setMatches(data.matches || []);
      setMessage(`${data.matches?.length || 0} offre(s) ouverte(s) analysée(s). Le classement est calculé à partir du profil actuel du candidat.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de matching.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:py-20">
      <BackButton />
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">CV · IA · Matching transversal</p>
      <h1 className="mt-3 font-serif text-4xl text-white">Analyser et rematcher les CV</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
        Un CV n'est pas enfermé dans l'offre ou le contexte qui a conduit à son dépôt. Le profil enrichi peut être comparé à toutes les offres ouvertes accessibles au moteur de matching.
      </p>

      <div className="mt-8 border border-white/10 bg-[#111] p-6">
        <label className="block text-xs uppercase tracking-[0.16em] text-white/45">Candidat</label>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className="flex-1 border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">
            <option value="">Sélectionner un candidat</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {(candidate.name || "Candidat sans nom")} — {candidate.email}
              </option>
            ))}
          </select>
          <button disabled={!candidateId || loading} onClick={runMatching} className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-40">
            {loading ? "Analyse…" : "Rematcher sur les offres"}
          </button>
        </div>
        {loadingCandidates ? <p className="mt-3 text-xs text-white/35">Chargement des candidats…</p> : null}
        {message ? <p aria-live="polite" className="mt-4 text-xs text-white/50">{message}</p> : null}
      </div>

      <div className="mt-8 space-y-3">
        {matches.map((match) => (
          <article key={match.jobId} className="border border-white/10 bg-[#111] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-serif text-xl text-white">{match.title}</p>
                <p className="mt-1 text-xs text-white/45">{match.companyName} · {match.location || "Localisation non précisée"}</p>
                <p className="mt-3 text-xs text-white/50">{match.reasons.join(" ")}</p>
                {match.matchedSkills.length ? <p className="mt-2 text-xs text-emerald-300/80">Compétences correspondantes : {match.matchedSkills.join(", ")}</p> : null}
                {match.missingSkills.length ? <p className="mt-2 text-xs text-white/35">Compétences manquantes : {match.missingSkills.join(", ")}</p> : null}
              </div>
              <div className="min-w-24 border border-[#c7a15a]/30 px-4 py-3 text-center">
                <p className="font-serif text-2xl text-[#c7a15a]">{match.score}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">/100</p>
              </div>
            </div>
          </article>
        ))}
        {!loading && candidateId && matches.length === 0 ? <p className="border border-white/10 p-6 text-sm text-white/40">Aucune offre ouverte à analyser pour ce candidat.</p> : null}
      </div>
    </section>
  );
}
