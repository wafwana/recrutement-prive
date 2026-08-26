"use client";

import { FormEvent, useEffect, useState } from "react";

type Admin = { id: string; name: string | null; email: string; createdAt: string };

export default function OwnerAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/owner/admins", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Accès refusé.");
      setLoading(false);
      return;
    }
    setAdmins(data.admins || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/owner/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Impossible de créer l'Admin.");
    } else {
      setAdmins((current) => [...current, data.admin]);
      setMessage("Compte Admin créé par l'Owner.");
      event.currentTarget.reset();
    }
    setSaving(false);
  }

  return (
    <section className="mx-auto w-[min(900px,calc(100%-40px))] py-12 md:w-[min(900px,calc(100%-72px))] md:py-20">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#c7a15a]">Owner · Gouvernance</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Gestion des administrateurs.</h1>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Seul l'Owner peut créer un compte ADMIN. L'ADMIN reste un rôle délégué et ne peut pas créer ou modifier l'OWNER.</p>

      {loading ? <p className="mt-10 text-sm text-white/40">Chargement…</p> : (
        <>
          <form onSubmit={handleSubmit} className="mt-10 space-y-5 border border-white/10 bg-[#111] p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs text-white/45">Nom<input name="name" required minLength={2} maxLength={120} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45">Email<input name="email" type="email" required maxLength={320} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" /></label>
              <label className="text-xs text-white/45 md:col-span-2">Mot de passe<input name="password" type="password" required minLength={12} maxLength={200} className="mt-2 w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none" /><span className="mt-2 block text-[11px] text-white/30">12 caractères minimum.</span></label>
            </div>
            <button disabled={saving} className="w-full border border-[#c7a15a]/50 px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-[#c7a15a] disabled:opacity-40">{saving ? "Création…" : "Créer le compte ADMIN"}</button>
          </form>

          {message && <p aria-live="polite" className="mt-5 border border-white/10 p-5 text-sm text-white/60">{message}</p>}

          <section className="mt-10 border border-white/10 p-7">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c7a15a]">Administrateurs actuels</p>
            <div className="mt-6 space-y-3">
              {admins.length === 0 && <p className="text-sm text-white/35">Aucun compte ADMIN distinct n'est encore enregistré.</p>}
              {admins.map((admin) => <div key={admin.id} className="flex flex-col gap-2 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-white/80">{admin.name || admin.email}</p><p className="mt-1 text-xs text-white/35">{admin.email}</p></div><span className="text-[10px] uppercase tracking-[0.14em] text-white/35">ADMIN</span></div>)}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
