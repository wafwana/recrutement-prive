"use client";

import { useState } from "react";

export default function SourcingExecutionPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function runSourcing() {
    setRunning(true); setMessage(null);
    try {
      const res = await fetch("/api/sourcing/global-candidates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: query || undefined, country: country || undefined }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Le sourcing n'a pas pu être lancé.");
      setMessage(data?.ok === false ? (data.message || "Aucune source active.") : String(data?.fetched || 0) + " profil(s) extrait(s), " + String(data?.created || 0) + " nouveau(x), " + String(data?.matched || 0) + " match(s).");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erreur pendant le sourcing."); }
    finally { setRunning(false); }
  }
  return <section className="mx-auto w-[min(1180px,calc(100%-40px))] py-12 md:py-20">
    <p className="text-[10px] uppercase tracking-[0.35em] text-[#F97316]">02 · Sourcing</p>
    <h1 className="mt-3 font-serif text-4xl text-white">Collecte des profils candidats</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Cette vue correspond réellement à l'étape de collecte : choisissez un critère et observez le résultat du passage du moteur.</p>
    <div className="mt-10 border border-white/10 bg-[#111] p-6"><div className="grid gap-4 md:grid-cols-3">
      <label className="text-xs text-white/45">Recherche / compétence<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex. React, finance, RH…" className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#F97316]" /></label>
      <label className="text-xs text-white/45">Pays / localisation<input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ex. France, Dubai…" className="mt-2 w-full border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#F97316]" /></label>
      <div className="flex items-end"><button onClick={runSourcing} disabled={running} className="w-full border border-[#F97316] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#F97316] disabled:opacity-40">{running ? "Collecte en cours…" : "Lancer le sourcing"}</button></div>
    </div>{message ? <p aria-live="polite" className="mt-5 border border-white/10 p-4 text-xs text-white/65">{message}</p> : null}</div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{[["Collecte","Le moteur interroge uniquement les sources autorisées.","text-[#F97316]"],["Déduplication","Les profils déjà connus ne sont pas recréés inutilement.","text-white"],["Provenance","Chaque profil conserve sa source d'origine.","text-[#c7a15a]"]].map(([title,desc,color]) => <article key={title} className="border border-white/10 bg-[#0d0d0d] p-5"><p className={"text-[10px] uppercase tracking-[0.18em] " + color}>{title}</p><p className="mt-2 text-sm leading-6 text-white/50">{desc}</p></article>)}</div>
  </section>;
}
