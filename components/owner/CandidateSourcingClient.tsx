"use client";

import { useState } from "react";

type SourcedCandidateItem = {
  id: string;
  externalId: string | null;
  source: string;
  sourceProfileUrl: string | null;
  sourceCollectedAt: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  skills: string[] | null;
  experienceYears: number | null;
  status: string;
  matchingScore: number | null;
  notes: string | null;
  createdAt: string;
};

type JobOption = {
  id: string;
  title: string;
};

type AuditSummary = {
  createdAt: string;
  details: unknown;
} | null;

export default function CandidateSourcingClient({
  initialCandidates,
  activeSourcesCount,
  candidateSources,
  jobs,
  lastAudit,
}: {
  initialCandidates: SourcedCandidateItem[];
  activeSourcesCount: number;
  candidateSources: string[];
  jobs: JobOption[];
  lastAudit: AuditSummary;
}) {
  const [candidates, setCandidates] = useState<SourcedCandidateItem[]>(initialCandidates);
  const [query, setQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function handleRunSourcing() {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/sourcing/global-candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJobId || undefined,
          query: query || undefined,
          country: selectedCountry || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur lors du sourcing candidats.");

      if (data.ok === false) {
        setRunMessage(data.message || "Aucune source active.");
      } else {
        setRunMessage(
          `${data.fetched || 0} candidat(s) extrait(s), ${data.created || 0} nouveau(x), ${data.matched || 0} correspondu(s).`
        );
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setRunMessage(err instanceof Error ? err.message : "Erreur pendant le sourcing.");
    } finally {
      setRunning(false);
    }
  }

  async function handleCandidateAction(candidateId: string, action: "VALIDATE" | "REJECT" | "REVIEW" | "RESET") {
    setActionLoadingId(candidateId);
    try {
      const res = await fetch("/api/sourcing/candidate-actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action échouée.");

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? {
                ...c,
                status:
                  action === "VALIDATE"
                    ? "VALIDATED"
                    : action === "REJECT"
                    ? "REJECTED"
                    : action === "REVIEW"
                    ? "REVIEWING"
                    : "DETECTED",
              }
            : c
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur action.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Filter candidates locally
  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const matchHeadline = (c.headline || "").toLowerCase().includes(q);
      const matchSkills = (c.skills || []).some((s) => s.toLowerCase().includes(q));
      if (!matchHeadline && !matchSkills) return false;
    }
    if (selectedCountry) {
      if (!(c.location || "").toLowerCase().includes(selectedCountry.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Configuration status banner */}
      {activeSourcesCount === 0 ? (
        <div className="border border-[#F97316]/40 bg-[#F97316]/10 p-5 text-sm text-white/80">
          <div className="flex items-start gap-3">
            <span className="text-xl text-[#F97316]">⚠️</span>
            <div>
              <h3 className="font-medium text-[#F97316]">Aucune source candidats active</h3>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                Le sourcing candidats automatique requiert la configuration de la variable d&apos;environnement{" "}
                <code className="bg-black/40 px-1.5 py-0.5 text-[#c7a15a]">RP_GLOBAL_CANDIDATE_SOURCES</code> avec une liste
                d&apos;URLs HTTPS sécurisées (format JSON). Conforme au RGPD : aucun profil fictif ou simulé n&apos;est créé.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-[#c7a15a]/30 bg-[#111] p-4 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong className="text-white">{activeSourcesCount}</strong> source(s) candidats active(s) configurée(s)
            </span>
          </div>
          <div className="text-[10px] text-white/40">
            {lastAudit ? `Dernier passage : ${new Date(lastAudit.createdAt).toLocaleString("fr-FR")}` : "Aucun historique"}
          </div>
        </div>
      )}

      {/* Human Validation Disclaimer */}
      <div className="border border-white/10 bg-[#0d0d0d] p-4 text-xs text-white/60 leading-relaxed">
        <strong className="text-[#c7a15a]">🔒 Accord & Validation Humaine RP :</strong> Les profils découverts par le sourcing
        restent strictement internes sous statut <span className="text-white/80 font-mono">DÉCOUVERT / À VÉRIFIER</span>.
        Aucune prise de contact ou mise en relation avec une entreprise ne peut être effectuée sans la validation explicite d&apos;un membre
        du staff RP.
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 gap-4 border border-white/10 bg-[#111] p-5 md:grid-cols-5">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Recherche / Compétence</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: React, RH, Développeur..."
            className="mt-1.5 w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Pays / Localisation</label>
          <input
            type="text"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            placeholder="Ex: France, Maroc, Sénégal..."
            className="mt-1.5 w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Offre RP Cible</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="mt-1.5 w-full border border-white/10 bg-[#111] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
          >
            <option value="">Toutes les offres</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40">Statut Traitement</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1.5 w-full border border-white/10 bg-[#111] px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="DETECTED">Découvert</option>
            <option value="MATCHED">Correspondance trouvée</option>
            <option value="REVIEWING">À vérifier</option>
            <option value="VALIDATED">Validé RP</option>
            <option value="REJECTED">Rejeté / Archivé</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={handleRunSourcing}
            disabled={running}
            className="w-full border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/20 disabled:opacity-50"
          >
            {running ? "Collecte..." : "Sourcing Manuel"}
          </button>
        </div>
      </div>

      {runMessage && <p className="text-xs text-[#c7a15a]">{runMessage}</p>}

      {/* Candidate List Table */}
      <div className="overflow-hidden border border-white/10">
        <div className="grid grid-cols-1 border-b border-white/10 bg-[#111] px-5 py-4 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid-cols-[2fr_1.2fr_1.2fr_1fr_1.2fr]">
          <span>Profil / Intitulé</span>
          <span>Localisation</span>
          <span>Compétences</span>
          <span>Provenance</span>
          <span>Statut & Actions</span>
        </div>

        <div className="divide-y divide-white/10">
          {filteredCandidates.map((candidate) => (
            <article key={candidate.id} className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-[2fr_1.2fr_1.2fr_1fr_1.2fr] md:items-center">
              <div>
                <h4 className="text-sm font-medium text-white/90">
                  {candidate.headline || candidate.name || "Profil Découvert"}
                </h4>
                {candidate.name && (
                  <p className="mt-0.5 text-xs text-white/50">{candidate.name}</p>
                )}
                {candidate.matchingScore !== null && candidate.matchingScore !== undefined && (
                  <span className="mt-1 inline-block bg-[#c7a15a]/20 px-2 py-0.5 text-[10px] text-[#c7a15a]">
                    Score Match: {candidate.matchingScore}/100
                  </span>
                )}
              </div>

              <p className="text-xs text-white/60">{candidate.location || "Non spécifiée"}</p>

              <div>
                {candidate.skills && candidate.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.slice(0, 4).map((skill, i) => (
                      <span key={i} className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 4 && (
                      <span className="text-[10px] text-white/40">+{candidate.skills.length - 4}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-white/30">—</span>
                )}
              </div>

              <div className="text-xs">
                {candidate.sourceProfileUrl ? (
                  <a
                    href={candidate.sourceProfileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#F97316] hover:underline"
                  >
                    Voir la source
                  </a>
                ) : (
                  <span className="text-white/40">{candidate.source}</span>
                )}
                <p className="mt-1 text-[10px] text-white/25">
                  {new Date(candidate.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span
                  className={`inline-block w-fit px-2 py-0.5 text-[9px] uppercase tracking-wider ${
                    candidate.status === "VALIDATED"
                      ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : candidate.status === "REJECTED"
                      ? "border border-red-500/50 bg-red-500/10 text-red-400"
                      : candidate.status === "MATCHED"
                      ? "border border-[#c7a15a]/50 bg-[#c7a15a]/10 text-[#c7a15a]"
                      : "border border-white/20 text-white/50"
                  }`}
                >
                  {candidate.status}
                </span>

                <div className="flex gap-1.5">
                  {candidate.status !== "VALIDATED" && (
                    <button
                      type="button"
                      disabled={actionLoadingId === candidate.id}
                      onClick={() => handleCandidateAction(candidate.id, "VALIDATE")}
                      className="border border-emerald-500/40 px-2 py-1 text-[9px] uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      Valider
                    </button>
                  )}
                  {candidate.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={actionLoadingId === candidate.id}
                      onClick={() => handleCandidateAction(candidate.id, "REJECT")}
                      className="border border-red-500/40 px-2 py-1 text-[9px] uppercase tracking-wider text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          {filteredCandidates.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-white/35">
              Aucun candidat ne correspond à ces critères.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
