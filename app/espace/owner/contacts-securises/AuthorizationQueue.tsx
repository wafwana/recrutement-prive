"use client";

import { useState } from "react";

export default function AuthorizationQueue({ meetings }: { meetings: { id: string; alias: string | null; channel: string; createdAt: string }[] }) {
  const [items, setItems] = useState(meetings);
  const [busy, setBusy] = useState<string | null>(null);

  async function authorize(meetingId: string, approve: boolean) {
    setBusy(meetingId);
    try {
      const response = await fetch("/api/contacts/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "authorize", meetingId, approve }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Action impossible.");
      }
      setItems(current => current.filter(item => item.id !== meetingId));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-7">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Autorisation du cabinet</p>
    <h2 className="mt-2 text-2xl font-semibold">Contacts en attente de validation</h2>
    <p className="mt-3 text-sm leading-6 text-slate-400">L'entreprise peut demander un contact, mais aucun échange n'est ouvert tant que l'OWNER — ou un ADMIN explicitement délégué — n'a pas autorisé la rencontre.</p>
    <div className="mt-6 space-y-3">
      {items.length === 0 ? <p className="border border-white/10 p-4 text-sm text-slate-500">Aucune demande en attente.</p> : items.map(item => <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/10 p-5 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-medium text-slate-200">{item.alias || "Profil Executive anonymisé"}</p><p className="mt-1 text-xs text-slate-500">{item.channel === "VIDEO" ? "Visioconférence" : "Messagerie"} · {new Date(item.createdAt).toLocaleString("fr-FR")}</p></div><div className="flex gap-2"><button disabled={busy === item.id} onClick={() => void authorize(item.id, false)} className="border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-slate-400 disabled:opacity-40">Refuser</button><button disabled={busy === item.id} onClick={() => void authorize(item.id, true)} className="border border-orange-400 bg-orange-400 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-black disabled:opacity-40">Autoriser</button></div></div>)}
    </div>
  </section>;
}
