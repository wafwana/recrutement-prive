"use client";

import { useState, useTransition } from "react";
import { applyToJob } from "./actions";

type Props = {
  jobId: string;
  title: string;
  location: string | null;
  score: number | null;
  alreadyApplied: boolean;
};

export default function CandidateJobApplication({
  jobId,
  title,
  location,
  score,
  alreadyApplied,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadyApplied);

  function submit() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await applyToJob(jobId, notes);
        setSubmitted(true);
        setMessage("Votre candidature a bien été enregistrée.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible d'enregistrer la candidature.");
      }
    });
  }

  return (
    <section className="border border-[#c7a15a]/25 bg-[#111] p-7">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Candidature</p>
      <h2 className="mt-3 font-serif text-2xl text-white">{title}</h2>
      <p className="mt-2 text-xs text-white/45">
        {location ? location : "Localisation non précisée"}
        {score !== null ? ` · Correspondance actuelle : ${score}%` : ""}
      </p>

      {submitted ? (
        <div className="mt-6 border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          {message ?? "Vous avez déjà postulé à cette offre. Le dossier est suivi dans votre espace candidat."}
        </div>
      ) : (
        <>
          <label className="mt-6 block text-[10px] uppercase tracking-[0.18em] text-white/45" htmlFor="candidate-notes">
            Message au cabinet (facultatif)
          </label>
          <textarea
            id="candidate-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            rows={4}
            className="mt-2 w-full border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#c7a15a]/50"
            placeholder="Ajoutez quelques éléments utiles à l'étude de votre candidature."
            disabled={isPending}
          />
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="mt-4 border border-[#c7a15a]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c7a15a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "ENREGISTREMENT…" : "CONFIRMER MA CANDIDATURE →"}
          </button>
          {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
          {message && <p className="mt-4 text-xs text-emerald-300">{message}</p>}
        </>
      )}
    </section>
  );
}
