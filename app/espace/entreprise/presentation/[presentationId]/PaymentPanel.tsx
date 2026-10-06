"use client";

import { useState } from "react";

export default function PaymentPanel({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function pay(method: "CARD" | "SEPA_DEBIT" | "BANK_TRANSFER") {
    setLoading(method); setMessage(null);
    try {
      const response = await fetch("/api/contacts/secure/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingId, method }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Paiement indisponible.");
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
      else setMessage("Demande de règlement par virement enregistrée. Le cabinet confirmera le paiement avant l'ouverture.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paiement indisponible.");
    } finally { setLoading(null); }
  }

  return <section className="border border-[#c7a15a]/30 bg-[#c7a15a]/[0.04] p-7">
    <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Règlement sécurisé</p>
    <h2 className="mt-3 font-serif text-3xl">99 € TTC pour 30 minutes</h2>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Le contact a été autorisé par le cabinet. Choisissez votre mode de règlement. La salle ne s'ouvre qu'après confirmation effective du paiement.</p>
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {[["CARD","Carte bancaire","Paiement immédiat"],["SEPA_DEBIT","Prélèvement SEPA","Paiement via Stripe"],["BANK_TRANSFER","Virement bancaire","Confirmation par le cabinet"]].map(([value,label,detail]) => <button key={value} disabled={!!loading} onClick={() => void pay(value as "CARD"|"SEPA_DEBIT"|"BANK_TRANSFER")} className="border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-[#c7a15a]/60 disabled:opacity-50"><strong className="block text-sm">{loading === value ? "Ouverture…" : label}</strong><span className="mt-1 block text-xs text-white/35">{detail}</span></button>)}
    </div>
    <p className="mt-5 text-xs text-white/30">82,50 € HT · TVA 20 % · 99 € TTC · EUR</p>
    {message && <p className="mt-4 border border-white/10 p-4 text-xs text-white/60">{message}</p>}
  </section>;
}
