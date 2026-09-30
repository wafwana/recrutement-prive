"use client";

import { useState } from "react";

export default function BatchProcessOffersButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runBatch() {
    setRunning(true);
    setMessage(null);
    let totalAnalyzed = 0;
    let totalQualified = 0;
    let totalRejected = 0;
    let totalMatched = 0;
    let totalErrors = 0;
    let iterations = 0;
    let stalled = false;

    try {
      while (true) {
        iterations++;
        const response = await fetch("/api/owner/offres-vivier/batch-process", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ limit: 20 }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "La reprise par lot n'a pas pu être exécutée.");
        }

        const summary = data?.batchSummary;
        const processed = summary?.totalProcessed ?? 0;
        if (processed === 0) {
          break;
        }

        totalAnalyzed += processed;
        totalQualified += summary?.qualified ?? 0;
        totalRejected += summary?.rejected ?? 0;
        totalMatched += summary?.matched ?? 0;
        totalErrors += summary?.errors ?? 0;

        const remaining = summary?.remainingPendingCount ?? 0;
        const progressMade = summary?.progressMade ?? (summary?.qualified > 0 || summary?.rejected > 0);

        setMessage(
          `Traitement en cours : ${totalAnalyzed} traitée(s), ${totalQualified} qualifiée(s), ${totalRejected} rejetée(s), ${totalErrors} erreur(s)... (${remaining} en attente)`
        );

        if (!progressMade && remaining > 0) {
          stalled = true;
          setMessage(
            `Traitement interrompu : ${remaining} offre(s) restent en attente de qualification humaine ou d'une nouvelle tentative. Aucun progrès automatique supplémentaire.`
          );
          break;
        }

        if (!summary?.hasMore || remaining === 0) {
          break;
        }

        if (iterations >= 100 || totalAnalyzed >= 2000) {
          setMessage(
            `Session de traitement bornée atteinte (${totalAnalyzed} offres). Reprise disponible.`
          );
          break;
        }
      }

      if (!stalled) {
        setMessage(
          `Traitement terminé : ${totalAnalyzed} analysée(s), ${totalQualified} qualifiée(s), ${totalRejected} rejetée(s), ${totalMatched} en matching, ${totalErrors} erreur(s).`
        );
      }
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
