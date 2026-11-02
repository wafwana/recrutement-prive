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

function displaySourceUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/(token|key|secret|auth|signature|password|credential|api[_-]?key)/i.test(key)) {
        url.searchParams.set(key, "[masqué]");
      }
    }
    return url.toString();
  } catch {
    return "URL de source à vérifier";
  }
}

export default function CandidateSourcingClient({
  initialCandidates,
  activeSourcesCount,
  candidateSources,
  jobs,
  lastAudit,
  sourcesEditable,
}: {
  initialCandidates: SourcedCandidateItem[];
  activeSourcesCount: number;
  candidateSources: string[];
  jobs: JobOption[];
  lastAudit: AuditSummary;
  sourcesEditable: boolean;
}) {
  const [candidates, setCandidates] = useState<SourcedCandidateItem[]>(initialCandidates);
  const [query, setQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCandidateForDetail, setSelectedCandidateForDetail] = useState<SourcedCandidateItem | null>(null);

  const [sourcesList, setSourcesList] = useState<string[]>(candidateSources);
  const [newSourceInput, setNewSourceInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  async function handleAddSource() {
    if (!newSourceInput.trim() || !/^https:\/\//i.test(newSourceInput.trim())) {
      setConfigMessage("Veuillez saisir une URL HTTPS valide (commençant par https://).");
      return;
    }
    const updated = [...sourcesList, newSourceInput.trim()];
    await saveSourcesConfig(updated);
  }

  async function handleRemoveSource(index: number) {
    const updated = sourcesList.filter((_, i) => i !== index);
    await saveSourcesConfig(updated);
  }

  async function saveSourcesConfig(nextSources: string[]) {
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch("/api/owner/sourcing/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources: nextSources }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement de la configuration.");
      setSourcesList(data.sources || []);
      setNewSourceInput("");
      setConfigMessage("Configuration des sources sauvegardée avec succès.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setConfigMessage(err instanceof Error ? err.message : "Erreur de configuration.");
    } finally {
      setSavingConfig(false);
    }
  }

  const [runStatusType, setRunStatusType] = useState<"success" | "error" | "info" | null>(null);

  async function handleRunSourcing() {
    if (running) return;
    setRunning(true);
    setRunMessage("Lancement de la collecte en cours...");
    setRunStatusType("info");
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
      if (!res.ok) {
        throw new Error(data?.error || `Erreur serveur (${res.status}) lors du sourcing candidats.`);
      }

      if (data.ok === false) {
        setRunMessage(data.message || "Aucune source active disponible.");
        setRunStatusType("error");
      } else {
        const msg = `${data.fetched || 0} candidat(s) extrait(s), ${data.created || 0} nouveau(x), ${data.matched || 0} correspondu(s).`;
        setRunMessage(msg);
        setRunStatusType("success");
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setRunMessage(err instanceof Error ? err.message : "Erreur réseau pendant le sourcing.");
      setRunStatusType("error");
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
      {/* Sources management box */}
      <div className="border border-white/10 bg-[#111] p-5 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Gestion des sources candidats HTTPS</h3>
            <p className="text-xs text-white/50">
              {sourcesEditable
                ? "Configurez les URLs HTTPS de sources candidats autorisées. Une configuration enregistrée est utilisée par le moteur de sourcing."
                : "Les sources effectives sont définies par l’environnement serveur. Leur édition est désactivée ici pour éviter un enregistrement sans effet."}
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#c7a15a]">
            {sourcesEditable ? `${sourcesList.length} source(s) configurée(s)` : "Configuration serveur"}
          </span>
        </div>

        {sourcesEditable ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="candidate-source-url" className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-white/45">Nouvelle URL de source candidats (HTTPS)</label>
              <input
                id="candidate-source-url"
                type="url"
                value={newSourceInput}
                onChange={(e) => setNewSourceInput(e.target.value)}
                placeholder="https://votre-source-candidats.com/api/candidates"
                aria-describedby="candidate-source-help"
                className="w-full border border-white/15 bg-transparent px-3 py-2 text-xs text-white outline-none focus:border-[#c7a15a]"
              />
              <p id="candidate-source-help" className="mt-1 text-[10px] text-white/35">Les hôtes privés et les URL non HTTPS seront refusés.</p>
            </div>
            <button
              type="button"
              onClick={handleAddSource}
              disabled={savingConfig}
              className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a]/20 disabled:opacity-50"
            >
              {savingConfig ? "Enregistrement..." : "Ajouter la source"}
            </button>
          </div>
        ) : (
          <p role="note" className="border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/55">
            Pour modifier les sources actives, mettez à jour <code className="text-[#c7a15a]">RP_GLOBAL_CANDIDATE_SOURCES</code> dans la configuration Vercel du projet. Les changements ne sont pas enregistrés en base tant que l’environnement pilote la liste.
          </p>
        )}

        {configMessage && <p role="status" aria-live="polite" className="text-xs text-[#c7a15a]">{configMessage}</p>}

        {sourcesList.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            {sourcesList.map((src, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 border border-white/5 bg-black/30 px-3 py-2 text-xs text-white/80">
                <span className="min-w-0 truncate pr-2 font-mono text-[11px]" title={displaySourceUrl(src)}>{displaySourceUrl(src)}</span>
                {sourcesEditable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(idx)}
                    disabled={savingConfig}
                    aria-label={`Supprimer la source ${displaySourceUrl(src)}`}
                    className="shrink-0 text-[10px] text-red-400 hover:underline uppercase tracking-wider disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration status banner */}
      {sourcesList.length === 0 ? (
        <div className="border border-[#F97316]/40 bg-[#F97316]/10 p-5 text-sm text-white/80">
          <div className="flex items-start gap-3">
            <span className="text-xl text-[#F97316]">⚠️</span>
            <div>
              <h3 className="font-medium text-[#F97316]">Aucune source candidats active</h3>
              <p className="mt-1 text-xs text-white/60 leading-relaxed">
                Ajoutez une URL de source HTTPS ci-dessus ou configurez la variable d&apos;environnement{" "}
                <code className="bg-black/40 px-1.5 py-0.5 text-[#c7a15a]">RP_GLOBAL_CANDIDATE_SOURCES</code>.
                Conforme au RGPD : aucun profil fictif ou simulé n&apos;est créé.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-[#c7a15a]/30 bg-[#111] p-4 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong className="text-white">{sourcesList.length}</strong> source(s) candidats active(s) configurée(s)
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
            data-testid="btn-sourcing-manuel"
            onClick={handleRunSourcing}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 border border-[#c7a15a] bg-[#c7a15a]/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c7a15a] transition hover:bg-[#c7a15a]/25 disabled:cursor-wait disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#c7a15a] border-t-transparent" />
                <span>Collecte en cours…</span>
              </>
            ) : (
              <span>Sourcing Manuel</span>
            )}
          </button>
        </div>
      </div>

      {runMessage && (
        <div
          data-testid="sourcing-run-feedback"
          className={`rounded border px-4 py-3 text-xs transition-all ${
            runStatusType === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : runStatusType === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-[#c7a15a]/40 bg-[#c7a15a]/10 text-[#c7a15a]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{runMessage}</span>
            <button
              type="button"
              onClick={() => setRunMessage(null)}
              className="text-white/40 hover:text-white"
              aria-label="Fermer l'alerte"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
                <button
                  type="button"
                  onClick={() => setSelectedCandidateForDetail(candidate)}
                  className="group text-left"
                  title="Cliquer pour afficher la fiche détaillée du profil"
                >
                  <h4 className="text-sm font-medium text-white/90 transition group-hover:text-[#c7a15a] group-hover:underline">
                    {candidate.headline || candidate.name || "Profil Découvert"}
                  </h4>
                  {candidate.name && (
                    <p className="mt-0.5 text-xs text-white/50">{candidate.name}</p>
                  )}
                </button>
                {candidate.matchingScore !== null && candidate.matchingScore !== undefined && (
                  <div>
                    <span className="mt-1 inline-block bg-[#c7a15a]/20 px-2 py-0.5 text-[10px] text-[#c7a15a]">
                      Score Match: {candidate.matchingScore}/100
                    </span>
                  </div>
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

      {/* Modal Fiche Détaillée Profil Candidat Détecté */}
      {selectedCandidateForDetail && (
        <div
          data-testid="modal-detail-candidat"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-white/15 bg-[#111] p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c7a15a]">
                  Fiche Profil Détecté · Sourcing RP
                </p>
                <h3 className="mt-1 text-xl font-medium text-white">
                  {selectedCandidateForDetail.headline || selectedCandidateForDetail.name || "Intitulé non renseigné"}
                </h3>
                {selectedCandidateForDetail.name && (
                  <p className="text-sm text-white/50">{selectedCandidateForDetail.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidateForDetail(null)}
                className="border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                Fermer ✕
              </button>
            </div>

            <div className="mt-6 space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4 border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Statut de Traitement</span>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        selectedCandidateForDetail.status === "VALIDATED"
                          ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : selectedCandidateForDetail.status === "REJECTED"
                          ? "border border-red-500/50 bg-red-500/10 text-red-400"
                          : selectedCandidateForDetail.status === "MATCHED"
                          ? "border border-[#c7a15a]/50 bg-[#c7a15a]/10 text-[#c7a15a]"
                          : "border border-white/20 text-white/50"
                      }`}
                    >
                      {selectedCandidateForDetail.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Score de Matching</span>
                  <p className="mt-1 font-mono text-sm text-[#c7a15a]">
                    {selectedCandidateForDetail.matchingScore !== null && selectedCandidateForDetail.matchingScore !== undefined
                      ? `${selectedCandidateForDetail.matchingScore} / 100`
                      : "Non calculé (aucune offre cible associée)"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Localisation</span>
                  <p className="mt-1 text-white/80">{selectedCandidateForDetail.location || "Non spécifiée"}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Expérience Détectée</span>
                  <p className="mt-1 text-white/80">
                    {selectedCandidateForDetail.experienceYears !== null && selectedCandidateForDetail.experienceYears !== undefined
                      ? `${selectedCandidateForDetail.experienceYears} an(s)`
                      : "Non renseigné"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Provenance de la source</span>
                  <p className="mt-1 text-white/80">
                    {selectedCandidateForDetail.source === "PLATFORM_CVTHEQUE"
                      ? "CVthèque interne (Recrutement Privé)"
                      : selectedCandidateForDetail.source}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Date de détection</span>
                  <p className="mt-1 text-white/80">
                    {new Date(selectedCandidateForDetail.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40">Compétences Détectées</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedCandidateForDetail.skills && selectedCandidateForDetail.skills.length > 0 ? (
                    selectedCandidateForDetail.skills.map((skill, i) => (
                      <span key={i} className="border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-white/40">Aucune compétence isolée identifiée.</span>
                  )}
                </div>
              </div>

              {selectedCandidateForDetail.notes && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Notes & Diagnostics</span>
                  <p className="mt-1 whitespace-pre-wrap border border-white/5 bg-black/40 p-3 font-mono text-[11px] text-white/70">
                    {selectedCandidateForDetail.notes}
                  </p>
                </div>
              )}

              {selectedCandidateForDetail.sourceProfileUrl && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Lien Public Source</span>
                  <div className="mt-1">
                    <a
                      href={selectedCandidateForDetail.sourceProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#F97316] underline hover:text-[#ea580c]"
                    >
                      {selectedCandidateForDetail.sourceProfileUrl}
                    </a>
                  </div>
                </div>
              )}

              <div className="rounded border border-[#c7a15a]/20 bg-[#c7a15a]/5 p-3 text-[11px] leading-relaxed text-white/60">
                <strong className="text-[#c7a15a]">🔒 Confidentialité & Validation Humaine :</strong> Les profils découverts ne sont jamais contactés automatiquement. La validation ou le rejet modifie le statut interne dans le vivier sans diffusion de données privées.
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-white/10 pt-4">
              <div className="flex gap-2">
                {selectedCandidateForDetail.status !== "VALIDATED" && (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedCandidateForDetail.id}
                    onClick={async () => {
                      await handleCandidateAction(selectedCandidateForDetail.id, "VALIDATE");
                      setSelectedCandidateForDetail((prev) => prev ? { ...prev, status: "VALIDATED" } : null);
                    }}
                    className="border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-[10px] uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Valider le profil
                  </button>
                )}
                {selectedCandidateForDetail.status !== "REJECTED" && (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedCandidateForDetail.id}
                    onClick={async () => {
                      await handleCandidateAction(selectedCandidateForDetail.id, "REJECT");
                      setSelectedCandidateForDetail((prev) => prev ? { ...prev, status: "REJECTED" } : null);
                    }}
                    className="border border-red-500/50 bg-red-500/10 px-4 py-2 text-[10px] uppercase tracking-wider text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Rejeter / Archiver
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidateForDetail(null)}
                className="border border-white/10 px-4 py-2 text-[10px] uppercase tracking-wider text-white/60 hover:bg-white/10 hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
