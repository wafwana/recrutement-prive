"use client";

import { useState } from "react";

export default function SecureContactPanel({ presentationId, completed }: { presentationId: string; completed: number }) {
  const [channel, setChannel] = useState<"MESSAGING" | "VIDEO">("VIDEO");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestContact() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/contacts/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentationId, channel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de créer le contact sécurisé.");
      setMessage("Demande enregistrée. Le contact sera activé après validation du règlement et des conditions de sécurité.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer le contact.");
    } finally {
      setLoading(false);
    }
  }

  const remaining = Math.max(0, 3 - completed);

  return (
    <section className="border border-[#c7a15a]/30 bg-[#c7a15a]/[0.04] p-7 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#c7a15a]">Secure Interview Center</p>
          <h2 className="mt-3 font-serif text-3xl">Rencontrer ce profil, sans sortir de la plateforme.</h2>
          <p className="mt-4 text-sm leading-7 text-white/55">
            Chaque contact dure 30 minutes et coûte 99 € TTC. Les coordonnées personnelles restent masquées. L'entretien se déroule avec l'identité contrôlée et les protections Recrutement Privé.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-center text-xs">
          <div className="border border-white/10 bg-white/[0.03] p-4"><span className="block text-white/35">Contacts réalisés</span><strong className="mt-2 block text-2xl">{completed}/3</strong></div>
          <div className="border border-white/10 bg-white/[0.03] p-4"><span className="block text-white/35">Avant décision</span><strong className="mt-2 block text-2xl">{remaining}</strong></div>
        </div>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => setChannel("VIDEO")} className={`border p-5 text-left transition ${channel === "VIDEO" ? "border-[#c7a15a] bg-[#c7a15a]/10" : "border-white/10 bg-white/[0.02]"}`}>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#c7a15a]">Recommandé</span>
          <strong className="mt-2 block text-sm">Visioconférence sécurisée</strong>
          <span className="mt-1 block text-xs leading-5 text-white/45">Salle interne, transport relay, alias et fin contrôlée.</span>
        </button>
        <button type="button" onClick={() => setChannel("MESSAGING")} className={`border p-5 text-left transition ${channel === "MESSAGING" ? "border-[#c7a15a] bg-[#c7a15a]/10" : "border-white/10 bg-white/[0.02]"}`}>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">Alternative</span>
          <strong className="mt-2 block text-sm">Messagerie sécurisée</strong>
          <span className="mt-1 block text-xs leading-5 text-white/45">Échange interne sans partage direct de coordonnées.</span>
        </button>
      </div>

      <div className="mt-6 border border-white/10 bg-black/10 p-5 text-xs leading-6 text-white/45">
        <strong className="text-white/70">Règles de protection :</strong> aucune coordonnée personnelle ne doit être échangée ; les tentatives de contournement peuvent être bloquées et auditées ; un éventuel enregistrement ne peut démarrer qu'après consentement explicite des deux participants. Le règlement de 99 € TTC doit être confirmé avant l'ouverture effective du contact.
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/35">30 min · 82,50 € HT · 20 % TVA · 99 € TTC</p>
        <button type="button" disabled={loading} onClick={() => void requestContact()} className="border border-[#c7a15a] bg-[#c7a15a] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-[#c7a15a] disabled:opacity-50">
          {loading ? "Enregistrement…" : "Demander un contact sécurisé"}
        </button>
      </div>
      {message && <p className="mt-4 border border-white/10 p-4 text-xs text-white/65">{message}</p>}
    </section>
  );
}
