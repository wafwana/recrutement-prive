"use client";

import { useState } from "react";

const DOCUMENT_TYPES = [
  ["CV", "CV / Curriculum vitae"],
  ["LETTRE_MOTIVATION", "Lettre de motivation"],
  ["DIPLOME", "Diplôme"],
  ["CERTIFICATION", "Certification"],
  ["PORTFOLIO", "Portfolio"],
  ["IDENTITE", "Pièce d'identité"],
  ["AUTRE", "Autre document"],
] as const;

export default function DocumentDepositPanel() {
  const [docType, setDocType] = useState("AUTRE");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/documents/deposit", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Le document n'a pas pu être intégré.");
      setMessage(
        data.confirmation
          ? `Document intégré : ${data.confirmation.documentName} · ${data.confirmation.date} à ${data.confirmation.time} · Réf. ${data.confirmation.reference}`
          : "Document intégré avec succès.",
      );
      const form = document.getElementById("document-deposit-form") as HTMLFormElement | null;
      form?.reset();
      setDocType("AUTRE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'intégration du document.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      id="document-deposit-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="border border-white/10 bg-[#111] p-6 md:p-8"
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Intégrer un document</p>
      <h2 className="mt-2 font-serif text-2xl">Nouveau document</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
        Le fichier est contrôlé puis enregistré avec son type, la date et l'heure d'intégration, ainsi que l'identité du déposant. Ces informations sont conservées dans la traçabilité documentaire.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-xs text-white/65">
          Style / type de document
          <select
            name="docType"
            value={docType}
            onChange={(event) => setDocType(event.target.value)}
            className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
          >
            {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="text-xs text-white/65">
          Fichier
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-xs text-white/70 file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
          />
        </label>
      </div>

      {error ? <p aria-live="polite" className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-300">{error}</p> : null}
      {message ? <p aria-live="polite" className="mt-4 border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-300">{message}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#c7a15a] disabled:opacity-50"
        >
          {pending ? "Intégration…" : "Intégrer le document"}
        </button>
        <button
          type="reset"
          onClick={() => { setDocType("AUTRE"); setMessage(""); setError(""); }}
          disabled={pending}
          className="border border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/60 disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
