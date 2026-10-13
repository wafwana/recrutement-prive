"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  name: string | null;
  email: string;
  headline: string | null;
};

type Job = {
  id: string;
  title: string;
  location: string | null;
  company: { name: string };
};

type CandidateToJobMatch = {
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

type JobToCandidateMatch = {
  candidateId: string;
  name: string | null;
  email: string;
  headline: string | null;
  location: string | null;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  categoryMatchLevel: string;
};

function scoreLabel(score: number) {
  if (score >= 90) return "PRIORITAIRE";
  if (score >= 80) return "TRÈS PERTINENT";
  if (score >= 70) return "PERTINENT";
  if (score >= 60) return "À ÉVALUER";
  return "FAIBLE";
}

function scoreClass(score: number) {
  if (score >= 90) return "border-[#c7a15a] bg-[#c7a15a]/10 text-[#c7a15a]";
  if (score >= 80) return "border-emerald-400/40 bg-emerald-400/5 text-emerald-300";
  if (score >= 70) return "border-sky-400/40 bg-sky-400/5 text-sky-300";
  return "border-white/10 bg-black text-white/50";
}

export default function CvMatchingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [candidateMatches, setCandidateMatches] = useState<CandidateToJobMatch[]>([]);
  const [jobMatches, setJobMatches] = useState<JobToCandidateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/owner/cv-candidates", { cache: "no-store" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les candidats.");
        setCandidates(data.candidates || []);
      }),
      fetch("/api/owner/cv-matching?mode=jobs", { cache: "no-store" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les offres.");
        setJobs(data.jobs || []);
      }),
    ])
      .catch((error) => setMessage(error instanceof Error ? error.message : "Erreur de chargement."))
      .finally(() => {
        setLoadingCandidates(false);
        setLoadingJobs(false);
      });
  }, []);

  async function runCandidateMatching() {
    if (!candidateId) return;
    setLoading(true);
    setMessage("");
    setJobMatches([]);
    try {
      const res = await fetch(`/api/owner/cv-matching?candidateId=${encodeURIComponent(candidateId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching impossible.");
      setCandidateMatches(data.matches || []);
      setMessage(`${data.matches?.length || 0} offre(s) ouverte(s) classée(s) par matching décroissant.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de matching.");
      setCandidateMatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function runJobMatching() {
    if (!jobId) return;
    setLoading(true);
    setMessage("");
    setCandidateMatches([]);
    try {
      const res = await fetch(`/api/owner/cv-matching?jobId=${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching impossible.");
      setJobMatches(data.matches || []);
      setMessage(`${data.matches?.length || 0} candidat(s) classé(s) par matching décroissant.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de matching.");
      setJobMatches([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:py-20">
      <BackButton />
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">CV · IA · Matching transversal</p>
      <h1 className="mt-3 font-serif text-4xl text-white">Matching candidats ↔ offres</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
        Les résultats sont toujours classés du meilleur score au plus faible. Chaque résultat permet d'accéder directement au candidat ou de retrouver les opportunités correspondant à un candidat.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-[#111] p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Candidat → opportunités</p>
          <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-white/45">Candidat</label>
          <div className="mt-3 flex flex-col gap-3">
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">
              <option value="">Sélectionner un candidat</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {(candidate.name || "Candidat sans nom")} — {candidate.email}
                </option>
              ))}
            </select>
            <button disabled={!candidateId || loading} onClick={runCandidateMatching} className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-40">
              {loading ? "Analyse…" : "Trouver les opportunités"}
            </button>
          </div>
          {loadingCandidates ? <p className="mt-3 text-xs text-white/35">Chargement des candidats…</p> : null}
        </div>

        <div className="border border-white/10 bg-[#111] p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Offre → candidats</p>
          <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-white/45">Offre ouverte</label>
          <div className="mt-3 flex flex-col gap-3">
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">
              <option value="">Sélectionner une offre</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.company.name}
                </option>
              ))}
            </select>
            <button disabled={!jobId || loading} onClick={runJobMatching} className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-40">
              {loading ? "Analyse…" : "Trouver les candidats"}
            </button>
          </div>
          {loadingJobs ? <p className="mt-3 text-xs text-white/35">Chargement des offres…</p> : null}
        </div>
      </div>

      {message ? <p aria-live="polite" className="mt-5 text-xs text-white/50">{message}</p> : null}

      <div className="mt-8 space-y-3">
        {candidateMatches.map((match, index) => (
          <article key={match.jobId} className="border border-white/10 bg-[#111] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">#{index + 1} · {scoreLabel(match.score)}</p>
                <p className="mt-1 font-serif text-xl text-white">{match.title}</p>
                <p className="mt-1 text-xs text-white/45">{match.companyName} · {match.location || "Localisation non précisée"}</p>
                <p className="mt-3 text-xs text-white/50">{match.reasons.join(" ")}</p>
                {match.matchedSkills.length ? <p className="mt-2 text-xs text-emerald-300/80">Compétences correspondantes : {match.matchedSkills.slice(0, 8).join(", ")}</p> : null}
              </div>
              <div className={`min-w-28 border px-5 py-3 text-center ${scoreClass(match.score)}`}>
                <p className="font-serif text-3xl">{match.score}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] opacity-60">score /100</p>
              </div>
            </div>
          </article>
        ))}

        {jobMatches.map((match, index) => (
          <article key={match.candidateId} className="border border-white/10 bg-[#111] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">#{index + 1} · {scoreLabel(match.score)}</p>
                <p className="mt-1 font-serif text-xl text-white">{match.headline || match.name || "Candidat sans nom"}</p>
                <p className="mt-1 text-xs text-white/45">{match.location || "Localisation non précisée"} · {match.email}</p>
                <p className="mt-3 text-xs text-white/50">{match.reasons.join(" ")}</p>
                {match.matchedSkills.length ? <p className="mt-2 text-xs text-emerald-300/80">Compétences correspondantes : {match.matchedSkills.slice(0, 8).join(", ")}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className={`min-w-28 border px-5 py-3 text-center ${scoreClass(match.score)}`}>
                  <p className="font-serif text-3xl">{match.score}</p>
                  <p className="text-[9px] uppercase tracking-[0.16em] opacity-60">score /100</p>
                </div>
                <a
                  href={`/espace/owner/cv-matching?candidateId=${encodeURIComponent(match.candidateId)}`}
                  className="border border-[#c7a15a]/50 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#c7a15a]"
                >
                  Voir le candidat →
                </a>
              </div>
            </div>
          </article>
        ))}

        {!loading && candidateId && candidateMatches.length === 0 && jobMatches.length === 0 ? (
          <p className="border border-white/10 p-6 text-sm text-white/40">Aucun résultat de matching à afficher.</p>
        ) : null}
      </div>
    </section>
  );
}
