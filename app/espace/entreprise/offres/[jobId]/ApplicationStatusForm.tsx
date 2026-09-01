"use client";

import { useState, type FormEvent } from "react";
import { updateApplicationStatus } from "../../actions";

const statusLabels: Record<string, string> = {
  SUBMITTED: "Soumise",
  REVIEWING: "En étude",
  INTERVIEW: "Entretien",
  SHORTLISTED: "Présélectionné",
  REJECTED: "Non retenu",
  HIRED: "Recruté",
};

export default function ApplicationStatusForm({
  applicationId,
  currentStatus,
  currentNotes,
}: {
  applicationId: string;
  currentStatus: string;
  currentNotes?: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      await updateApplicationStatus(applicationId, status, notes);
      setMessage("Statut mis à jour.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lors de la mise à jour.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-white/10 pt-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-[10px] uppercase tracking-[0.16em] text-white/40">Statut recrutement :</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-white/10 bg-[#111] px-3 py-1.5 text-xs text-white outline-none"
        >
          {Object.entries(statusLabels).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes de suivi (ex: Entretien planifié le...)"
          className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs text-white outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isUpdating}
          className="border border-[#c7a15a] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition disabled:opacity-50"
        >
          {isUpdating ? "Mise à jour..." : "Enregistrer le suivi"}
        </button>
        {message && <span className="text-xs text-[#c7a15a]">{message}</span>}
      </div>
    </form>
  );
}
