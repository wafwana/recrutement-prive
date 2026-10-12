"use client";

import { useState } from "react";

type Props = {
  sectorCode: string;
  sectorName: string;
  professionCode?: string;
  professionName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
};

export default function LancerRechercheModal({
  sectorCode,
  sectorName,
  professionCode,
  professionName,
  buttonLabel = "Lancer une recherche",
  buttonClassName = "border border-[#c7a15a] bg-[#c7a15a]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#c7a15a] hover:bg-[#c7a15a]/20",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(professionName || sectorName);
  const [country, setCountry] = useState("");
  const [skills, setSkills] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    fetched?: number;
    created?: number;
    updated?: number;
    message?: string;
    targetFolder?: string;
    activeSourcesCount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const parsedSkills = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/sourcing/global-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          sectorCode,
          professionCode: professionCode || undefined,
          country: country.trim() || undefined,
          skills: parsedSkills.length ? parsedSkills : undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Échec du lancement de la recherche.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du traitement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl border border-white/15 bg-[#111] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#c7a15a]">
                  Sourcing autonome · {sectorName}
                </p>
                <h3 className="mt-1 font-serif text-2xl">
                  {professionName ? `Recherche : ${professionName}` : `Recherche secteur : ${sectorName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
                  Intitulé / Mots-clés recherchés
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex. Croupier, Chef de table, Technicien slot..."
                  className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c7a15a]"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
                    Pays cible (facultatif)
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Ex. France, Monaco, Suisse..."
                    className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
                    Compétences clés (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Ex. Blackjack, Roulette, B2B..."
                    className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">
                  URL source personnalisée HTTPS (facultatif)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full border border-white/10 bg-[#0b0b0b] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
                />
              </div>

              {error && (
                <div className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              {result && (
                <div className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 space-y-1">
                  <p className="font-semibold text-emerald-300">
                    {result.ok ? "Recherche exécutée avec succès" : "Information Sourcing"}
                  </p>
                  {result.message ? (
                    <p className="text-white/80">{result.message}</p>
                  ) : (
                    <>
                      <p>Sources interrogées : {result.activeSourcesCount ?? 1}</p>
                      <p>Profils récupérés : {result.fetched ?? 0}</p>
                      <p>Nouveaux profils ajoutés : {result.created ?? 0}</p>
                      <p>Profils mis à jour : {result.updated ?? 0}</p>
                      {result.targetFolder && (
                        <p className="font-mono text-[11px] text-[#c7a15a]">
                          Dossier de classement : {result.targetFolder}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-white/60 hover:bg-white/5"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="border border-[#c7a15a] bg-[#c7a15a] px-5 py-2 text-[10px] uppercase tracking-[0.14em] text-[#111] hover:bg-[#d8b26b] disabled:opacity-50"
                >
                  {busy ? "Recherche en cours…" : "Lancer le sourcing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
