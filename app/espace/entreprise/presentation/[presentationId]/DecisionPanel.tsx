"use client";

import { useState } from "react";

export default function DecisionPanel({ meetingId }: { meetingId: string }) {
  const [decision, setDecision] = useState("CONTINUE");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<string | null>(null);

  async function submit() {
    setState(null);
    const response = await fetch("/api/contacts/secure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decision", meetingId, decisionStatus: decision, decisionNotes: notes }),
    });
    const data = await response.json().catch(() => ({}));
    setState(response.ok ? "Décision enregistrée dans le dossier de mission." : (data.error || "Impossible d'enregistrer la décision."));
  }

  return <section className="border border-[#c7a15a]/40 bg-[#c7a15a]/[0.05] p-7">
    <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Decision Gate</p>
    <h2 className="mt-3 font-serif text-3xl">Trois contacts réalisés : votre positionnement est requis.</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">Le cabinet vous demande maintenant de qualifier la suite du dossier. Cette décision est conservée dans l'historique de mission.</p>
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {[[ "RECRUIT", "Poursuivre vers recrutement" ], [ "CONTINUE", "Poursuivre les échanges" ], [ "CLOSE", "Clôturer le dossier" ]].map(([value,label]) => <button key={value} type="button" onClick={() => setDecision(value)} className={`border p-4 text-left text-xs transition ${decision === value ? "border-[#c7a15a] bg-[#c7a15a]/10 text-white" : "border-white/10 text-white/50"}`}>{label}</button>)}
    </div>
    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder="Commentaire de décision (facultatif)" className="mt-4 w-full border border-white/10 bg-black/10 p-4 text-xs text-white outline-none placeholder:text-white/25" />
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-white/35">{state || "Cette action est auditée."}</span><button type="button" onClick={() => void submit()} className="border border-[#c7a15a] bg-[#c7a15a] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black">Enregistrer le positionnement</button></div>
  </section>;
}
