"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useMemo, useState } from "react";

type Candidate = { id: string; headline: string | null };
type Job = { id: string; title: string; location: string | null; company: { name: string } };
type FocusedJobMatch = { jobId: string; title: string; companyAlias: string; location: string | null; score: number; matchedSkills: string[]; missingSkills: string[]; reasons: string[]; categoryMatchLevel: string };
type FocusedCandidateMatch = { candidateId: string; candidateAlias: string; headline: string | null; location: string | null; country: string | null; experienceYears: number | null; score: number; matchedSkills: string[]; missingSkills: string[]; reasons: string[]; categoryMatchLevel: string };
type Suggestion = {
  candidateId: string; candidateAlias: string; candidateHeadline: string | null; candidateLocation: string | null;
  candidateCountry: string | null; experienceYears: number | null; jobId: string; jobTitle: string;
  companyAlias: string; jobLocation: string | null; score: number; matchedSkills: string[]; missingSkills: string[];
  reasons: string[]; categoryMatchLevel: string; countryFit: string; applicationStatus: string | null;
  presentationExists: boolean; presentationState: string | null;
};
type Overview = { canPresent: boolean; candidateCount: number; jobCount: number; totalMatches: number; truncated: boolean; suggestions: Suggestion[]; candidateSuggestions: Suggestion[]; offerSuggestions: Suggestion[] };

function candidateAlias(id: string) { return "Profil #" + id.slice(-6).toUpperCase(); }
function scoreLabel(score: number) {
  if (score >= 90) return "PRIORITAIRE";
  if (score >= 80) return "TRÈS PERTINENT";
  if (score >= 70) return "PERTINENT";
  if (score >= 60) return "À ÉVALUER";
  return "À EXAMINER";
}
function scoreClass(score: number) {
  if (score >= 90) return "border-[#c7a15a] bg-[#c7a15a]/10 text-[#c7a15a]";
  if (score >= 80) return "border-emerald-400/40 bg-emerald-400/5 text-emerald-300";
  if (score >= 70) return "border-sky-400/40 bg-sky-400/5 text-sky-300";
  return "border-white/10 bg-black text-white/65";
}

function PairCard({ match, canPresent, busy, onPresent }: {
  match: Suggestion; canPresent: boolean; busy: boolean; onPresent: (match: Suggestion) => void;
}) {
  return (
    <article className="border border-white/10 bg-[#0d1117] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.15em] text-white/35">{match.candidateAlias} ↔ {match.companyAlias}</p>
          <h4 className="mt-2 text-base leading-6 text-white">{match.jobTitle}</h4>
          {match.candidateHeadline ? <p className="mt-1 text-xs text-white/65">{match.candidateHeadline}</p> : null}
          <p className="mt-1 text-xs text-white/35">
            {[match.candidateLocation, match.candidateCountry, match.experienceYears !== null ? match.experienceYears + " an(s) d’expérience" : null].filter(Boolean).join(" · ") || "Informations de profil limitées"}
          </p>
          <p className="mt-3 text-xs leading-5 text-white/55">{match.reasons.join(" ") || "Score calculé à partir des informations disponibles."}</p>{match.countryFit === "FRANCE_SWITZERLAND_CROSS_BORDER" ? <p className="mt-2 border border-amber-400/30 bg-amber-400/5 px-2 py-1.5 text-[10px] text-amber-200">France ↔ Suisse : permis, mobilité et conditions locales à vérifier</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <div className={"border px-3 py-2 text-center " + scoreClass(match.score)}>
            <p className="text-2xl font-semibold">{match.score}%</p>
            <p className="text-[8px] uppercase tracking-[0.14em] opacity-70">{scoreLabel(match.score)}</p>
          </div>
          {match.presentationExists ? <span className="border border-emerald-400/30 px-2.5 py-1 text-[9px] uppercase tracking-wider text-emerald-300">Déjà présenté</span> : null}
        </div>
      </div>
      {match.matchedSkills.length ? <div className="mt-3">
        <p className="text-[9px] uppercase tracking-wider text-white/35">Compétences communes</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{match.matchedSkills.slice(0, 8).map((skill) => <span key={skill} className="border border-emerald-500/25 px-2 py-1 text-[10px] text-emerald-300">{skill}</span>)}</div>
      </div> : null}
      {match.missingSkills.length ? <p className="mt-3 text-[10px] leading-5 text-amber-200/70">À vérifier : {match.missingSkills.slice(0, 6).join(", ")}</p> : null}
      <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] uppercase tracking-wider text-white/30">{match.presentationExists ? "Dossier dans le parcours confidentiel" : "Proposition indicative · validation humaine requise"}</p>
        {match.presentationExists
          ? <span className="px-3 py-2 text-[10px] uppercase tracking-wider text-emerald-300/80">Présentation existante</span>
          : <button type="button" disabled={!canPresent || busy} onClick={() => onPresent(match)} className="border border-[#F97316] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#F97316] transition hover:bg-[#F97316]/10 disabled:cursor-not-allowed disabled:opacity-35" title={!canPresent ? "Action réservée à un rôle autorisé." : undefined}>{busy ? "Préparation…" : "Préparer la mise en relation"}</button>}
      </div>
    </article>
  );
}

