"use client";

import { useState } from "react";

const CONTRACT_KEYS = ["ENTREPRISE_CONTACT","INTERVIEW_SECURE","ANTI_CIRCUMVENTION","SECURE_CHANNEL_POLICY"] as const;

export default function PaymentPanel({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [acceptedServer, setAcceptedServer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function acceptTerms() {
    setLoading("terms"); setMessage(null);
    try {
      const response = await fetch("/api/contacts/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_terms", meetingId, contractKeys: CONTRACT_KEYS }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer l'acceptation.");
      setAcceptedServer(true);
      setMessage("Conditions enregistrées. Vous pouvez maintenant choisir le règlement.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer l'acceptation.");
    } finally { setLoading(null); }
  }

  async function pay(method: "CARD" | "SEPA_DEBIT" | "BANK_TRANSFER") {
    if (!acceptedServer) {
      setMessage("Acceptez d'abord les conditions contractuelles.");
      return;
    }
    setLoading(method); setMessage(null);
    try {
      const response = await fetch("/api/contacts/secure/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, method }),
      });
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
    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Le contact a été autorisé par le cabinet. Le règlement et l'acceptation des conditions contractuelles sont requis avant l'ouverture effective du contact.</p>

    <div className="mt-6 border border-white/10 bg-black/10 p-5">
      <p className="text-xs font-semibold text-white/75">Conditions contractuelles</p>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-white/45">
        <li>• Conditions du contact sécurisé — entreprise</li>
        <li>• Convention d'entretien sécurisé</li>
        <li>• Confidentialité et interdiction de contournement</li>
        <li>• Politique messagerie et visioconférence sécurisées</li>
      </ul>
      <label className="mt-4 flex items-start gap-3 text-xs text-white/60">
        <input type="checkbox" checked={accepted} disabled={acceptedServer} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5" />
        <span>Je reconnais avoir lu et accepter les conditions applicables à ce contact.</span>
      </label>
      <button type="button" disabled={!accepted || acceptedServer || loading === "terms"} onClick={() => void acceptTerms()} className="mt-4 border border-[#c7a15a] px-5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#c7a15a] disabled:opacity-40">
        {loading === "terms" ? "Enregistrement…" : acceptedServer ? "Conditions acceptées" : "Accepter les conditions"}
      </button>
    </div>

    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {[["CARD","Carte bancaire","Paiement immédiat"],["SEPA_DEBIT","Prélèvement SEPA","Paiement via Stripe"],["BANK_TRANSFER","Virement bancaire","Confirmation par le cabinet"]].map(([value,label,detail]) => <button key={value} disabled={!acceptedServer || !!loading} onClick={() => void pay(value as "CARD"|"SEPA_DEBIT"|"BANK_TRANSFER")} className="border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-[#c7a15a]/60 disabled:opacity-50"><strong className="block text-sm">{loading === value ? "Ouverture…" : label}</strong><span className="mt-1 block text-xs text-white/35">{detail}</span></button>)}
    </div>
    <p className="mt-5 text-xs text-white/30">82,50 € HT · TVA 20 % · 99 € TTC · EUR</p>
    {message && <p className="mt-4 border border-white/10 p-4 text-xs text-white/60">{message}</p>}
  </section>;
}
