"use client";

import { useEffect, useMemo, useState } from "react";

type CvDoc = {
  id: string;
  name: string;
  folderPath: string;
  analyzedAt: string | null;
  isPrimaryCv: boolean;
  analysis: { primaryCategoryCode?: string | null; subCategoryCodes?: string[]; alternativeCategoryCodes?: string[]; suggestedMatches?: Array<{ jobId: string; title: string; categoryCode?: string | null; score: number }> } | null;
  createdAt: string;
  candidate: { id: string | null; user: { name: string | null; email: string | null } } | null;
  source?: "CANDIDATE_DOCUMENT" | "CV_INTAKE";
  status?: string;
};

export default function CvLibraryPage() {
  const [docs, setDocs] = useState<CvDoc[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/documents/cv-library?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Accès refusé.");
      setDocs(data.documents || []);
      setFolders(data.folders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => folder ? docs.filter((doc) => doc.folderPath === folder) : docs, [docs, folder]);

  return (
    <section className="mx-auto w-[min(1200px,calc(100%-40px))] py-12 md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Bibliothèque CV</p>
      <h1 className="mt-3 font-serif text-4xl text-white">CV classés et retrouvables</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
        Les CV sont organisés par dossier métier puis sous-dossier métier. L'analyse et le classement ne suppriment jamais le document original.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_320px_auto]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Rechercher un CV, candidat ou dossier…" className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none" />
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
          <option value="">Tous les dossiers ({docs.length})</option>
          {folders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={load} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Actualiser</button>
      </div>

      {error ? <p className="mt-6 border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-8 space-y-3">
        {loading ? <p className="text-sm text-white/40">Chargement des CV…</p> : null}
        {!loading && visible.length === 0 ? <p className="border border-white/10 p-6 text-sm text-white/40">Aucun CV dans ce dossier.</p> : null}
        {visible.map((doc) => (
          <article key={doc.id} className="border border-white/10 bg-[#111] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-white">{doc.name}</p>
                  {doc.isPrimaryCv ? <span className="border border-[#c7a15a]/30 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#c7a15a]">CV principal</span> : null}
                  <span className={`px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${doc.analyzedAt ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    {doc.analyzedAt ? "Analysé" : "À analyser"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#c7a15a] font-mono">{doc.folderPath}</p>
                {doc.analysis?.alternativeCategoryCodes?.length ? (
                  <p className="mt-2 text-xs text-white/50">
                    Opportunités dans d’autres secteurs : <span className="text-white/75">{doc.analysis.alternativeCategoryCodes.join(" · ")}</span>
                  </p>
                ) : null}
                {doc.analysis?.suggestedMatches?.length ? (
                  <p className="mt-1 text-xs text-white/35">
                    Matching : {doc.analysis.suggestedMatches.slice(0, 3).map((match) => `${match.title} (${match.score}/100)`).join(" · ")}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-white/40">
                  {doc.candidate?.user.name || "Candidat sans nom"} · {doc.candidate?.user.email || "Email non renseigné"}
                </p>
                {doc.source === "CV_INTAKE" ? (
                  <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#F97316]">
                    Source : Intégrer un CV · {doc.status || "conservé"}
                  </p>
                ) : null}
              </div>
              <a
                href={doc.source === "CV_INTAKE"
                  ? `/api/owner/cv-intake/${doc.id}/original`
                  : `/api/candidats/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/65"
              >
                Consulter le CV ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
