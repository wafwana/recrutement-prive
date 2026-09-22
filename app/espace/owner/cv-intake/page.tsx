"use client";

import { useEffect, useMemo, useState } from "react";

type Analysis = {
  headline?: string | null;
  summary?: string | null;
  improvedSummary?: string | null;
  skills?: string[];
  explicitSkills?: string[];
  experienceYears?: number | null;
  experiences?: Array<{ title: string; company?: string | null; start?: string | null; end?: string | null; durationYears?: number | null }>;
  education?: string[];
  certifications?: string[];
  languages?: string[];
  primaryCategoryCode?: string | null;
  subCategoryCodes?: string[];
  alternativeCategoryCodes?: string[];
  suggestedPositioning?: string[];
  suggestedMatches?: Array<{ jobId: string; title: string; score: number }>;
};

type Cv = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  originalSha256: string;
  senderEmail: string;
  senderRole: string;
  candidateName: string | null;
  candidateEmail: string | null;
  folderPath: string;
  analysis: Analysis | null;
  matching: { suggestedMatches?: Array<{ jobId: string; title: string; score: number }> } | null;
  analyzedAt: string | null;
  status: string;
  createdAt: string;
};

export default function RealCvRegistryPage() {
  const [items, setItems] = useState<Cv[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/owner/cv-intake${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Accès refusé.");
    setItems(data.documents || []);
    setFolders(data.folders || []);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, []);

  async function importCv() {
    if (!file) return setMessage("Sélectionnez un CV.");
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      if (candidateName.trim()) form.set("candidateName", candidateName.trim());
      if (candidateEmail.trim()) form.set("candidateEmail", candidateEmail.trim());
      const res = await fetch("/api/owner/cv-intake", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import impossible.");
      setMessage(`CV intégré et original verrouillé : ${data.document.name}`);
      setFile(null);
      setCandidateName("");
      setCandidateEmail("");
      const input = document.getElementById("real-cv-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => folder ? items.filter((item) => item.folderPath === folder) : items, [items, folder]);

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">OWNER · CV réels</p>
      <h1 className="mt-3 font-serif text-4xl text-white">Registre des CV intégrés</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
        L'original est conservé intégralement, identifié par empreinte SHA-256 et jamais réécrit. L'analyse enrichie, le classement et le matching sont des données dérivées et révisables.
      </p>

      <div className="mt-8 border border-white/10 bg-[#111] p-6">
        <h2 className="font-serif text-2xl text-white">Intégrer un CV réel</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <input id="real-cv-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white/70 md:col-span-3" />
          <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Nom du candidat (facultatif)" className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white" />
          <input value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="Email du candidat (facultatif)" className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white" />
          <button disabled={busy} onClick={importCv} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40">{busy ? "Analyse…" : "Intégrer et analyser"}</button>
        </div>
        {message ? <p className="mt-4 border border-white/10 px-4 py-3 text-xs text-white/60">{message}</p> : null}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_320px_auto]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Rechercher un CV, candidat ou dossier…" className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none" />
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
          <option value="">Tous les dossiers ({items.length})</option>
          {folders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={() => load().catch((e) => setMessage(e.message))} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/60">Actualiser</button>
      </div>

      <div className="mt-8 space-y-4">
        {visible.map((cv) => (
          <article key={cv.id} className="border border-white/10 bg-[#111] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-medium text-white">{cv.name}</h2>
                  <span className="bg-emerald-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-emerald-300">Original verrouillé</span>
                  <span className="bg-white/5 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/50">{cv.status}</span>
                </div>
                <p className="mt-2 text-xs font-mono text-[#c7a15a]">{cv.folderPath}</p>
                <p className="mt-2 text-xs text-white/35">Introduit par {cv.senderEmail} ({cv.senderRole}) · {new Date(cv.createdAt).toLocaleString("fr-FR")}</p>
                <p className="mt-1 text-[10px] text-white/25">SHA-256 : {cv.originalSha256}</p>
              </div>
              <a href={`/api/owner/cv-intake/${cv.id}/original`} target="_blank" rel="noreferrer" className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/65">Original ↗</a>
            </div>

            {cv.analysis ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Métier principal</p>
                  <p className="mt-2 text-sm text-white/80">{cv.analysis.headline || cv.analysis.primaryCategoryCode || "À préciser"}</p>
                  <p className="mt-3 text-xs leading-6 text-white/50">{cv.analysis.improvedSummary || cv.analysis.summary || "Analyse disponible sans résumé enrichi."}</p>
                  <p className="mt-3 text-xs text-white/45">Compétences : {(cv.analysis.explicitSkills || cv.analysis.skills || []).join(" · ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Formations / certifications</p>
                  <p className="mt-2 text-xs leading-6 text-white/60">{(cv.analysis.education || []).join(" · ") || "—"}</p>
                  <p className="mt-1 text-xs leading-6 text-white/60">{(cv.analysis.certifications || []).join(" · ") || "—"}</p>
                  <p className="mt-3 text-xs text-white/45">Langues : {(cv.analysis.languages || []).join(" · ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Secteurs complémentaires</p>
                  <p className="mt-2 text-xs text-white/65">{(cv.analysis.alternativeCategoryCodes || []).join(" · ") || "Aucune suggestion suffisamment étayée."}</p>
                  <p className="mt-2 text-xs text-white/40">Positionnement proposé : {(cv.analysis.suggestedPositioning || []).join(" · ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Matching transversal</p>
                  <p className="mt-2 text-xs text-white/65">{(cv.matching?.suggestedMatches || cv.analysis.suggestedMatches || []).slice(0, 5).map((m) => `${m.title} (${m.score}/100)`).join(" · ") || "Aucune offre ouverte correspondante actuellement."}</p>
                </div>
              </div>
            ) : <p className="mt-5 text-sm text-white/40">Analyse non disponible : le CV reste conservé et classé en attente.</p>}
          </article>
        ))}
        {!visible.length ? <p className="border border-white/10 p-6 text-sm text-white/40">Aucun CV réel intégré.</p> : null}
      </div>
    </section>
  );
}
