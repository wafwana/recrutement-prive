"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Doc = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  senderRole: string;
  senderEmail: string;
  categoryPath: string;
  status: string;
  docType: string | null;
  createdAt: string;
};

const DOCUMENT_TYPES = [
  ["CV", "CV"],
  ["DIPLOME", "Diplôme"],
  ["ATTESTATION", "Attestation"],
  ["CONTRAT", "Contrat"],
  ["PIECE_IDENTITE", "Pièce d'identité"],
  ["AUTRE", "Autre document"],
] as const;

export default function DocumentsPage() {
  const [tab, setTab] = useState<"consult" | "deposit">("consult");
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("AUTRE");
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState<{ documentName: string; date: string; time: string; reference: string } | null>(null);

  async function loadDocuments() {
    setError("");
    try {
      const response = await fetch("/api/documents/archive", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Accès refusé.");
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    }
  }

  useEffect(() => { loadDocuments(); }, []);

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Sélectionnez un document avant de valider.");
      return;
    }

    setSending(true);
    setError("");
    setConfirmation(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("docType", docType);

      const response = await fetch("/api/documents/deposit", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Le dépôt du document a échoué.");

      setConfirmation(data.confirmation);
      setFile(null);
      setDocType("AUTRE");
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le dépôt du document a échoué.");
    } finally {
      setSending(false);
    }
  }

  function cancelDeposit() {
    setFile(null);
    setDocType("AUTRE");
    setConfirmation(null);
    setError("");
    const input = document.getElementById("document-file") as HTMLInputElement | null;
    if (input) input.value = "";
    setTab("consult");
  }

  return (
    <section className="mx-auto w-[min(1100px,calc(100%-40px))] py-12 md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Documents</p>
      <h1 className="mt-3 font-serif text-4xl">Gestion documentaire</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
        Chaque document conserve sa traçabilité : type, date et heure d'introduction, expéditeur et emplacement proposé.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10">
        <button onClick={() => setTab("consult")} className={`px-4 py-3 text-[10px] uppercase tracking-[0.16em] ${tab === "consult" ? "border-b-2 border-[#c7a15a] text-[#c7a15a]" : "text-white/45"}`}>
          Consulter
        </button>
        <button onClick={() => setTab("deposit")} className={`px-4 py-3 text-[10px] uppercase tracking-[0.16em] ${tab === "deposit" ? "border-b-2 border-[#c7a15a] text-[#c7a15a]" : "text-white/45"}`}>
          Intégrer un document
        </button>
      </div>

      {error && <p className="mt-6 border border-red-400/30 p-4 text-sm text-red-300">{error}</p>}

      {tab === "deposit" ? (
        <div className="mt-8 border border-white/10 bg-[#111] p-6 md:p-8">
          <h2 className="font-serif text-2xl text-white">Intégrer un document</h2>
          <p className="mt-2 text-sm text-white/45">
            Le système enregistre automatiquement qui a introduit le document, la date, l'heure, le type et son classement.
          </p>

          <form onSubmit={submitDocument} className="mt-7 space-y-5">
            <div>
              <label htmlFor="document-file" className="mb-2 block text-xs text-white/60">Fichier</label>
              <input id="document-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white/75 file:mr-4 file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white/70" />
            </div>
            <div>
              <label htmlFor="document-type" className="mb-2 block text-xs text-white/60">Style / type de document</label>
              <select id="document-type" value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full border border-white/10 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none">
                {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={sending} className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40">
                {sending ? "Intégration…" : "Intégrer le document"}
              </button>
              <button type="button" onClick={cancelDeposit} disabled={sending} className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/55 disabled:opacity-40">
                Annuler
              </button>
            </div>
          </form>

          {confirmation ? (
            <div className="mt-7 border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm">
              <p className="text-emerald-300">Document intégré et enregistré.</p>
              <p className="mt-2 text-white/60">{confirmation.documentName}</p>
              <p className="mt-1 text-xs text-white/40">Introduit le {confirmation.date} à {confirmation.time} · Référence {confirmation.reference}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl">Consulter les documents</h2>
              <p className="mt-2 text-sm text-white/45">Documents opérationnels uniquement. Les documents financiers, comptables, contractuels et sensibles restent réservés à l'Owner.</p>
            </div>
            <button onClick={loadDocuments} className="border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-white/55">Actualiser</button>
          </div>

          <div className="mt-8 space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-white/10 bg-[#111] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-white/85">{doc.name}</p>
                    <p className="mt-1 text-xs text-[#c7a15a]">{doc.docType || "AUTRE"} · {doc.categoryPath}</p>
                    <p className="mt-1 text-xs text-white/40">Introduit par {doc.senderEmail} ({doc.senderRole})</p>
                    <p className="mt-1 text-xs text-white/30">{new Date(doc.createdAt).toLocaleString("fr-FR")} · {doc.status}</p>
                  </div>
                  <a href={"/api/documents/archive/" + doc.id} target="_blank" rel="noreferrer" className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#c7a15a]">Consulter</a>
                </div>
              </div>
            ))}
            {!documents.length && !error && <p className="text-sm text-white/40">Aucun document accessible.</p>}
          </div>
        </>
      )}
    </section>
  );
}
