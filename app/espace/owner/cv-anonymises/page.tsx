"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/navigation/BackButton";

type Profile = {
  id: string; reference: string; folderPath: string; analyzedAt: string | null; createdAt: string; status: string;
  profile: { headline: string | null; skills: string[]; languages: string[]; experienceYears: number | null; careerLevel: string | null; primaryCategoryCode: string | null; subCategoryCodes: string[]; alternativeCategoryCodes: string[]; suggestedPositioning: string[] };
};

export default function AnonymizedCvWorkspacePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/owner/cv-anonymized", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les profils.");
      setProfiles(data.profiles || []); setFolders(data.folders || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur de chargement."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => profiles.filter((p) => (!folder || p.folderPath === folder) &&
    (!query || [p.reference, p.folderPath, p.profile.headline, ...p.profile.skills, ...p.profile.subCategoryCodes, ...p.profile.alternativeCategoryCodes].some((v) => (v || "").toLocaleLowerCase().includes(query.toLocaleLowerCase())))), [profiles, folder, query]);

  return <main className="mx-auto w-[min(1200px,calc(100%-40px))] py-10 md:py-16">
    <BackButton />
    <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Recrutement Privé · espace Owner</p>
    <h1 className="mt-3 font-serif text-4xl text-white">CV anonymisés — espace de travail</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">Retrouvez les profils analysés, filtrez par métier et préparez votre présélection sans afficher les noms, e-mails, téléphones ni les CV originaux. La mise en relation reste une étape distincte et autorisée.</p>
    <div className="mt-5 border border-[#c7a15a]/30 bg-[#c7a15a]/5 p-4 text-sm text-[#e6d2a7]">Confidentialité : cette vue ne propose aucun téléchargement du CV original. Les informations professionnelles extraites peuvent néanmoins contenir des éléments indirectement identifiants ; vérifiez-les avant tout partage externe.</div>
    <div className="mt-7 grid gap-3 md:grid-cols-[1fr_320px_auto]">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Métier, compétence, référence…" className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none" />
      <select value={folder} onChange={(e) => setFolder(e.target.value)} className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none"><option value="">Tous les dossiers ({profiles.length})</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select>
      <button onClick={() => void load()} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Actualiser</button>
    </div>
    {error ? <p className="mt-5 border border-red-500/30 p-4 text-sm text-red-300">{error}</p> : null}
    <div className="mt-7 space-y-3">
      {loading ? <p className="text-sm text-white/50">Chargement des profils…</p> : null}
      {!loading && visible.length === 0 ? <p className="border border-white/10 p-6 text-sm text-white/50">Aucun profil correspondant. Vérifiez que des CV ont été intégrés et analysés.</p> : null}
      {visible.map((item) => <article key={item.id} className="border border-white/10 bg-[#111] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-mono tracking-wider text-[#c7a15a]">{item.reference}</p><h2 className="mt-2 text-lg font-medium text-white">{item.profile.headline || item.profile.suggestedPositioning[0] || item.profile.primaryCategoryCode || "Profil professionnel"}</h2><p className="mt-2 text-xs text-white/45">{item.folderPath}</p></div>
          <span className="border border-white/10 px-3 py-1 text-[9px] uppercase tracking-wider text-white/60">{item.analyzedAt ? "Analysé" : "À analyser"}</span>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><p className="text-[10px] uppercase tracking-wider text-white/35">Expérience</p><p className="mt-1 text-white/80">{item.profile.experienceYears === null ? "Non renseignée" : `${item.profile.experienceYears} ans`}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-white/35">Niveau</p><p className="mt-1 text-white/80">{item.profile.careerLevel || "Non spécifié"}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-white/35">Langues</p><p className="mt-1 text-white/80">{item.profile.languages.join(" · ") || "Non renseignées"}</p></div>
        </div>
        <div className="mt-4"><p className="text-[10px] uppercase tracking-wider text-white/35">Compétences extraites</p><div className="mt-2 flex flex-wrap gap-2">{item.profile.skills.length ? item.profile.skills.map((s) => <span key={s} className="border border-white/10 px-2 py-1 text-xs text-white/75">{s}</span>) : <span className="text-xs text-white/40">À compléter par l’analyse</span>}</div></div>
        {item.profile.subCategoryCodes.length || item.profile.alternativeCategoryCodes.length ? <p className="mt-4 text-xs text-white/45">Métiers / secteurs : {[...item.profile.subCategoryCodes, ...item.profile.alternativeCategoryCodes].join(" · ")}</p> : null}
      </article>)}
    </div>
  </main>;
}