export default function CvMatchingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [jobId, setJobId] = useState("");
  const [candidateMatches, setCandidateMatches] = useState<FocusedJobMatch[]>([]);
  const [jobMatches, setJobMatches] = useState<FocusedCandidateMatch[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [message, setMessage] = useState("");
  const [presentationMessage, setPresentationMessage] = useState("");
  const [presentingPairKey, setPresentingPairKey] = useState<string | null>(null);

  async function fetchOverview() {
    const response = await fetch("/api/owner/cv-matching?mode=overview", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossible de charger les propositions.");
    setOverview(data as Overview);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/owner/cv-candidates", { cache: "no-store" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les profils.");
        return data.candidates || [];
      }),
      fetch("/api/owner/cv-matching?mode=jobs", { cache: "no-store" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les offres.");
        return data.jobs || [];
      }),
      fetch("/api/owner/cv-matching?mode=overview", { cache: "no-store" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les propositions.");
        return data as Overview;
      }),
    ]).then(([candidateRows, jobRows, matchingOverview]) => {
      if (cancelled) return;
      setCandidates(candidateRows);
      setJobs(jobRows);
      setOverview(matchingOverview);
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Erreur de chargement.");
    }).finally(() => {
      if (cancelled) return;
      setLoadingCandidates(false);
      setLoadingJobs(false);
      setLoadingSuggestions(false);
    });
    return () => { cancelled = true; };
  }, []);

  const suggestions = overview?.suggestions || [];
  const byCandidate = useMemo(() => {
    const groups = new Map<string, Suggestion[]>();
    for (const item of (overview?.candidateSuggestions || suggestions)) groups.set(item.candidateId, [...(groups.get(item.candidateId) || []), item]);
    return [...groups.entries()].map(([id, matches]) => ({ id, matches })).slice(0, 12);
  }, [suggestions, overview?.candidateSuggestions]);
  const byOffer = useMemo(() => {
    const groups = new Map<string, Suggestion[]>();
    for (const item of (overview?.offerSuggestions || suggestions)) groups.set(item.jobId, [...(groups.get(item.jobId) || []), item]);
    return [...groups.entries()].map(([id, matches]) => ({ id, matches })).slice(0, 12);
  }, [suggestions, overview?.offerSuggestions]);

  async function runCandidateMatching(targetId = candidateId) {
    if (!targetId) return;
    setCandidateId(targetId); setLoading(true); setMessage(""); setJobMatches([]);
    try {
      const res = await fetch("/api/owner/cv-matching?candidateId=" + encodeURIComponent(targetId), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching impossible.");
      setCandidateMatches(data.matches || []);
      setMessage((data.matches?.length || 0) + " opportunité(s) analysées pour " + candidateAlias(targetId) + ".");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de matching."); setCandidateMatches([]);
    } finally { setLoading(false); }
  }

  async function runJobMatching(targetId = jobId) {
    if (!targetId) return;
    setJobId(targetId); setLoading(true); setMessage(""); setCandidateMatches([]);
    try {
      const res = await fetch("/api/owner/cv-matching?jobId=" + encodeURIComponent(targetId), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching impossible.");
      setJobMatches(data.matches || []);
      setMessage((data.matches?.length || 0) + " profil(s) analysés pour cette offre.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de matching."); setJobMatches([]);
    } finally { setLoading(false); }
  }

  async function preparePresentation(match: Suggestion) {
    if (!overview?.canPresent || match.presentationExists) return;
    const confirmed = window.confirm("Créer une présentation confidentielle pour ce profil et cette offre ? L’identité restera protégée. Aucun email ni contact externe ne sera envoyé automatiquement.");
    if (!confirmed) return;
    const key = match.candidateId + "::" + match.jobId;
    setPresentingPairKey(key); setPresentationMessage("");
    try {
      const response = await fetch("/api/owner/cv-matching", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "present", candidateId: match.candidateId, jobId: match.jobId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La présentation n’a pas pu être préparée.");
      setPresentationMessage(data.message || "Présentation confidentielle créée.");
      await fetchOverview();
    } catch (error) {
      setPresentationMessage(error instanceof Error ? error.message : "Erreur de présentation.");
    } finally { setPresentingPairKey(null); }
  }

  function findPair(candidate: string, job: string) {
    const all = [...(overview?.candidateSuggestions || []), ...(overview?.offerSuggestions || []), ...suggestions];
    return all.find((item) => item.candidateId === candidate && item.jobId === job);
  }

  return (
    <section className="mx-auto w-[min(1400px,calc(100%-40px))] py-10 md:py-16">
      <BackButton />
      <div className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c7a15a]">CV · IA · Matching transversal</p>
        <h1 className="mt-3 font-serif text-4xl text-white sm:text-5xl">Matching candidats ↔ offres</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">Les propositions apparaissent dès l’ouverture, classées par compatibilité décroissante. Examinez les compétences et les points à vérifier, puis décidez vous-même de préparer ou non une présentation confidentielle. Les scores guident le tri ; ils ne remplacent pas la décision du cabinet.</p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Profils actifs", overview?.candidateCount ?? "—"],
          ["Offres ouvertes", overview?.jobCount ?? "—"],
          ["Paires au-dessus du seuil", overview?.totalMatches ?? "—"],
          ["Propositions visibles", suggestions.length],
        ].map(([label, value]) => <div key={String(label)} className="border border-white/10 bg-[#111] p-5"><p className="text-[10px] uppercase tracking-[0.15em] text-white/40">{label}</p><p className="mt-3 font-serif text-3xl text-[#c7a15a]">{value}</p></div>)}
      </div>

      {presentationMessage ? <div aria-live="polite" className="mt-5 border border-[#F97316]/30 bg-[#F97316]/5 p-4 text-sm leading-6 text-white/80">{presentationMessage}<button type="button" onClick={() => setPresentationMessage("")} className="ml-3 text-xs uppercase tracking-wider text-[#F97316]">Fermer</button></div> : null}
      {message ? <p aria-live="polite" className="mt-4 border border-white/10 p-4 text-sm text-amber-100/80">{message}</p> : null}

      <section className="mt-8 border border-white/10 bg-[#0b0f14] p-5 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#F97316]">Candidat → opportunités</p><h2 className="mt-2 font-serif text-2xl text-white">Profils et meilleures opportunités</h2><p className="mt-2 text-xs leading-5 text-white/45">Les trois meilleures offres apparaissent automatiquement pour chaque profil proposé.</p></div>
          <button type="button" onClick={() => { setLoadingSuggestions(true); fetchOverview().catch((error) => setMessage(error instanceof Error ? error.message : "Actualisation impossible.")).finally(() => setLoadingSuggestions(false)); }} className="self-start border border-white/15 px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/65 hover:border-[#c7a15a]/60">Actualiser les propositions</button>
        </div>
        {loadingSuggestions ? <p className="mt-5 text-sm text-white/45">Calcul des meilleures correspondances…</p> : null}
        {!loadingSuggestions && byCandidate.length === 0 ? <div className="mt-5 border border-white/10 p-6"><h3 className="text-lg text-white">Aucune proposition au-dessus du seuil actuel</h3><p className="mt-2 text-sm leading-6 text-white/45">Vérifiez que les CV sont intégrés et analysés et que des offres sont ouvertes. Aucun résultat artificiel n’est ajouté.</p></div> : (
          <div className="mt-5 space-y-5">
            {byCandidate.map(({ id, matches }) => <article key={id} className="border border-white/10 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-base text-white">{matches[0]?.candidateAlias || candidateAlias(id)}</p><p className="mt-1 text-xs text-white/50">{matches[0]?.candidateHeadline || "Profil candidat"}</p><p className="mt-1 text-[10px] text-white/35">{[matches[0]?.candidateLocation, matches[0]?.candidateCountry, matches[0]?.experienceYears !== null && matches[0]?.experienceYears !== undefined ? matches[0].experienceYears + " an(s) d’expérience" : null].filter(Boolean).join(" · ")}</p></div><button type="button" onClick={() => void runCandidateMatching(id)} disabled={loading} className="border border-white/15 px-3 py-2 text-[9px] uppercase tracking-wider text-white/60 disabled:opacity-40">Voir toutes ses opportunités</button></div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">{matches.slice(0, 3).map((match) => <PairCard key={match.jobId + match.candidateId} match={match} canPresent={Boolean(overview?.canPresent)} busy={presentingPairKey === match.candidateId + "::" + match.jobId} onPresent={preparePresentation} />)}</div>
            </article>)}
          </div>
        )}
        {overview?.truncated ? <p className="mt-5 text-xs leading-5 text-amber-100/70">Affichage limité aux 100 meilleures paires calculées. Utilisez la recherche ciblée ci-dessous pour examiner un profil ou une offre spécifique.</p> : null}
      </section>

      <section className="mt-8 border border-white/10 bg-[#0b0f14] p-5 md:p-7">
        <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Offre → candidats</p><h2 className="mt-2 font-serif text-2xl text-white">Offres et meilleurs profils proposés</h2><p className="mt-2 text-xs leading-5 text-white/45">Chaque offre rassemble également ses meilleurs profils, pour préparer une mise en relation au cas par cas.</p></div>
        {!loadingSuggestions && byOffer.length === 0 ? <p className="mt-5 border border-white/10 p-6 text-sm text-white/45">Aucune offre ne dispose actuellement d’une proposition au-dessus du seuil.</p> : (
          <div className="mt-5 space-y-5">{byOffer.map(({ id, matches }) => <article key={id} className="border border-white/10 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/35">{matches[0]?.companyAlias}</p><h3 className="mt-2 text-lg text-white">{matches[0]?.jobTitle}</h3><p className="mt-1 text-xs text-white/45">{matches[0]?.jobLocation || "Localisation non précisée"}</p></div><button type="button" onClick={() => void runJobMatching(id)} disabled={loading} className="border border-white/15 px-3 py-2 text-[9px] uppercase tracking-wider text-white/60 disabled:opacity-40">Voir tous les profils</button></div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">{matches.slice(0, 3).map((match) => <PairCard key={match.jobId + match.candidateId} match={match} canPresent={Boolean(overview?.canPresent)} busy={presentingPairKey === match.candidateId + "::" + match.jobId} onPresent={preparePresentation} />)}</div>
          </article>)}</div>
        )}
      </section>

      <section className="mt-8 border border-white/10 bg-[#111] p-5 md:p-7">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">Recherche ciblée</p><h2 className="mt-2 font-serif text-2xl text-white">Explorer un candidat ou une offre</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">Les propositions automatiques restent visibles ci-dessus. Les sélections permettent de lancer une analyse ciblée ; aucune présentation n’est créée sans validation explicite.</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="border border-white/10 bg-black/25 p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Candidat → opportunités</p><label className="mt-4 block text-xs uppercase tracking-[0.16em] text-white/45">Profil candidat</label><div className="mt-3 flex flex-col gap-3">
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="">Sélectionner un profil</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidateAlias(candidate.id)}{candidate.headline ? " — " + candidate.headline : ""}</option>)}</select>
            <button disabled={!candidateId || loading} onClick={() => void runCandidateMatching()} className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-40">{loading ? "Analyse…" : "Voir les opportunités"}</button>
          </div>{loadingCandidates ? <p className="mt-3 text-xs text-white/35">Chargement des profils…</p> : null}</div>
          <div className="border border-white/10 bg-black/25 p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">Offre → candidats</p><label className="mt-4 block text-xs uppercase tracking-[0.16em] text-white/45">Offre ouverte</label><div className="mt-3 flex flex-col gap-3">
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="">Sélectionner une offre</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} — {job.company.name}</option>)}</select>
            <button disabled={!jobId || loading} onClick={() => void runJobMatching()} className="border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-40">{loading ? "Analyse…" : "Voir les candidats"}</button>
          </div>{loadingJobs ? <p className="mt-3 text-xs text-white/35">Chargement des offres…</p> : null}</div>
        </div>
        <div className="mt-5 space-y-3">
          {candidateMatches.map((match, index) => <article key={match.jobId} className="border border-white/10 bg-black/25 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.18em] text-white/30">#{index + 1} · {scoreLabel(match.score)}</p><p className="mt-1 font-serif text-xl text-white">{match.title}</p><p className="mt-1 text-xs text-white/45">{match.companyAlias} · {match.location || "Localisation non précisée"}</p><p className="mt-3 text-xs text-white/50">{match.reasons.join(" ")}</p>{match.matchedSkills.length ? <p className="mt-2 text-xs text-emerald-300/80">Compétences communes : {match.matchedSkills.slice(0, 8).join(", ")}</p> : null}</div><div className={"min-w-28 border px-5 py-3 text-center " + scoreClass(match.score)}><p className="font-serif text-3xl">{match.score}</p><p className="text-[9px] uppercase tracking-[0.16em] opacity-60">score /100</p></div></div>
            {findPair(candidateId, match.jobId) ? <button type="button" onClick={() => void preparePresentation(findPair(candidateId, match.jobId)!)} disabled={!overview?.canPresent || findPair(candidateId, match.jobId)?.presentationExists} className="mt-4 border border-[#F97316] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#F97316] disabled:opacity-35">{findPair(candidateId, match.jobId)?.presentationExists ? "Déjà présenté" : "Préparer la mise en relation"}</button> : null}
          </article>)}
          {jobMatches.map((match, index) => { const suggested = findPair(match.candidateId, jobId); return <article key={match.candidateId} className="border border-white/10 bg-black/25 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.18em] text-white/30">#{index + 1} · {scoreLabel(match.score)}</p><p className="mt-1 font-serif text-xl text-white">{match.candidateAlias}</p><p className="mt-1 text-xs text-white/45">{match.headline || "Profil candidat"} · {[match.location, match.country, match.experienceYears !== null ? match.experienceYears + " an(s) d’expérience" : null].filter(Boolean).join(" · ")}</p><p className="mt-3 text-xs text-white/50">{match.reasons.join(" ")}</p>{match.matchedSkills.length ? <p className="mt-2 text-xs text-emerald-300/80">Compétences communes : {match.matchedSkills.slice(0, 8).join(", ")}</p> : null}</div><div className={"min-w-28 border px-5 py-3 text-center " + scoreClass(match.score)}><p className="font-serif text-3xl">{match.score}</p><p className="text-[9px] uppercase tracking-[0.16em] opacity-60">score /100</p></div></div>
            {suggested ? <button type="button" onClick={() => void preparePresentation(suggested)} disabled={!overview?.canPresent || suggested.presentationExists} className="mt-4 border border-[#F97316] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#F97316] disabled:opacity-35">{suggested.presentationExists ? "Déjà présenté" : "Préparer la mise en relation"}</button> : <p className="mt-3 text-xs text-white/35">Aucune proposition disponible pour cette paire dans les résultats chargés ; actualisez avant décision.</p>}
          </article>; })}
          {!loading && (candidateId || jobId) && candidateMatches.length === 0 && jobMatches.length === 0 ? <p className="border border-white/10 p-5 text-sm text-white/40">Aucun résultat ciblé à afficher.</p> : null}
        </div>
      </section>
      {!overview?.canPresent ? <p className="mt-5 border border-white/10 p-4 text-xs leading-5 text-white/45">Consultation seule : la préparation d’une présentation confidentielle nécessite le rôle OWNER ou une permission ADMIN explicitement accordée.</p> : null}
    </section>
  );
}
