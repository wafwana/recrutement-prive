"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IntegrateExternalOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function integrate() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/owner/offres-vivier/" + encodeURIComponent(offerId) + "/integrate", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Intégration impossible.");
      setMessage(data.alreadyIntegrated ? "Cette offre possède déjà son brouillon interne." : "Brouillon interne créé. Il reste privé et non publié.");
      router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Erreur pendant l’intégration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 border border-[#c7a15a]/30 bg-[#c7a15a]/5 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[#c7a15a]">Intégration interne — validation Owner</p>
      <p className="mt-2 text-sm leading-6 text-white/70">Créer un brouillon Job RP lié à cette offre. L’entreprise source restera suspendue et le poste restera en DRAFT : aucune publication, candidature, sollicitation ou mise en relation ne sera déclenchée.</p>
      <button type="button" onClick={integrate} disabled={loading} className="mt-4 border border-[#c7a15a] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40">
        {loading ? "Intégration en cours…" : "Créer un brouillon interne"}
      </button>
      {message ? <p role="status" className={"mt-3 text-xs " + (error ? "text-rose-300" : "text-emerald-300")}>{message}</p> : null}
    </div>
  );
}