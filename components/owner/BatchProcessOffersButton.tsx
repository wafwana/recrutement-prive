"use client";

import { useState } from "react";

export default function BatchProcessOffersButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBatch() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/owner/offres-vivier/batch-process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "La reprise par lot n'a pas pu être exécutée.");
      }
      const summary = data?.batchSummary;
      const processed = summary?.totalProcessed ?? 0;
      const qualified = summary?.qualified ?? 0;
      const matched = summary?.matched ?? 0;
      const errors = summary?.errors ?? 0;
      setMessage(
        `Lot traité : ${processed} offre(s) analysée(s), ${qualified} qualifiée(s), ${matched} en matching, ${errors} erreur(s).`
      );
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur pendant le traitement du lot.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={runBatch}
        disabled={running}
        className="border border-[#c7a15a] bg-[#c7a15a]/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c7a15a] transition hover:bg-[#c7a15a]/20 disabled:cursor-wait disabled:opacity-50"
      >
        {running ? "Qualification & matching en cours…" : "Lancer la qualification du stock"}
      </button>
      {message && <p className="max-w-xs text-right text-[10px] text-white/50">{message}</p>}
    </div>
  );
}
