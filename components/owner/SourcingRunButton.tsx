"use client";

import { useState } from "react";

export default function SourcingRunButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sourcing/global-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Le sourcing n'a pas pu être lancé.");
      const results = Array.isArray(data?.results) ? data.results : [];
      const fetched = results.reduce((sum: number, item: { fetched?: number }) => sum + (item.fetched || 0), 0);
      const created = results.reduce((sum: number, item: { created?: number }) => sum + (item.created || 0), 0);
      const errors = results.filter((item: { error?: string }) => item.error).length;
      setMessage(errors ? `${fetched} offre(s) lue(s), ${created} nouvelle(s), ${errors} source(s) en erreur.` : `${fetched} offre(s) lue(s), ${created} nouvelle(s) intégrée(s).`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur pendant le sourcing.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="border border-[#F97316]/50 bg-[#F97316]/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F97316] transition hover:bg-[#F97316]/20 disabled:cursor-wait disabled:opacity-50"
      >
        {running ? "Recherche en cours…" : "Lancer une recherche maintenant"}
      </button>
      {message && <p className="max-w-xs text-right text-[10px] text-white/45">{message}</p>}
    </div>
  );
}
