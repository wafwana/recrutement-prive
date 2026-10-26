"use client";

import BackButton from "@/components/navigation/BackButton";
import { useEffect, useMemo, useState } from "react";

type Analysis = {
  error?: string;
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
  matching: { suggestedMatches?: Array<{ jobId: string; title: string; score: number }>; generatedAt?: string } | null;
  analyzedAt: string | null;
  status: string;
  createdAt: string;
};

type BulkStats = {
  total: number;
  processed: number;
  imported: number;
  duplicates: number;
  failures: number;
  skippedNonCv: number;
  preflightDuplicates: number;
};

async function computeSha256(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export default function RealCvRegistryPage() {
  const [items, setItems] = useState<Cv[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [bulkStats, setBulkStats] = useState<BulkStats | null>(null);
  const [failedDetails, setFailedDetails] = useState<string[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingAll, setProcessingAll] = useState(false);

  async function load() {
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/owner/cv-intake${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Accès refusé.");
    setItems(data.documents || []);
    setFolders(data.folders || []);
  }

  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);

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
      setMessage(
        data.candidateInviteSent
          ? `CV intégré. Invitation envoyée à ${data.document.candidateEmail || candidateEmail.trim()} ; le lien expire dans 7 jours.`
          : `CV intégré : ${data.document.name}. Aucune invitation n’a été confirmée lors de cet import. Vérifie l’adresse e-mail et utilise l’action d’invitation sur la fiche ci-dessous si le profil est lié.`
      );
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

  async function uploadSingleWithRetry(fileItem: File, maxRetries = 3): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt += 1;
      try {
        const form = new FormData();
        form.set("file", fileItem);
        form.set("bulkImport", "true");
        const response = await fetch("/api/owner/cv-intake", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          return { ok: true };
        }
        if (response.status === 409 && (data.duplicateId || data.error?.includes("déjà répertorié"))) {
          return { ok: false, duplicate: true };
        }
        if (response.status >= 400 && response.status < 500) {
          return { ok: false, error: data.error || `Erreur client (${response.status})` };
        }
        if (attempt >= maxRetries) {
          return { ok: false, error: data.error || `Échec serveur après ${maxRetries} tentatives (${response.status})` };
        }
      } catch (err) {
        if (attempt >= maxRetries) {
          return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau persistante" };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
    return { ok: false, error: "Dépassement du nombre de tentatives" };
  }

  async function processBatch(filesToProcess: File[]) {
    if (!filesToProcess.length) {
      setMessage("Sélectionne un dossier contenant les CV à intégrer.");
      return;
    }

    const supported = filesToProcess.filter((item) => /\.(pdf|doc|docx|jpe?g)$/i.test(item.name));
    const skippedCount = filesToProcess.length - supported.length;

    if (!supported.length) {
      setMessage("Aucun CV compatible trouvé. Formats acceptés : PDF, DOC, DOCX, JPG et JPEG.");
      return;
    }

    setBulkBusy(true);
    setFailedDetails([]);
    setFailedFiles([]);
    setMessage("");

    setBulkProgress(`Calcul des empreintes SHA-256 pour pré-détection des doublons (${supported.length} fichiers)…`);

    const hashesMap: Array<{ file: File; hash: string | null }> = [];
    for (const f of supported) {
      const h = await computeSha256(f);
      hashesMap.push({ file: f, hash: h });
    }

    const validHashes = hashesMap.map((hm) => hm.hash).filter((h): h is string => Boolean(h));
    let existingHashes: Record<string, { id: string; name: string }> = {};

    if (validHashes.length > 0) {
      try {
        const checkRes = await fetch("/api/owner/cv-intake/check-hashes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hashes: validHashes }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          existingHashes = checkData.existing || {};
        }
      } catch {
        console.warn("[bulk-import] hash pre-check unreachable; falling back to direct POST");
      }
    }

    const filesToUpload: File[] = [];
    let preflightDuplicates = 0;

    for (const item of hashesMap) {
      if (item.hash && existingHashes[item.hash.toLowerCase()]) {
        preflightDuplicates += 1;
      } else {
        filesToUpload.push(item.file);
      }
    }

    const stats: BulkStats = {
      total: supported.length,
      processed: preflightDuplicates,
      imported: 0,
      duplicates: preflightDuplicates,
      failures: 0,
      skippedNonCv: skippedCount,
      preflightDuplicates,
    };
    setBulkStats({ ...stats });

    const newFailures: string[] = [];
    const newFailedFilesList: File[] = [];

    for (let index = 0; index < filesToUpload.length; index += 1) {
      const current = filesToUpload[index];
      stats.processed += 1;
      setBulkProgress(
        `Traitement du fichier ${stats.processed}/${stats.total} : ${current.name} (${stats.imported} intégrés, ${stats.duplicates} doublons, ${stats.failures} échecs)`
      );
      setBulkStats({ ...stats });

      const result = await uploadSingleWithRetry(current, 3);

      if (result.ok) {
        stats.imported += 1;
      } else if (result.duplicate) {
        stats.duplicates += 1;
      } else {
        stats.failures += 1;
        newFailures.push(`${current.name} : ${result.error || "Import impossible."}`);
        newFailedFilesList.push(current);
      }
      setBulkStats({ ...stats });
    }

    setFailedDetails(newFailures);
    setFailedFiles(newFailedFilesList);

    setMessage(
      `Import du dossier terminé : ${stats.imported} CV intégré(s), ${stats.duplicates} doublon(s) ignoré(s) (dont ${stats.preflightDuplicates} détectés par empreinte sans transfert), ${stats.failures} échec(s), ${stats.skippedNonCv} fichier(s) non-CV ignoré(s). Aucun compte ni e-mail d’invitation n’a été créé par l’import en lot.`
    );

    if (newFailures.length === 0) {
      setBulkFiles([]);
      const input = document.getElementById("real-cv-folder") as HTMLInputElement | null;
      if (input) input.value = "";
    }

    setBulkBusy(false);
    setBulkProgress("");
    await load();
  }

  async function retryFailedFiles() {
    if (!failedFiles.length) return;
    await processBatch(failedFiles);
  }

  async function inviteCandidate(cv: Cv) {
    if (!cv.candidateEmail?.trim()) {
      setMessage("Aucune adresse e-mail n’est associée à ce CV. Renseigne ou corrige l’adresse avant d’inviter le candidat.");
      return;
    }
    if (!window.confirm(`Envoyer une invitation à ${cv.candidateEmail} pour valider son profil et créer son accès ?`)) return;
    setInvitingId(cv.id);
    setMessage("");
    try {
      const res = await fetch("/api/owner/cv-intake/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId: cv.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invitation impossible.");
      setMessage(`Invitation envoyée à ${cv.candidateEmail}. Le lien est valable 7 jours.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Échec de l’envoi de l’invitation.");
    } finally {
      setInvitingId(null);
    }
  }

  async function retryLocalAnalysis(cv: Cv) {
    setRetryingId(cv.id);
    setMessage("");
    try {
      const res = await fetch("/api/owner/cv-intake/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [cv.id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Relance impossible.");
      const result = data.results?.[0];
      setMessage(
        result?.status === "ANALYSE_OK"
          ? "Analyse locale terminée. Le fichier original n'a pas été modifié."
          : result?.reason || "L'extraction locale n'a pas pu analyser ce document."
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Relance impossible.");
    } finally {
      setRetryingId(null);
    }
  }

  const isCompleted = (cv: Cv) => cv.status === "ANALYSE_OK" && Boolean(cv.analyzedAt) && Boolean(cv.matching?.generatedAt) && !cv.analysis?.error;
  const activeItems = useMemo(() => items.filter((item) => !isCompleted(item)), [items]);
  const displayedItems = showCompleted ? items : activeItems;
  const visible = useMemo(() => (folder ? displayedItems.filter((item) => item.folderPath === folder) : displayedItems), [displayedItems, folder]);

  async function processSelected() {
    const ids = selectedIds.filter((id) => activeItems.some((item) => item.id === id));
    if (!ids.length) {
      setMessage("Aucun CV en attente n’est sélectionné.");
      return;
    }
    setProcessingAll(true);
    setMessage("");
    let processed = 0;
    let failed = 0;
    try {
      for (let offset = 0; offset < ids.length; offset += 20) {
        const batch = ids.slice(offset, offset + 20);
        setBulkProgress(`Traitement automatique des CV : ${Math.min(offset + batch.length, ids.length)}/${ids.length}…`);
        const response = await fetch("/api/owner/cv-intake/reprocess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch }),
        });
        const data = await response.json();
        if (!response.ok) {
          failed += batch.length;
          continue;
        }
        for (const result of data.results || []) {
          if (result.status === "ANALYSE_OK" || result.status === "SKIPPED_ALREADY_ANALYZED") processed += 1;
          else failed += 1;
        }
      }
      setSelectedIds([]);
      setMessage(`Traitement terminé : ${processed} CV traité(s) ou déjà à jour, ${failed} échec(s). Les originaux sont conservés.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le traitement collectif a échoué.");
    } finally {
      setProcessingAll(false);
      setBulkProgress("");
    }
  }

  return (
    <section className="mx-auto w-[min(1280px,calc(100%-40px))] py-12 md:py-20">
      <BackButton />
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">OWNER · CV réels</p>
      <h1 className="mt-3 font-serif text-4xl text-white">Registre des CV intégrés</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
        L'original est conservé intégralement, identifié par empreinte SHA-256 et jamais réécrit. L'analyse enrichie, le classement et le matching sont des données dérivées et révisables.
      </p>

      <div className="mt-8 border border-white/10 bg-[#111] p-6">
        <h2 className="font-serif text-2xl text-white">Intégrer un CV réel</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label htmlFor="real-cv-file" className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-white/35">Sélectionner un CV</label>
            <input
              id="real-cv-file"
              type="file"
              accept=".pdf,.doc,.docx,.jpeg,.jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full cursor-pointer border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white/70 file:mr-4 file:border-0 file:bg-[#c7a15a] file:px-4 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.14em] file:text-[#111] hover:border-[#c7a15a] focus:outline-none"
            />
            <p className="mt-2 text-[10px] text-white/30">PDF, DOC, DOCX, JPEG/JPG · fichier réel sélectionné : {file ? file.name : "aucun"}</p>
          </div>
          <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Nom du candidat (facultatif)" className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white" />
          <input value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="Email du candidat (facultatif)" className="border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white" />
          <button disabled={busy} onClick={importCv} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40">
            {busy ? "Analyse…" : "Intégrer et analyser"}
          </button>
        </div>
        {message ? <p className="mt-4 border border-white/10 px-4 py-3 text-xs text-white/60">{message}</p> : null}
      </div>

      <div className="mt-8 border border-[#c7a15a]/40 bg-[#111] p-6">
        <h2 className="font-serif text-2xl text-white">Intégrer un dossier complet du vivier</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/50">
          Sélectionne un dossier contenant plusieurs CV. Chaque fichier est validé par empreinte SHA-256, analysé et classé. Les doublons sont détectés sans transfert inutile et le lot continue en cas d'erreur individuelle.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label htmlFor="real-cv-folder" className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-white/35">Choisir le dossier de CV</label>
            <input
              id="real-cv-folder"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg"
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
              className="block w-full cursor-pointer border border-white/10 bg-[#0b0b0b] px-3 py-3 text-sm text-white/70 file:mr-4 file:border-0 file:bg-[#c7a15a] file:px-4 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.14em] file:text-[#111]"
            />
            <p className="mt-2 text-[10px] text-white/30">
              {bulkFiles.length ? `${bulkFiles.length} fichier(s) repéré(s) dans le dossier sélectionné.` : "PDF, DOC, DOCX, JPG/JPEG. Les autres fichiers seront ignorés."}
            </p>
          </div>
          <button
            disabled={bulkBusy || !bulkFiles.length}
            onClick={() => processBatch(bulkFiles)}
            className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40"
          >
            {bulkBusy ? "Traitement en cours…" : "Intégrer le dossier"}
          </button>
          {failedFiles.length > 0 && !bulkBusy ? (
            <button
              onClick={retryFailedFiles}
              className="border border-amber-500 bg-amber-500/10 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-amber-300 hover:bg-amber-500/20"
            >
              Relancer les {failedFiles.length} échec(s)
            </button>
          ) : null}
        </div>

        {bulkStats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
            <div className="border border-white/10 bg-[#0a0a0a] p-3 text-center">
              <span className="block text-[9px] uppercase text-white/40">Total CV</span>
              <span className="text-base font-bold text-white">{bulkStats.total}</span>
            </div>
            <div className="border border-white/10 bg-[#0a0a0a] p-3 text-center">
              <span className="block text-[9px] uppercase text-emerald-400">Intégrés</span>
              <span className="text-base font-bold text-emerald-400">{bulkStats.imported}</span>
            </div>
            <div className="border border-white/10 bg-[#0a0a0a] p-3 text-center">
              <span className="block text-[9px] uppercase text-amber-400">Doublons ignorés</span>
              <span className="text-base font-bold text-amber-400">{bulkStats.duplicates}</span>
            </div>
            <div className="border border-white/10 bg-[#0a0a0a] p-3 text-center">
              <span className="block text-[9px] uppercase text-rose-400">Échecs</span>
              <span className="text-base font-bold text-rose-400">{bulkStats.failures}</span>
            </div>
            <div className="border border-white/10 bg-[#0a0a0a] p-3 text-center">
              <span className="block text-[9px] uppercase text-white/40">Non-CV ignorés</span>
              <span className="text-base font-bold text-white/60">{bulkStats.skippedNonCv}</span>
            </div>
          </div>
        ) : null}

        {bulkProgress ? <p role="status" className="mt-4 border border-white/10 px-4 py-3 text-xs text-[#c7a15a]">{bulkProgress}</p> : null}

        {failedDetails.length > 0 ? (
          <div className="mt-4 border border-rose-500/30 bg-rose-500/5 p-4">
            <p className="text-xs font-semibold text-rose-300">Détails des échecs ({failedDetails.length}) :</p>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[11px] text-rose-200/80">
              {failedDetails.map((detail, idx) => (
                <li key={idx} className="font-mono">{detail}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button disabled={processingAll || !activeItems.length} onClick={() => setSelectedIds(activeItems.map((item) => item.id))} className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-white/70 disabled:opacity-40">
          Sélectionner les CV en attente ({activeItems.length})
        </button>
        <button disabled={processingAll || !selectedIds.length} onClick={processSelected} className="border border-[#c7a15a] px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-[#c7a15a] disabled:opacity-40">
          {processingAll ? "Traitement…" : `Traiter les CV sélectionnés (${selectedIds.length})`}
        </button>
        <button disabled={processingAll} onClick={() => setShowCompleted((value) => !value)} className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-white/70">
          {showCompleted ? "Masquer les CV finalisés" : "Afficher l’historique des CV finalisés"}
        </button>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_320px_auto]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Rechercher un CV, candidat ou dossier…" className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none" />
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none">
          <option value="">Tous les dossiers ({displayedItems.length})</option>
          {folders.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={() => load().catch((e) => setMessage(e.message))} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/60">Actualiser</button>
      </div>

      <div className="mt-8 space-y-4">
        {visible.map((cv) => (
          <article key={cv.id} className="border border-white/10 bg-[#111] p-6">
            {!isCompleted(cv) ? (
              <label className="mb-4 flex items-center gap-2 text-xs text-white/55">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(cv.id)}
                  onChange={(event) =>
                    setSelectedIds((current) =>
                      event.target.checked ? [...new Set([...current, cv.id])] : current.filter((id) => id !== cv.id)
                    )
                  }
                />{" "}
                Sélectionner pour traitement collectif
              </label>
            ) : (
              <p className="mb-4 text-[10px] uppercase tracking-[0.12em] text-emerald-300">Traitement finalisé · conservé dans l’historique</p>
            )}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-medium text-white">{cv.name}</h2>
                  <span className="bg-emerald-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-emerald-300">Original verrouillé</span>
                  <span className="bg-white/5 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/50">{cv.status}</span>
                </div>
                <p className="mt-2 text-xs font-mono text-[#c7a15a]">{cv.folderPath}</p>
                <p className="mt-2 text-xs text-white/35">
                  Introduit par {cv.senderEmail} ({cv.senderRole}) · {new Date(cv.createdAt).toLocaleString("fr-FR")}
                </p>
                <p className="mt-1 text-[10px] text-white/25">SHA-256 : {cv.originalSha256}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cv.candidateEmail ? (
                  <button
                    disabled={invitingId === cv.id}
                    onClick={() => inviteCandidate(cv)}
                    className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a] disabled:opacity-40"
                  >
                    {invitingId === cv.id ? "Envoi…" : "Inviter candidat"}
                  </button>
                ) : null}
                {cv.status !== "ANALYSE_OK" || cv.analysis?.error ? (
                  <button disabled={retryingId === cv.id} onClick={() => retryLocalAnalysis(cv)} className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a] disabled:opacity-40">
                    {retryingId === cv.id ? "Analyse locale…" : "Relancer analyse locale"}
                  </button>
                ) : null}
                <a href={`/api/owner/cv-intake/${cv.id}/original`} target="_blank" rel="noreferrer" className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/65">
                  Original ↗
                </a>
              </div>
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
                  <p className="mt-2 text-xs text-white/65">
                    {(cv.matching?.suggestedMatches || cv.analysis.suggestedMatches || []).slice(0, 5).map((m) => `${m.title} (${m.score}/100)`).join(" · ") ||
                      "Aucune offre ouverte correspondante actuellement."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-white/40">Analyse non disponible : le CV reste conservé et classé en attente.</p>
            )}
          </article>
        ))}
        {!visible.length ? <p className="border border-white/10 p-6 text-sm text-white/40">Aucun CV dans cette vue.</p> : null}
      </div>
    </section>
  );
}
