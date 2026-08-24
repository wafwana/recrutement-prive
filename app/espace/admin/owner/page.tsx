"use client";

import { FormEvent, useEffect, useState } from "react";

export default function OwnerProvisioningPage() {
  const [owner, setOwner] = useState<{ name: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/owner")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossible de vérifier l'Owner.");
        setOwner(data.owner);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Erreur inattendue."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Impossible de créer l'Owner.");
    } else {
      setOwner(data.owner);
      setMessage("Compte Owner créé. Vous pouvez maintenant vous déconnecter puis vous connecter avec ces identifiants.");
      event.currentTarget.reset();
    }
    setSaving(false);
  }

  return (
    <section className="mx-auto w-[min(760px,calc(100%-40px))] py-16 md:w-[min(760px,calc(100%-72px))] md:py-24">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Administration · Owner</p>
      <h1 className="mt-5 font-serif text-5xl leading-tight sm:text-6xl">Activer le compte Owner.</h1>
      <p className="mt-6 text-sm leading-7 text-white/50">Cette procédure est réservée à l'Admin actuel et ne permet de créer qu'un seul Owner. Le mot de passe est haché côté serveur et n'est jamais enregistré en clair.</p>

      {loading ? (
        <div className="mt-10 border border-white/10 p-7 text-sm text-white/40">Vérification du compte Owner…</div>
      ) : owner ? (
        <div className="mt-10 border border-[#c7a15a]/30 bg-[#111] p-7">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#c7a15a]">Owner déjà configuré</p>
          <p className="mt-4 font-serif text-2xl">{owner.name || "Owner Recrutement Privé"}</p>
          <p className="mt-2 text-sm text-white/45">{owner.email}</p>
          <p className="mt-6 text-xs leading-6 text-white/35">Aucun second Owner ne peut être créé. Utilisez la page de connexion pour accéder au cockpit.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-5 border border-white/10 p-7">
          <div>
            <label htmlFor="name" className="text-[10px] uppercase tracking-[0.2em] text-white/45">Nom</label>
            <input id="name" name="name" required minLength={2} maxLength={120} className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none focus:border-[#c7a15a]/60" placeholder="Owner Recrutement Privé" />
          </div>
          <div>
            <label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-white/45">Email Owner</label>
            <input id="email" name="email" type="email" required maxLength={320} className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none focus:border-[#c7a15a]/60" placeholder="owner@recrutement-prive.fr" />
          </div>
          <div>
            <label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] text-white/45">Mot de passe</label>
            <input id="password" name="password" type="password" required minLength={12} maxLength={200} className="mt-2 w-full border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none focus:border-[#c7a15a]/60" placeholder="12 caractères minimum" />
            <p className="mt-2 text-xs text-white/30">Choisissez un mot de passe unique d'au moins 12 caractères.</p>
          </div>
          <button disabled={saving} className="w-full border border-[#c7a15a]/50 px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] transition hover:bg-[#c7a15a] hover:text-black disabled:opacity-40">{saving ? "Création…" : "Créer le compte Owner"}</button>
        </form>
      )}

      {message && <p aria-live="polite" className="mt-5 border border-white/10 p-5 text-sm leading-6 text-white/55">{message}</p>}
    </section>
  );
}
