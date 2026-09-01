"use client";

import { useState, type FormEvent } from "react";
import { updateCompanyJob } from "../../actions";

type JobData = {
  id: string;
  companyId: string;
  title: string;
  location: string | null;
  description: string | null;
  missionType: string | null;
  requiredSkills: string[] | unknown;
  requiredExperienceYears: number | null;
  status: string;
};

export default function MissionEditForm({ job }: { job: JobData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const skillsString = Array.isArray(job.requiredSkills)
    ? job.requiredSkills.join(", ")
    : typeof job.requiredSkills === "string"
    ? job.requiredSkills
    : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      const formData = new FormData(event.currentTarget);
      await updateCompanyJob(formData);
      setMessage("Mission mise à jour.");
      setIsOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de modifier la mission.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition"
        >
          Modifier la mission
        </button>
        {message && <span className="text-xs text-[#c7a15a]">{message}</span>}
      </div>
    );
  }

  return (
    <div className="mt-6 border border-[#c7a15a]/30 bg-[#111] p-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Modifier la mission</p>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-white/40 hover:text-white"
        >
          ✕ Fermer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="companyId" value={job.companyId} />
        <input type="hidden" name="jobId" value={job.id} />

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Titre</label>
          <input
            name="title"
            required
            defaultValue={job.title}
            className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs outline-none text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Localisation</label>
          <input
            name="location"
            defaultValue={job.location ?? ""}
            className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs outline-none text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Type de contrat</label>
          <select
            name="missionType"
            defaultValue={job.missionType ?? "CDI"}
            className="w-full border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none text-white"
          >
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Freelance">Freelance</option>
            <option value="Management de Transition">Management de Transition</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Statut de la mission</label>
          <select
            name="status"
            defaultValue={job.status}
            className="w-full border border-white/10 bg-[#111] px-3 py-2 text-xs outline-none text-white"
          >
            <option value="OPEN">OPEN (Publiée)</option>
            <option value="PAUSED">PAUSED (En pause)</option>
            <option value="CLOSED">CLOSED (Clôturée)</option>
            <option value="DRAFT">DRAFT (Brouillon)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Expérience requise (années)</label>
          <input
            name="requiredExperienceYears"
            type="number"
            min="0"
            max="60"
            defaultValue={job.requiredExperienceYears ?? ""}
            className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs outline-none text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Compétences clés</label>
          <input
            name="requiredSkills"
            defaultValue={skillsString}
            placeholder="Compétences séparées par des virgules"
            className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs outline-none text-white"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-white/40">Description & Brief</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={job.description ?? ""}
            className="w-full border border-white/10 bg-transparent px-3 py-2 text-xs outline-none text-white"
          />
        </div>

        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 hover:text-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="border border-[#c7a15a] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] hover:bg-[#c7a15a] hover:text-black transition disabled:opacity-50"
          >
            {isUpdating ? "Enregistrement..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
}
