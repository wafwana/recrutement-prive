"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  sectorCode: string;
  sectorName: string;
  professionCode?: string;
  professionName?: string;
  suggestedSkills?: string[];
};

type SearchResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  searchId?: string;
  search?: {
    id: string;
    title: string;
    status: string;
    resultCount: number;
    classifiedCount: number;
    toQualifyCount: number;
    sources: Array<{ sourceUrl: string; fetched: number; sourceTotal: number; created: number; updated: number; error?: string }>;
  };
};

export default function ProactiveSearchButton({
  sectorCode,
  sectorName,
  professionCode,
  professionName,
  suggestedSkills = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(professionName || "");
  const [country, setCountry] = useState("");
  const [skillsText, setSkillsText] = useState(suggestedSkills.join(", "));
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse["search"] | null>(null);

  async function launch() {
    setRunning(true);
    setMessage(null);
    setResult(null);
    try {
      const skills = skillsText.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
      const response = await fetch("/api/sourcing/proactive-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectorCode,
          professionCode,
          query: query.trim(),
          country: country.trim(),
          skills,
        }),
      });
      const data = (await response.json()) as SearchResponse;
      if (!response.ok || !data.search) throw new Error(data.error || data.details || "La recherche a échoué.");
      setResult(data.search);
      setMessage(data.search.status === "COMPLETED"
        ? "Recherche terminée. Les résultats sont enregistrés dans le suivi des recherches."
        : data.search.status === "PARTIAL"
          ? "Recherche partielle : certains flux ont échoué. Les sources et erreurs sont conservées."
          : "La recherche n'a produit aucun résultat exploitable.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur de recherche.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setMessage(null); setResult(null); }}
        className="inline-flex items-center justify-center gap-2 border border-[#F97316]/60 bg-[#F97316]/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#F97316] hover:bg-[#F97316]/15"
      >
        Recherche automatique
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Recherche proactive de candidats">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-white/15 bg-[#111] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#F97316]">Recherche proactive · sans offre ni client</p>
                <h2 className="mt-2 font-serif text-2xl text-white">{professionName || sectorName}</h2>
                <p className="mt-2 text-xs leading-5 text-white/45">Les sources réellement interrogées et les erreurs seront enregistrées. Aucun candidat ne sera contacté automatiquement. Les profils sans CV analysé resteront explicitement non vérifiés.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="border border-white/15 px-3 py-2 text-xs text-white/60" aria-label="Fermer">Fermer</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Métier / compétence recherchée</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={160} placeholder="Ex. Croupier, roulette, jeux électroniques" className="mt-2 h-11 w-full border border-white/15 bg-[#080808] px-3 text-sm text-white outline-none focus:border-[#F97316]/70" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Pays / zone (facultatif)</span>
                <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={100} placeholder="France, Belgique, Dubaï..." className="mt-2 h-11 w-full border border-white/15 bg-[#080808] px-3 text-sm text-white outline-none focus:border-[#F97316]/70" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Secteur</span>
                <input value={sectorName} readOnly className="mt-2 h-11 w-full border border-white/10 bg-white/[0.03] px-3 text-sm text-white/55" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-white/45">Compétences et synonymes (séparés par des virgules)</span>
                <textarea value={skillsText} onChange={(event) => setSkillsText(event.target.value)} rows={3} maxLength={3000} placeholder="Ex. roulette, blackjack, surveillance vidéo" className="mt-2 w-full border border-white/15 bg-[#080808] px-3 py-3 text-sm text-white outline-none focus:border-[#F97316]/70" />
              </label>
            </div>

            {message && <p className="mt-4 border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">{message}</p>}
            {result && (
              <div className="mt-4 border border-[#F97316]/25 bg-[#F97316]/5 p-4">
                <p className="text-sm text-white">{result.resultCount} profil(s) enregistré(s) · {result.classifiedCount} classé(s) · {result.toQualifyCount} à qualifier</p>
                <p className="mt-2 text-xs text-white/50">Statut : {result.status}</p>
                <div className="mt-3 space-y-2">
                  {result.sources.map((source, index) => (
                    <p key={source.sourceUrl + index} className="break-all text-xs text-white/55">
                      {source.sourceUrl} — {source.fetched} résultat(s){source.error ? ` · Erreur : ${source.error}` : ""}
                    </p>
                  ))}
                </div>
                <Link href={`/espace/owner/recherche-proactive?id=${result.id}`} className="mt-4 inline-block border border-[#F97316]/50 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[#F97316]">Voir la recherche et son historique</Link>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
              <button type="button" onClick={() => setOpen(false)} className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-white/55">Annuler</button>
              <button type="button" disabled={running} onClick={launch} className="border border-[#F97316] bg-[#F97316]/10 px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-[#F97316] disabled:cursor-wait disabled:opacity-50">
                {running ? "Recherche en cours…" : "Lancer la recherche"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
