"use client";

import { useState } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CandidateCvForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("cv");

    if (!(file instanceof File) || file.size === 0) {
      setStatus("error");
      setMessage("Veuillez sélectionner votre CV.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("error");
      setMessage("Le CV ne doit pas dépasser 10 Mo.");
      return;
    }

    try {
      const response = await fetch("/api/candidats/cv", {
        method: "POST",
        body: data,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible d'envoyer votre candidature.");
      }

      setStatus("success");
      setMessage(result.message || "Votre CV a bien été reçu. Un email de confirmation vous a été envoyé.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  }

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="mx-auto mt-10 w-full max-w-3xl border border-white/10 bg-[#111] p-8 text-left">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Nom complet *
          <input name="name" required maxLength={120} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Email *
          <input name="email" type="email" required maxLength={160} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Téléphone
          <input name="phone" maxLength={40} className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/40">
          Localisation
          <input name="location" maxLength={120} placeholder="Ville" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
        </label>
      </div>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Intitulé professionnel
        <input name="headline" maxLength={160} placeholder="Ex. Responsable RH, Commercial, Ingénieur…" className="mt-2 w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none" />
      </label>

      <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-white/40">
        Votre CV *
        <input name="cv" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mt-2 block w-full border border-white/10 bg-transparent px-4 py-3 text-sm text-white file:mr-4 file:border-0 file:bg-[#c7a15a] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black" />
        <span className="mt-2 block text-[11px] normal-case tracking-normal text-white/30">PDF, DOC ou DOCX · 10 Mo maximum</span>
      </label>

      <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-white/45">
        <input name="consent" type="checkbox" value="yes" required className="mt-1" />
        <span>J'accepte que Recrutement Privé utilise mes informations et mon CV pour étudier ma candidature et me recontacter dans le cadre de son activité de recrutement. *</span>
      </label>

      <button disabled={status === "loading"} type="submit" className="mt-7 border border-[#c7a15a] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-50">
        {status === "loading" ? "Envoi en cours…" : "Déposer mon CV"}
      </button>

      {message ? (
        <p aria-live="polite" className={`mt-5 text-sm leading-6 ${status === "success" ? "text-[#c7a15a]" : "text-red-300"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
